# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置构建时的环境变量（从 Docker 构建参数传入）
ARG ADMIN_USERNAME=admin
ARG ADMIN_PASSWORD=admin123
ENV ADMIN_USERNAME=${ADMIN_USERNAME}
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}

# 构建前端
RUN npm run build

# 构建后端
RUN npm run build:server

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 复制前端构建产物
COPY --from=builder /app/dist ./dist

# 复制后端构建产物
COPY --from=builder /app/dist/server ./dist/server

# 复制 package.json 和 node_modules（生产依赖）
COPY --from=builder /app/package*.json ./
RUN npm ci --production

# 暴露端口
EXPOSE 9390

# 启动后端服务
CMD ["node", "dist/server/index.js"]

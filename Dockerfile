# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 构建后端
RUN npm run build:server

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 标记为 Docker 容器环境
ENV DOCKER_CONTAINER=true

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

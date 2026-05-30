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

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 安装 serve 用于提供静态文件
RUN npm install -g serve

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 9390

# 启动服务
CMD ["serve", "-s", "dist", "-l", "9390"]

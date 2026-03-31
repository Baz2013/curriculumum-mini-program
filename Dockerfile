# 多阶段构建 - 第一阶段：构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY server/package*.json ./

# 仅安装生产环境的依赖
RUN npm ci --only=production

# 第二阶段：运行阶段
FROM node:18-alpine

# 安装必要的系统工具
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制后端代码
COPY server/*.js ./
COPY server/routes ./routes
COPY server/database ./database

# 复制管理后台静态文件
COPY admin/public ./public
COPY admin/css ./css
COPY admin/js ./js

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置目录权限
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "server.js"]

# 元数据标签
LABEL maintainer="support@example.com"
LABEL version="1.0.0"
LABEL description="Course Reservation Mini Program Backend Service"
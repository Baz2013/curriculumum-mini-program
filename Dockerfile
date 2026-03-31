# ============================================
# 课程预约系统 - Docker 镜像构建文件
# ============================================

# 多阶段构建 - 第一阶段：构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY server/package*.json ./

# 安装生产环境依赖
# 注意：使用 npm install 而不是 npm ci，因为项目可能没有 package-lock.json
# 这样可以在没有锁文件的情况下也能成功构建
RUN npm install --omit=dev

# ============================================
# 第二阶段：运行阶段
# ============================================
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

# 复制管理后台静态文件（保持原有目录结构）
# 重要：必须保持 admin 目录的原有结构，以便 server.js 能够正确引用
# server.js 中的路径配置：
#   - express.static(path.join(__dirname, '../admin/public'))
#   - express.static(path.join(__dirname, '../admin/css'))
#   - express.static(path.join(__dirname, '../admin/js'))
COPY admin ./admin

# 创建数据和日志目录
RUN mkdir -p /app/data /app/logs

# 创建非 root 用户以提高安全性
# UID/GID 1001 用于避免与其他服务的用户 ID 冲突
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置目录权限
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
# 每 30 秒检查一次，超时时间为 3 秒，启动后有 5 秒宽限期，连续失败 3 次才判定为不健康
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "server.js"]

# ============================================
# 元数据标签
# ============================================
LABEL maintainer="support@example.com"
LABEL version="1.0.0"
LABEL description="Course Reservation Mini Program Backend Service"
LABEL org.opencontainers.image.title="Curriculum Mini Program Backend"
LABEL org.opencontainers.image.description="Complete course reservation system with WeChat mini program and admin dashboard"
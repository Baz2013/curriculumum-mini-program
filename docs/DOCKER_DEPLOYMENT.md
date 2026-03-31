# Docker 部署指南

本文档详细介绍了如何使用 Docker 和 Docker Compose 部署课程预约系统。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [手动部署](#手动部署)
- [常用命令](#常用命令)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

---

## 前置要求

确保您的服务器已安装以下软件：

- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0

### 安装 Docker

```bash
# CentOS/RHEL
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 安装 Docker Compose

```bash
# 最新版本
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

---

## 快速开始

### 方法一：使用 Docker Compose（推荐）

这是最简单快捷的方式，适合大多数场景。

#### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 根据实际情况修改配置
vim .env
```

`.env` 文件的主要配置项：

```env
NODE_ENV=production
PORT=3000
APP_PORT=3000
```

#### 2. 构建并启动服务

```bash
# 构建镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 3. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 测试健康检查
curl http://localhost:3000/health

# 访问管理后台
# 浏览器打开: http://your-server-ip:3000
```

---

## 手动部署

如果不使用 Docker Compose，也可以手动使用 Docker 命令。

### 1. 构建 Docker 镜像

```bash
docker build -t course-api:v1.0.0 .
```

### 2. 创建数据卷

```bash
# 创建数据持久化目录
mkdir -p /opt/course-app/data
mkdir -p /opt/course-app/logs
```

### 3. 运行容器

```bash
docker run -d \
  --name course-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/course-app/data:/app/data \
  -v /opt/course-app/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3000 \
  course-api:v1.0.0
```

### 4. 查看运行状态

```bash
# 查看容器日志
docker logs -f course-api

# 进入容器调试
docker exec -it course-api sh

# 查看容器资源使用情况
docker stats course-api
```

---

## 常用命令

### Docker Compose 相关

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps

# 强制重建并启动
docker-compose up -d --force-recreate

# 查看资源使用
docker-compose top
```

### Docker 相关

```bash
# 查看运行的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看容器日志
docker logs -f course-api

# 停止容器
docker stop course-api

# 启动容器
docker start course-api

# 重启容器
docker restart course-api

# 删除容器
docker rm course-api

# 删除镜像
docker rmi course-api:v1.0.0

# 清理无用资源
docker system prune -a
```

---

## 故障排除

### 问题1: 容器无法启动

**症状**: `docker-compose up` 后容器立即退出

**诊断步骤**:

```bash
# 查看容器日志
docker-compose logs course-api

# 检查端口占用
netstat -tulnp | grep 3000

# 检查文件权限
ls -la /opt/course-app/data
```

**解决方案**:

```bash
# 修正目录权限
sudo chown -R 1001:1001 /opt/course-app/data
sudo chown -R 1001:1001 /opt/course-app/logs

# 释放占用的端口
sudo lsof -ti:3000 | xargs kill -9
```

### 问题2: 数据库文件丢失

**症状**: 重启容器后数据消失

**原因**: 数据卷未正确挂载

**解决方案**:

```bash
# 确保 volume 正确映射
docker run -d \
  -v $(pwd)/data:/app/data \
  ...

# 或使用 named volume
docker volume create course-db
docker run -d \
  -v course-db:/app/data \
  ...
```

### 问题3: 健康检查失败

**症状**: 容器一直处于 unhealthy 状态

**诊断**:

```bash
# 手动执行健康检查命令
docker exec course-api wget --quiet --tries=1 --spider http://localhost:3000/health

# 检查应用日志
docker logs course-api | tail -50
```

**解决方案**:

```bash
# 重启容器
docker-compose restart

# 如果持续失败，可能需要延长 startup period
# 修改 docker-compose.yml 中的 start_period
```

### 问题4: 内存溢出

**症状**: 容器因 OOMKilled 被终止

**解决方案**:

```bash
# 增加 Docker 的内存限制
docker run -d \
  --memory="2g" \
  --memory-swap="2g" \
  course-api:v1.0.0

# 或在 docker-compose.yml 中添加
deploy:
  resources:
    limits:
      memory: 2G
```

### 问题5: 网络连接问题

**症状**: 外部无法访问服务

**诊断**:

```bash
# 检查防火墙
sudo firewall-cmd --list-all

# 检查 SELinux
sestatus

# 测试容器内网络
docker exec course-api ping google.com
```

**解决方案**:

```bash
# 开放防火墙端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 临时禁用 SELinux（谨慎使用）
sudo setenforce 0
```

### 问题6: 管理后台无法访问

**症状**:
- 浏览器访问 `http://your-server-ip:3000` 显示错误
- 错误信息类似 `"ENOENT: no such file or directory, stat '/admin/public/index.html'"`

**原因**:
Docker 镜像中没有正确复制管理后台文件，或者文件路径配置不匹配。

**诊断**:

```bash
# 检查容器内是否存在 admin 目录
docker exec course-api ls -la /app/admin/

# 应该看到以下输出：
# drwxr-xr-x    3 nodejs   nodejs        4096 Mar 31 06:00 .
# drwxr-xr-x    1 nodejs   nodejs        4096 Mar 31 06:00 ..
# drwxr-xr-x    2 nodejs   nodejs        4096 Mar 31 06:00 css
# drwxr-xr-x    2 nodejs   nodejs        4096 Mar 31 06:00 js
# drwxr-xr-x    2 nodejs   nodejs        4096 Mar 31 06:00 public

# 检查 index.html 是否存在
docker exec course-api ls -la /app/admin/public/
```

**解决方案**:

```bash
# 1. 停止并删除旧容器
docker-compose down

# 2. 重新构建镜像（清除缓存以确保使用最新的 Dockerfile）
docker-compose build --no-cache

# 3. 再次启动服务
docker-compose up -d

# 4. 验证文件已正确复制
docker exec course-api ls -la /app/admin/public/

# 5. 测试访问
curl http://localhost:3000/
```

**预防措施**:

确保 [`Dockerfile`](../Dockerfile) 中包含了正确的 admin 目录复制语句：

```dockerfile
# 复制管理后台静态文件（保持原有目录结构）
COPY admin ./admin
```

这样可以将整个 admin 目录及其子目录（public、css、js）一起复制到容器中，保持原有的目录结构，使 [`server/server.js`](../server/server.js) 中的静态文件路径能够正确找到对应的文件。

---

## 最佳实践

### 1. 使用多阶段构建减少镜像体积

我们的 Dockerfile 已经采用了多阶段构建，最终镜像只包含运行所需的文件。

### 2. 非 Root 用户运行

出于安全考虑，容器内的应用以非 root 用户（UID 1001）运行。

### 3. 健康检查

内置的健康检查机制可以及时发现服务异常：

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 4. 日志轮转

避免日志无限增长导致磁盘耗尽：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 5. 数据持久化

始终使用 Volume 映射来持久化重要数据：

```yaml
volumes:
  - ./data:/app/data
```

### 6. 资源限制

合理分配 CPU 和内存资源：

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### 7. 自动重启

配置容器的重启策略：

```yaml
restart: unless-stopped
```

选项说明：
- `no`: 不自动重启
- `always`: 总是重启
- `on-failure`: 只有失败时重启
- `unless-stopped`: 除非明确停止否则总是重启

### 8. 环境隔离

不同环境使用不同的配置文件：

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 9. 镜像版本管理

使用语义化版本标记镜像：

```bash
docker tag course-api:latest course-api:v1.0.0
docker push registry.example.com/course-api:v1.0.0
```

### 10. 安全扫描

定期扫描镜像的安全漏洞：

```bash
# 使用 Trivy
trivy image course-api:v1.0.0

# 使用 Docker Scout
docker scout quickview course-api:v1.0.0
```

---

## 监控和维护

### 查看容器资源使用

```bash
# 实时监控
docker stats course-api

# 详细信息
docker inspect course-api
```

### 备份数据

```bash
# 备份数据库
docker exec course-api tar czf - /app/data | gzip > backup-$(date +%Y%m%d).tar.gz

# 恢复数据库
gunzip -c backup.tar.gz | docker exec -i course-api tar xzf -
```

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 平滑重启（不停服）
docker-compose up -d --no-deps --scale course-api=2
sleep 10
docker-compose up -d --no-deps --scale course-api=1
```

---

## 性能优化

### 1. 使用 Alpine 基础镜像

Alpine Linux 大小只有 5MB 左右，显著减小镜像体积。

### 2. 合并 RUN 指令

减少层数可以提高构建效率：

```dockerfile
# 好
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 避免
RUN apk add --no-cache tzdata
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo "Asia/Shanghai" > /etc/timezone
```

### 3. 利用 Docker 缓存

将变化少的指令放在前面：

```dockerfile
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

### 4. 多线程构建

利用 BuildKit 的并行构建能力：

```bash
export DOCKER_BUILDKIT=1
docker build -t course-api:v1.0.0 .
```

---

## 总结

使用 Docker 部署的优势：

✅ **一致性**: 开发和生产环境完全一致
✅ **便携性**: 一次构建，到处运行
✅ **隔离性**: 相互独立的环境
✅ **扩展性**: 易于水平扩展
✅ **自动化**: CI/CD 友好

遵循上述最佳实践，您可以获得稳定、高效的生产环境部署方案。

如有问题，请查阅官方文档或联系技术支持。
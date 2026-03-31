# 部署指南

本文档提供了课程预约系统的完整部署指南。

## 目录

- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [启动服务](#启动服务)
- [访问方式](#访问方式)
- [常见问题](#常见问题)

---

## 环境准备

### 系统要求

- **操作系统**: Linux/macOS/Windows
- **Node.js**: >= 14.x
- **内存**: 至少512MB RAM
- **磁盘空间**: 至少100MB可用空间

### 所需软件

1. **Node.js 和 npm**
   
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install nodejs npm
   
   # macOS
   brew install node
   
   # Windows
   # 从官网下载安装包: https://nodejs.org/
   ```

2. **Git**

   ```bash
   # Ubuntu/Debian
   sudo apt-get install git
   
   # macOS
   brew install git
   
   # Windows
   # 从官网下载安装包: https://git-scm.com/downloads
   ```

---

## 安装步骤

### 1. 克隆项目仓库

```bash
git clone <repository-url>
cd curriculumum_mini_program
```

### 2. 安装后端依赖

```bash
cd server
npm install
```

这将自动安装以下依赖包：

- `express`: Web框架
- `cors`: CORS跨域支持
- `body-parser`: 请求解析
- `sqlite3`: SQLite数据库驱动

### 3. （可选）配置环境变量

如果需要自定义端口或其他配置，可以在根目录创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=production
```

---

## 配置说明

### 数据库配置

本项目使用SQLite作为数据库，无需额外配置。数据库文件会自动生成在 `server/database.sqlite`。

### API域名配置

在小程序的 `miniprogram/app.js` 中修改API基础URL：

```javascript
globalData: {
  baseUrl: 'http://your-domain.com:3000/api'  // 替换为你的实际域名
}
```

### 管理后台访问

管理后台集成在后端服务中，可以通过浏览器直接访问。

---

## 启动服务

### 开发环境

```bash
cd server
npm start
```

或者使用 nodemon 自动重启（推荐）：

```bash
npm install -g nodemon
nodemon server.js
```

### 生产环境

建议使用 PM2 进行进程管理和守护：

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name course-api

# 查看状态
pm2 status

# 查看日志
pm2 logs course-api

# 重启服务
pm2 restart course-api

# 停止服务
pm2 stop course-api
```

### Docker部署（可选）

创建 `Dockerfile`:

```dockerfile
FROM node:14-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY server .

EXPOSE 3000

CMD ["node", "server.js"]
```

构建和运行：

```bash
# 构建镜像
docker build -t course-api .

# 运行容器
docker run -p 3000:3000 -v $(pwd)/server:/app/data course-api
```

---

## 访问方式

### 后端API

- **健康检查**: `http://localhost:3000/health`
- **API文档**: 参考 `docs/API_DOCUMENTATION.md`

### 管理后台

- **访问地址**: `http://localhost:3000`
- **默认账户**: 演示模式下无需登录

### 微信小程序

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 填写 AppID（可以使用测试号）
4. 点击"编译"按钮

---

## Nginx反向代理配置（生产环境推荐）

如果你有自己的域名，建议使用Nginx做反向代理：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # HTTP重定向到HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    SSL证书配置...
    
    # API接口
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 管理后台
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 安全加固建议

### 1. 启用HTTPS

在生产环境中务必启用SSL/TLS加密传输。

### 2. 身份认证

目前的管理员接口使用了简单的中间件验证，生产环境应实现真正的JWT Token认证。

### 3. SQL注入防护

本项目使用的SQLite参数化查询可以有效防范SQL注入。

### 4. XSS防护

前端输入输出均进行了适当的转义处理。

### 5. CSRF保护

对于重要的写操作，建议增加CSRF令牌验证。

---

## 监控和日志

### 日志位置

- **应用日志**: 控制台输出
- **PM2日志**: `$HOME/.pm2/logs/`

### 日志级别

建议根据环境调整日志级别：

```javascript
// 开发环境
console.log(...)

// 生产环境
if (process.env.NODE_ENV === 'development') {
  console.log(...)
}
```

---

## 备份策略

### 数据备份

定期备份SQLite数据库文件：

```bash
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp server/database.sqlite $BACKUP_DIR/database_$DATE.sqlite
find $BACKUP_DIR -mtime +7 -delete
```

设置为定时任务：

```cron
# 每天凌晨2点备份
0 2 * * * /path/to/backup.sh
```

---

## 故障排查

### 问题1: 无法连接数据库

**症状**: 启动时报错 "Cannot open database file"

**解决方案**:
```bash
# 检查文件权限
chmod 644 server/database.sqlite
chown www-data:www-data server/database.sqlite
```

### 问题2: 端口被占用

**症状**: EADDRINUSE: address already in use :::3000

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 或者在Linux/Mac上
netstat -anlp | grep 3000

# 杀死进程
kill -9 <PID>
```

### 问题3: 内存不足

**症状**: 进程频繁崩溃

**解决方案**:
- 升级服务器配置
- 或者使用PM2集群模式：
  ```bash
  pm2 start server.js -i max
  ```

### 问题4: 小程序无法请求API

**症状**: Network Error

**解决方案**:
1. 检查服务器防火墙规则
2. 确认域名已在微信公众平台配置白名单
3. 检查CORS配置

---

## 性能优化

### 1. 启用Gzip压缩

```javascript
const compression = require('compression');
app.use(compression());
```

### 2. 静态资源缓存

```javascript
app.use(express.static('public', {
  maxAge: '1y'
}));
```

### 3. 连接池

虽然SQLite不需要连接池，但如果迁移到MySQL/PostgreSQL则需要配置。

### 4. Redis缓存

考虑引入Redis缓存热点数据：

```javascript
const redis = require('redis');
const client = redis.createClient();
```

---

## 维护计划

### 日常维护

- 每日检查服务运行状态
- 每周审查错误日志
- 每月清理过期数据

### 版本升级

1. 备份数据库
2. 拉取最新代码
3. 安装新依赖
4. 重启服务

### 应急预案

制定详细的应急响应流程，包括：

- 服务宕机处理
- 数据损坏修复
- 安全漏洞应对

---

## 支持

如有问题请联系：

- **Issue Tracker**: GitHub Issues
- **邮件**: support@example.com
- **文档**: 查看 `docs/` 目录下的其他文档

---

祝部署顺利！🚀
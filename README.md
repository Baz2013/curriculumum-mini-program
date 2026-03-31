# 微信课程预约小程序系统

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Docker-orange.svg)

## 项目简介
这是一个基于微信小程序的全功能课程预约系统，包含学生端、管理后台和完整的后端API服务。

### 功能特性

#### 学生端
- 📚 浏览所有可用课程
- 🔍 课程搜索和筛选
- 📖 查看课程详细信息
- ✅ 在线预约课程
- 👤 个人中心和预约记录查询
- ❌ 取消已预约的课程

#### 管理员端
- ➕ 发布新课程
- ✏️ 编辑课程信息
- 🗑️ 删除课程
- 📊 统计数据概览
- 👥 查看所有预约记录
- ⭐ 学员评价管理

## 技术栈

### 前端
- 微信小程序原生开发
- WXML/WXSS/JavaScript

### 后端
- Node.js + Express
- SQLite 数据库
- RESTful API

## 目录结构

```
curriculumum_mini_program/
├── README.md                 # 项目说明文档
├── miniprogram/             # 小程序前端代码
│   ├── pages/               # 页面文件夹
│   │   ├── index/           # 首页
│   │   ├── detail/          # 课程详情页
│   │   ├── my-bookings/     # 我的预约
│   │   └── profile/         # 个人中心
│   ├── components/          # 自定义组件
│   ├── utils/              # 工具函数
│   ├── app.js              # 应用主逻辑
│   ├── app.json            # 全局配置
│   └── app.wxss            # 全局样式
├── server/                  # 后端服务代码
│   ├── config/             # 配置文件
│   ├── controllers/        # 控制器
│   ├── models/             # 数据模型
│   ├── routes/             # 路由
│   ├── middleware/         # 中间件
│   ├── database.sqlite     # SQLite数据库
│   ├── package.json        # 依赖配置
│   └── server.js           # 服务启动文件
└── docs/                   # 文档资料
```

## 快速开始

### 方式一：传统部署

#### 安装后端依赖
```bash
cd server
npm install
```

#### 启动后端服务
```bash
npm start
```
默认运行在 http://localhost:3000

### 方式二：Docker 部署（推荐）

#### 使用 Docker Compose
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 重要提示
⚠️ **首次部署注意事项**：
- 如果遇到 `npm ci` 错误，请先在 `server` 目录下运行 `npm install` 生成 `package-lock.json`
- 如果管理后台无法访问，请使用 `docker-compose build --no-cache` 重新构建镜像
- 确保云服务器安全组已开放 3000 端口

详细教程及故障排除请参阅：[Docker 部署指南](docs/DOCKER_DEPLOYMENT.md)

### 运行小程序
1. 使用微信开发者工具打开 `miniprogram` 目录
2. 点击编译按钮即可预览

## 开发环境要求
- Node.js >= 14.x
- Docker >= 20.10（可选，用于容器化部署）
- 微信开发者工具最新版
- 微信账号（用于登录小程序）

## 主要功能模块

### 1. 课程管理
- 课程列表展示
- 分类筛选
- 关键词搜索
- 详情查看

### 2. 预约系统
- 一键预约
- 座位限制检查
- 时间冲突检测
- 预约状态跟踪

### 3. 数据统计
- 总课程数
- 总预约人数
- 各类别课程分布
- 近期趋势图表

### 4. 用户管理
- 登录授权
- 信息维护
- 权限控制

## 注意事项
⚠️ 本项目仅供学习和演示使用，生产环境需要进行以下优化：
- 更完善的身份验证机制
- HTTPS加密传输
- 定期备份数据
- 性能监控和日志系统
- 错误处理和异常捕获

## 许可证
MIT License
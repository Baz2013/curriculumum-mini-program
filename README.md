# 微信课程预约小程序系统

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Docker-orange.svg)

## 项目简介
这是一个基于微信小程序的全功能课程预约系统，包含学生端、管理后台和完整的后端API服务。

### 功能特性

#### 学生端
- 📱 注册账户（需等待管理员审批）
- 🔐 微信一键登录
- 📚 浏览所有可用课程
- 🔍 课程搜索和筛选
- 📖 查看课程详细信息
- ✅ 在线预约课程
- 👤 个人中心和预约记录查询
- ❌ 取消已预约的课程
- 🎯 学习成就徽章系统
- 📊 学习数据分析
- ➤ 分享课程给好友
- 👥 邀请新用户注册

#### 管理员端
- ➕ 发布新课程
- ✏️ 编辑课程信息
- 🗑️ 删除课程
- 📊 统计数据概览
- 👥 查看所有预约记录
- ✅ 审批用户注册申请
- 👤 管理已注册用户
- 🔄 拒绝不合格申请

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
│   │   ├── profile/         # 个人中心
│   │   ├── register/        # 注册页面
│   │   └── login/           # 登录页面
│   ├── assets/             # 图片资源
│   ├── app.js              # 应用主逻辑
│   ├── app.json            # 全局配置
│   └── sitemap.json        # 索引配置
├── server/                  # 后端服务代码
│   ├── database/           # 数据库相关
│   │   └── init.js         # 数据库初始化
│   ├── routes/             # 路由
│   │   ├── admin.js        # 管理员路由
│   │   ├── auth.js         # 认证路由
│   │   ├── bookings.js     # 预约路由
│   │   ├── courses.js      # 课程路由
│   │   └── users.js        # 用户路由
│   ├── package.json        # 依赖配置
│   └── server.js           # 服务启动文件
├── admin/                   # Web管理后台
│   ├── public/             # 公共静态文件
│   │   └── index.html      # 主页面
│   ├── css/                # 样式文件
│   │   └── style.css       # 主样式
│   └── js/                 # JavaScript文件
│       └── main.js         # 主逻辑
├── docs/                   # 文档资料
│   ├── API_DOCUMENTATION.md      # API文档
│   ├── DEPLOYMENT_GUIDE.md       # 部署指南
│   ├── DOCKER_DEPLOYMENT.md      # Docker部署
│   └── MINIPROGRAM_DEPLOYMENT.md # 小程序部署
├── docker-compose.yml       # Docker编排配置
├── Dockerfile              # Docker镜像构建
└── .env.example            # 环境变量示例
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

**📘 详细部署指南**：如需将小程序发布到线上环境，请查阅 [微信小程序部署指南](docs/MINIPROGRAM_DEPLOYMENT.md)，其中包含了：
- 小程序账号注册流程
- 服务器域名配置详解
- 代码上传与审核流程
- 常见问题解决方案

## 开发环境要求
- Node.js >= 14.x
- Docker >= 20.10（可选，用于容器化部署）
- 微信开发者工具最新版
- 微信账号（用于登录小程序）

## 主要功能模块

### 1. 用户认证与管理
- 新用户注册（需管理员审批）
- 微信一键登录
- 用户角色管理（管理员/学生）
- 分享码生成与追踪
- 邀请关系链建立

### 2. 课程管理
- 课程列表展示
- 分类筛选
- 关键词搜索
- 详情查看
- 课程分享功能

### 3. 预约系统
- 一键预约
- 座位限制检查
- 时间冲突检测
- 预约状态跟踪
- 取消预约

### 4. 数据统计
- 总课程数
- 总预约人数
- 各类别课程分布
- 近期趋势图表
- 待审批申请提醒

### 5. 社交分享
- 课程分享至微信好友
- 分享至朋友圈
- 邀请好友注册
- 分享来源追踪

### 6. 成就系统
- 首次预约徽章
- 连续学习奖励
- 多领域探索者
- 学习统计分析

## 使用流程

### 学生端使用流程
1. **注册账户**
   - 进入小程序，填写基本信息进行注册
   - 等待管理员审批（通常1个工作日内）

2. **登录系统**
   - 审批通过后，使用微信一键登录
   - 可选填入他人分享码建立邀请关系

3. **浏览课程**
   - 查看所有发布的课程
   - 使用分类和关键词筛选感兴趣的内容

4. **预约课程**
   - 选择想要学习的课程
   - 查看详细信息和剩余名额
   - 点击"立即预约"完成预订

5. **分享推广**
   - 在课程详情页点击"分享"按钮
   - 或在个人中心点击"邀请好友"
   - 分享给微信好友或群聊

### 管理员端使用流程
1. **登录管理后台**
   - 访问Web管理界面
   - 输入管理员凭证登录

2. **审批注册申请**
   - 查看"待审批申请"列表
   - 审核申请人信息
   - 决定通过或拒绝（需填写拒绝理由）

3. **管理课程**
   - 发布新课程
   - 编辑现有课程信息
   - 下架过期课程

4. **查看数据**
   - 监控预约情况
   - 分析用户行为
   - 了解课程受欢迎程度

## 注意事项
⚠️ 本项目仅供学习和演示使用，生产环境需要进行以下优化：
- 更完善的身份验证机制
- HTTPS加密传输
- 定期备份数据
- 性能监控和日志系统
- 错误处理和异常捕获
- 敏感信息脱敏处理
- 分布式会话管理
- 高并发场景下的性能优化

## 许可证
MIT License
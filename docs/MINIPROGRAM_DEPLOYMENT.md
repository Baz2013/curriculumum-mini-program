# 微信小程序部署指南

本文档详细介绍如何将课程预约小程序从开发环境发布到线上环境。

## 目录

- [准备工作](#准备工作)
- [注册小程序账号](#注册小程序账号)
- [配置开发环境](#配置开发环境)
- [配置服务器域名](#配置服务器域名)
- [上传代码](#上传代码)
- [提交审核](#提交审核)
- [发布上线](#发布上线)
- [版本管理与迭代](#版本管理与迭代)
- [常见问题与解决方案](#常见问题与解决方案)

---

## 准备工作

### 必要条件

1. **已完成的后端服务**
   - 后端API服务正常运行并可公网访问
   - 已完成域名备案（如在中国大陆）
   - 支持HTTPS协议（正式发布必须）

2. **开发工具**
   - 最新版本的微信开发者工具
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

3. **账号资质**
   - 企业营业执照（企业类型小程序必需）
   - 法人身份证照片
   - 对公银行账户信息（用于支付等功能）

---

## 注册小程序账号

### 步骤1：进入注册页面

访问微信公众平台：https://mp.weixin.qq.com/

点击右上角「立即注册」，选择「小程序」选项。

### 步骤2：填写基本信息

```
主体类型选择：
├─ 个人（适合个人开发者，功能受限）
│  ├─ 无需营业执照
│  ├─ 不支持微信支付
│  └─ 类目较少
│
└─ 企业（推荐，功能完整）
   ├─ 需要营业执照
   ├─ 支持微信支付
   └─ 可申请更多类目和服务
```

### 步骤3：邮箱激活

使用未被注册过微信公众号的邮箱进行注册：

```plaintext
注意要点：
✓ 一个邮箱只能注册一个小程序
✓ 建议使用公司官方邮箱
✓ 密码强度要求较高
```

### 步骤4：主体信息登记

#### 个人类型
- 姓名
- 手机号码
- 身份证正反面照片

#### 企业类型
- 公司名称（需与营业执照一致）
- 营业执照图片
- 经营许可证（特殊行业需要）
- 法定代表人姓名
- 法定代表人手机号
- 对公银行账户信息

### 步骤5：管理员设置

指定小程序的管理员：

```plaintext
管理员职责：
• 可以绑定运营者
• 可以修改密码
• 可以解绑公众号关联
• 具有最高权限

重要提醒：
⚠️ 管理员的微信号必须是实名认证过的
⚠️ 建议使用公司核心人员担任
```

### 步骤6：等待审核

提交后通常需要1-7个工作日的审核时间。

---

## 配置开发环境

### 步骤1：获取AppID

审核通过后，登录微信公众平台：

```
路径：开发 → 开发管理 → 开发设置 → 开发者ID
```

复制保存您的 `AppID`，格式类似：`wxXXXXXXXXXXXXXXX`

### 步骤2：导入项目到微信开发者工具

1. 打开微信开发者工具
2. 选择「小程序」→ 「导入项目」

```
项目配置：
├─ 项目名称：课程预约小程序
├─ 目录：选择本项目根目录下的 miniprogram 文件夹
├─ AppID：粘贴刚才复制的AppID
│         （开发阶段可选择「测试号」）
└─ 开发模式：不勾选「建立普通快速启动模板」
```

3. 点击「导入」按钮

### 步骤3：配置project.config.json

如果项目中没有该文件，请在 `miniprogram` 根目录创建：

```json
{
  "appid": "wxYOUR_APP_ID_HERE",
  "compileType": "miniprogram",
  "libVersion": "2.19.4",
  "packOptions": {
    "ignore": [],
    "include": []
  },
  "setting": {
    "bundle": false,
    "userConfirmedBundleSwitch": false,
    "urlCheck": true,
    "scopeDataCheck": false,
    "coverView": true,
    "es6": true,
    "postcss": true,
    "compileHotReLoad": false,
    "lazyloadPlaceholderEnable": false,
    "preloadBackgroundData": false,
    "minified": true,
    "autoAudits": false,
    "newFeature": false,
    "uglifyFileName": false,
    "uploadWithSourceMap": true,
    "useIsolateContext": true,
    "nodeModules": false,
    "enhance": true,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "showShadowRootInWxmlPanel": true,
    "packNpmManually": false,
    "enableEngineNative": false,
    "packNpmRelationList": [],
    "minifyWXSS": true,
    "disableUseStrict": false,
    "minifyWXML": true
  }
}
```

### 步骤4：配置API基础URL

编辑 `miniprogram/app.js` 文件，修改 `baseUrl` 为您的实际服务器地址：

```javascript
// app.js
App({
  globalData: {
    userInfo: null,
    token: '',
    
    // 开发环境
    // baseUrl: 'http://localhost:3000/api',
    
    // 生产环境 - 请替换为您的实际域名
    baseUrl: 'https://your-domain.com/api'
    
    // 注意：正式发布必须使用HTTPS协议
  },

  // ... 其他代码保持不变
})
```

**多环境配置示例**

为了方便开发和生产切换，可以采用如下配置：

```javascript
const ENV_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000/api'
  },
  staging: {
    baseUrl: 'https://staging.your-domain.com/api'
  },
  production: {
    baseUrl: 'https://your-domain.com/api'
  }
}

// 当前环境
const CURRENT_ENV = 'production'

App({
  globalData: {
    baseUrl: ENV_CONFIG[CURRENT_ENV].baseUrl
  }
})
```

### 步骤5：配置TabBar图标

确保 `miniprogram/images/` 目录下存在以下图标文件：

```
miniprogram/images/
├─ home.png                (81×81px, 首页未选中)
├─ home-active.png         (81×81px, 首页选中)
├─ bookmark.png            (81×81px, 预约未选中)
├─ bookmark-active.png     (81×81px, 预约选中)
├─ user.png                (81×81px, 我未选中)
└─ user-active.png         (81×81px, 我选中)
```

如果没有这些图标，可以从以下途径获取：
- Iconfont：https://www.iconfont.cn/
- Flaticon：https://www.flaticon.com/
- 自己设计制作

---

## 配置服务器域名

这是最关键的一步，否则小程序无法正常调用后端API。

### 步骤1：准备域名

```plaintext
域名要求：
✓ 已完成ICP备案（中国大陆境内服务器）
✓ 支持HTTPS协议
✓ 有效期内且DNS解析正确
✓ 建议使用二级域名，例如 api.yourdomain.com
```

### 步骤2：配置SSL证书

如果您还没有SSL证书，可以选择免费方案：

#### Let's Encrypt（免费）

```bash
# 使用Certbot自动化签发
sudo certbot certonly --standalone -d api.yourdomain.com

# 证书位置
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
```

#### 云服务商提供

大多数云服务商都提供免费的DV SSL证书：
- 阿里云：数字证书管理服务
- 腾讯云：SSL证书
- 华为云：CCM证书管理

### 步骤3：配置Nginx（以Ubuntu为例）

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 强制HTTP跳转到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 反向代理到后端服务
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        
        # WebSocket支持（如有需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 传递真实客户端IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml 
               text/javascript application/x-javascript 
               application/xml+rss application/json;
}
```

重启Nginx使配置生效：

```bash
sudo nginx -t                    # 测试配置语法
sudo systemctl reload nginx      # 平滑重载
```

### 步骤4：在微信公众平台配置域名白名单

登录微信公众平台，按以下路径操作：

```
开发 → 开发管理 → 开发设置 → 服务器域名
```

需要配置三类域名：

#### 1. request合法域名

```
必填项，用于wx.request等网络请求

配置值：
https://api.yourdomain.com

注意事项：
✓ 只能配置HTTPS域名
✓ 不能带端口号
✓ 不能配置IP地址
✓ 不要加末尾斜杠 /
```

#### 2. uploadFile合法域名

```
如果有文件上传功能才需要配置

当前项目暂无文件上传功能，
此项可不配置。
```

#### 3. downloadFile合法域名

```
如果有文件下载功能才需要配置

当前项目暂无文件下载功能，
此项可不配置。
```

#### 4. socket合法域名

```
WebSocket通信域名

当前项目未使用WebSocket，
此项可不配置。
```

### 步骤5：业务域名配置（可选）

如果你的小程序内嵌入了网页（web-view），还需要配置业务域名：

```
开发 → 开发管理 → 业务域名

配置值：
https://www.yourdomain.com

注意：
需要在网站根目录放置校验文件
```

### 步骤6：关闭域名校验（仅开发调试）

在开发阶段，可以先临时关闭域名校验以便于调试：

```
微信开发者工具 → 右上角「详情」 → 本地设置
☑ 不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书

⚠️ 正式发布前一定要取消勾选此项！
```

---

## 上传代码

### 步骤1：代码检查

在上传之前，先进行全面的自检：

```markdown
□ 所有console.log语句都已删除或注释掉
□ 图片资源大小合理（单个不超过2MB）
□ API地址已改为生产环境的HTTPS地址
□ 敏感信息（密钥、Token等）不要硬编码在前端
□ TabBar图标尺寸符合规范（81×81px）
□ 页面标题描述准确清晰
□ 隐私政策链接已配置（如涉及个人信息收集）
□ 用户隐私指引已填写
```

### 步骤2：真机调试

在实际设备上进行充分测试：

```
测试清单：
□ iOS设备兼容性测试
□ Android不同品牌机型测试
□ 不同屏幕分辨率适配
□ 弱网环境下功能稳定性
□ 缓存清除后的行为
□ 异常场景的处理（断网、超时等）
```

### 步骤3：上传代码

在微信开发者工具中：

```
菜单栏 → 工具 → 上传代码
```

弹出对话框：

```
版本号：1.0.0
项目备注：初始版本发布
```

点击「确定」开始上传。

上传完成后，会在右下角显示通知：「上传成功」。

### 步骤4：体验版测试

上传成功后，可以生成分享二维码供他人测试：

```
微信开发者工具 → 右侧「预览」按钮
↓
扫描生成的二维码
↓
在微信中打开体验版
```

也可以分享给团队成员：

```
微信公众平台 → 管理 → 版本管理 → 开发版本
↓
找到对应版本
↓
点击「体验者」邀请成员成为体验者
```

---

## 提交审核

### 步骤1：填写版本信息

登录微信公众平台：

```
管理 → 版本管理 → 开发版本
↓
点击右侧「提交审核」
```

填写必要信息：

```
版本号：1.0.0
版本描述：首个正式版本，提供课程浏览、在线预约、订单管理等核心功能
```

### 步骤2：填写测试账号（如需要）

如果小程序需要登录才能使用某些功能，需要提供测试账号：

```
测试账号：
用户名：test001
密码：Test@123456

说明：提供给审核人员进行功能测试
```

### 步骤3：补充材料

根据小程序的功能特点，可能需要补充相关证明材料：

```
教育类小程序：
□ 《办学许可证》或《民办非企业单位登记证书》
□ 相关主管部门批准文件

医疗健康类：
□ 医疗机构执业许可证
□ 执业医师资格证

金融理财类：
□ 金融牌照
□ 相应的业务许可证明
```

### 步骤4：隐私政策和用户协议

在小程序的「关于我们」或「帮助」页面中，必须包含：

#### 隐私政策主要内容

```markdown
1. 收集的信息范围
   • 设备型号、操作系统版本
   • 微信昵称、头像（经用户同意）
   • 操作日志、定位信息（如适用）

2. 信息的使用目的
   • 提供基本的服务功能
   • 改进用户体验
   • 安全保障

3. 第三方共享
   • 明确不会未经允许共享给第三方
   • 法律法规要求的除外

4. 存储期限和安全措施
   • 说明数据的保留时长
   • 采用的安全技术手段

5. 用户权利
   • 查询权
   • 更正权
   • 删除权
   • 注销权

6. 联系方式
   • 公司地址
   • 电子邮箱
   • 电话号码
```

#### 用户协议主要内容

```markdown
1. 服务条款
   • 定义服务的具体内容和范围
   • 说明用户的权利和义务

2. 使用规范
   • 禁止违法违规行为
   • 禁止恶意攻击破坏

3. 知识产权声明
   • 版权归属
   • 商标使用权

4. 免责条款
   • 不可抗力因素
   • 第三方原因导致的问题

5. 争议解决
   • 适用法律
   • 解决方式和管辖法院
```

### 步骤5：等待审核结果

```
常规审核周期：
• 一般类目：1-7个工作日
• 特殊类目：7-15个工作日

审核期间请注意：
✓ 保持联系方式畅通
✓ 及时回复审核人员的询问
✓ 关注审核进度通知
```

可能的审核结果：

```
1. 通过 ✓
   直接可以进行下一步发布操作

2. 驳回 ✗
   会给出驳回理由，按要求修改后再次提交

3. 补充材料 ℹ
   需要在规定时间内补齐所需材料
```

常见的驳回原因：

```
❌ 内容违规
   • 含有色情暴力等内容
   • 包含虚假宣传信息

❌ 功能缺陷
   • 存在明显的bug
   • 流程不通畅

❌ UI不规范
   • 与微信风格差异过大
   • 影响用户体验的设计

❌ 资质不全
   • 缺少必要的经营许可
   • 行业准入证件缺失

❌ 隐私合规问题
   • 过度收集用户信息
   • 隐私政策不明确或不完整
```

---

## 发布上线

### 步骤1：确认审核通过

收到审核通过的短信或站内消息后：

```
微信公众平台 → 管理 → 版本管理 → 审核版本
```

可以看到状态变为「审核通过」。

### 步骤2：全量发布

点击「发布」按钮：

```
发布方式选择：
○ 全量发布（推荐）
  ○ 分时间段放量发布
  
灰度比例：（仅在分时段发布时可设）
  □ 10%
  ☑ 30%
  □ 50%
  □ 100%

发布说明：
本次更新主要内容包括：
1. 新增课程分类筛选功能
2. 优化预约流程交互体验
3. 修复已知若干Bug
```

对于初次发布的版本，建议选择「全量发布」。

### 步骤3：发布公告（可选）

为了让用户了解新版本的变化，可以编写发布公告：

```
标题：【重磅首发】课程预约小程序正式上线啦！

正文：
亲爱的同学们，

经过精心筹备，我们的课程预约小程序今天终于和大家见面了！

🎉 核心功能一览：
• 【课程浏览】- 海量优质课程任你挑选
• 【智能搜索】- 快速找到心仪好课  
• 【一键预约】- 简单三步轻松报名
• 【订单管理】- 随时掌握预约动态
• 【个人中心】- 打造专属学习档案

📱 如何使用：
1. 打开微信扫一扫下方二维码
2. 进入小程序即可开始探索
3. 更多精彩等你发现！

有任何疑问欢迎随时联系我们~

祝大家学习愉快！
```

可以将公告同步发布到：
- 学校官方网站
- 公众号推文
- 社群朋友圈
- 校园海报

### 步骤4：监控上线效果

发布初期密切关注各项指标：

```
性能监控：
□ 平均启动耗时
□ 白屏率
□ JS报错率
□ 网络请求成功率

业务监控：
□ DAU（日活跃用户数）
□ UV/PV比
□ 预约转化率
□ 用户留存率

反馈渠道：
□ 用户投诉和建议
□ 应用商店评分评论
□ 社区讨论热度
```

发现问题及时响应和处理。

---

## 版本管理与迭代

### 版本号命名规范

遵循语义化版本（Semantic Versioning）：

```
格式：MAJOR.MINOR.PATCH

示例解读：
1.0.0  ← 首个稳定版本
1.0.1  ← Bug修复版本
1.1.0  ← 新增小功能
2.0.0  ← 重大改版升级
```

### 开发分支策略

```
master/main     ← 生产环境代码
  ↑
develop         ← 开发主干
  ↑
feature/*       ← 功能分支
hotfix/*        ← 紧急修复分支
release/*       ← 发布候选分支
```

### 回滚机制

万一新版出现问题，需要有快速的回滚方案：

```
紧急回滚步骤：

1. 发现严重问题
   ↓
2. 立即评估影响范围
   ↓
3. 决定是否需要回滚
   ↓
4. 下架当前版本
   （微信公众平台 → 管理 → 版本管理 → 线上版本 → 下架）
   ↓
5. 将上一个稳定版本设置为线上版本
   ↓
6. 向受影响的用户致歉说明
   ↓
7. 组织团队分析问题根源
   ↓
8. 修复后重新走提审发布流程
```

### 灰度发布实践

为了避免大规模风险，可采用渐进式发布：

```
第1天：10%流量
观察是否有明显问题

第2天：扩大至30%
继续监测数据和反馈

第3天：扩大至50%
重点检验高并发场景

第4天：全面放开
完成全部推广
```

---

## 常见问题与解决方案

### Q1: 为什么request总是返回fail？

**问题描述**：调用后端API时一直走到fail回调

**可能原因**：

1. 域名未加入白名单
   ```
   解决方案：
   登录微信公众平台 → 开发 → 开发设置 → 服务器域名
   添加正确的request合法域名
   ```

2. 还在使用HTTP而非HTTPS
   ```
   解决方案：
   确保后端已经配置SSL证书
   并强制使用HTTPS协议
   ```

3. 域名拼写错误
   ```
   解决方案：
   仔细核对app.js中的baseUrl配置
   是否有多余字符或遗漏字母
   ```

4. 服务器本身挂掉了
   ```
   解决方案：
   用curl命令测试连通性
   curl https://api.yourdomain.com/api/health
   ```

### Q2: 怎么区分开发环境和生产环境？

**最佳实践**：

```javascript
// env.js
module.exports = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    enableDebugLog: true
  },
  production: {
    baseUrl: 'https://api.yourdomain.com/api',
    enableDebugLog: false
  }
}

// app.js
const envConfig = require('./utils/env')
let currentEnv = 'production'

// 根据编译时的条件判断
#ifdef DEBUG
currentEnv = 'development'
#endif

App({
  globalData: {
    ...envConfig[currentEnv]
  }
})

// project.config.json
{
  "scripts": {
    "build:prod": "NODE_ENV=production ..."
  }
}
```

### Q3: 小程序体积超过限制怎么办？

**限制标准**：
- 主包：2MB
- 单分包：2MB
- 整个小程序：20MB

**优化技巧**：

1. 移除无用代码和资源
   ```bash
   # 清理unused assets
   rm -rf unused_images/
   ```

2. 压缩图片
   ```bash
   # 使用tinypng批量压缩
   tinypng *.png
   ```

3. 使用分包加载
   ```json
   // app.json
   {
     "subpackages": [
       {
         "root": "subpackage/",
         "pages": [...]
       }
     ]
   }
   ```

4. CDN托管大图
   ```javascript
   // 不要把大图放在本地
   // 改用CDN链接
   imageUrl: 'https://cdn.xxx.com/large-image.jpg'
   ```

### Q4: 审核被驳回了怎么申诉？

**申诉流程**：

1. 先认真阅读驳回理由
2. 对照平台规则自查自纠
3. 逐条整改相关问题
4. 再次提交审核
5. 附上整改说明

**沟通话术参考**：

```
尊敬的审核老师您好：

针对贵方的驳回意见，我们已经完成了全面的整改：

原问题：缺少明确的隐私政策
整改措施：新增独立的隐私政策页面，详细说明了...
截图证据：附件privacy-page.png

原问题：UI不符合微信设计规范
整改措施：参照官方设计指南重构了XX页面...

恳请您再次审核，感谢理解和支持！
```

### Q5: 如何追踪线上问题的根本原因？

**埋点和日志体系**：

```javascript
// 引入腾讯云移动分析SDK
import TWA from '@tencent/analytics-wx-sdk'

// 初始化
TWA.init({
  appid: 'YOUR_TWA_APPID',
  reportInterval: 10
})

// 自定义事件上报
TWA.trackEvent('click_book_button', {
  courseId: 123,
  categoryName: '编程入门'
})

// 错误捕获
try {
  // 可能出错的代码
} catch (error) {
  TWA.reportException(error.stack)
}
```

配合后端的ELK日志系统，形成完整的链路追踪。

### Q6: 多人协作开发的注意事项？

**协同规范**：

1. 统一代码风格
   ```bash
   # ESLint配置
   npm install eslint-plugin-miniprogram --save-dev
   ```

2. Git提交规范
   ```
   feat: 新增课程收藏功能
   fix: 修复预约重复提交的bug
   style: 格式化代码
   docs: 更新部署文档
   test: 增加单元测试覆盖
   chore: 更新依赖包版本
   ```

3. Code Review制度
   ```
   Pull Request Checklist:
   □ 代码通过了Lint检查
   □ 有相应的单元测试
   □ 更新了相关的文档
   □ 经过至少一人Review
   ```

4. CI/CD流水线
   ```yaml
   # .github/workflows/deploy.yml
   name: Build & Test
   on: [push]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Install Dependencies
           run: npm install
         - name: Run Tests
           run: npm test
         - name: Upload Artifacts
           uses: actions/upload-artifact@v2
   ```

### Q7: 如何提升小程序的性能表现？

**性能优化清单**：

```
首屏渲染速度：
□ 减少setData的数据量
□ 合理使用虚拟列表
□ 图片懒加载
□ 骨架屏占位

运行流畅度：
□ 避免频繁触发scroll事件
□ 动画优先使用CSS transition
□ 长列表使用recycle-view
□ 防抖节流高频操作

网络效率：
□ 接口合并减少请求次数
□ 启用gzip压缩
□ 利用缓存策略
□ CDN加速静态资源

内存占用：
□ 及时释放不再需要的对象
□ 大型数据处理分段进行
□ 图片回收机制
□ Page onHide时暂停动画
```

### Q8: 国际化和多语言怎么做？

**i18n实施方案**：

```javascript
// i18n/en-US.js
export default {
  common: {
    loading: 'Loading...',
    submit: 'Submit',
    cancel: 'Cancel'
  },
  page: {
    home: {
      welcome: 'Welcome!'
    }
  }
}

// i18n/zh-CN.js
export default {
  common: {
    loading: '加载中...',
    submit: '提交',
    cancel: '取消'
  },
  page: {
    home: {
      welcome: '欢迎使用！'
    }
  }
}

// utils/i18n.js
import enUS from '../i18n/en-US'
import zhCN from '../i18n/zh-CN'

const locales = { enUS, zhCN }

class I18n {
  constructor(locale = 'enUS') {
    this.locale = locale
  }
  
  t(key) {
    const keys = key.split('.')
    let obj = locales[this.locale]
    for (const k of keys) {
      obj = obj[k]
    }
    return obj
  }
  
  setLocale(locale) {
    this.locale = locale
  }
}

export default new I18n()
```

然后在各个页面中使用：

```javascript
import i18n from '../../utils/i18n'

Page({
  onLoad() {
    this.setData({
      welcomeMsg: i18n.t('page.home.welcome')
    })
  }
})
```

---

## 附录

### A. 微信小程序官方文档索引

- 入门指南：https://developers.weixin.qq.com/easyaction/doc/get-started/introduction
- API文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 组件文档：https://developers.weixin.qq.com/miniprogram/dev/component/
- 能力接入：https://developers.weixin.qq.com/miniprogram/dev/framework/capabilities/
- 运营规范：https://developers.weixin.qq.com/miniprogram/product/

### B. 常用工具和插件

- Vant Weapp：轻量可靠的移动端组件库
- MobX：简洁易用的状态管理
- Day.js：轻量的日期处理库
- Lodash：实用的JS工具函数集合
- Mock.js：模拟数据生成器

### C. 学习资源和社区

- 微信开放社区：https://developers.weixin.qq.com/community/
- SegmentFault标签页：https://segmentfault.com/t/wechat-app
- Stack Overflow：https://stackoverflow.com/questions/tagged/wechat-mini-program
- GitHub优秀开源项目精选

### D. 联系支持

如果在部署过程中遇到任何困难，欢迎通过以下方式寻求帮助：

- 提交GitHub Issue
- 加入微信群交流
- 发送邮件咨询

---

最后祝愿您的小程序顺利上线并获得广大用户的喜爱！🎉
/**
 * Course Reservation Server
 * 主服务器入口文件
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 引入路由
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// 引入数据库初始化
const db = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 数据库辅助函数
const sqlite3 = require('sqlite3');
const DB_PATH = path.join(__dirname, 'database/course_reservation.db');

/**
 * 从JWT令牌解析用户信息的辅助函数
 */
const getUserFromToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authorizationHeader.split(' ')[1];
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded.userId ? parseInt(decoded.userId) : null;
  } catch (error) {
    console.error('[令牌解析失败]', error.message);
    return null;
  }
};

/**
 * 验证用户审批状态的中间件
 * 只允许已批准的用户访问受保护的资源
 */
const verifyApprovedUser = async (req, res, next) => {
  // 白名单路径：不需要验证审批状态的公共接口
  const publicPaths = [
    '/api/auto-login',
    '/api/me',  // 用于刷新状态，必须允许pending用户访问
    '/api/share/',
    '/api/health',
    '/health'
  ];
  
  // 检查是否是白名单路径
  const isPublicPath = publicPaths.some(publicPath =>
    req.path.startsWith(publicPath.replace('*', ''))
  );
  
  if (isPublicPath) {
    return next();
  }
  
  // 对于其他路径，提取用户ID并验证审批状态
  const userId = getUserFromToken(req.headers.authorization);
  
  if (!userId) {
    console.warn('[权限拦截] 无效的令牌:', req.path);
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '请先登录'
    });
  }
  
  // 查询用户审批状态
  const db = new sqlite3.Database(DB_PATH);
  
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, approval_status FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
    
    if (!user) {
      console.warn('[权限拦截] 用户不存在:', userId);
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }
    
    // 检查审批状态
    if (user.approval_status !== 'approved') {
      console.warn('[权限拦截] 用户未获准访问:', {
        userId,
        status: user.approval_status,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'NOT_APPROVED',
        message: user.approval_status === 'pending'
          ? '您的账户正在审核中，暂不可用此功能'
          : '您的账户未被批准使用本服务',
        approvalStatus: user.approval_status
      });
    }
    
    // 将用户信息附加到请求对象供后续使用
    req.authenticatedUserId = userId;
    next();
    
  } catch (error) {
    console.error('[审批状态验证出错]', error);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: '验证过程中出现错误'
    });
  } finally {
    db.close();
  }
};

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
// 导出中间件供子路由使用
module.exports.verifyApprovedUser = verifyApprovedUser;

// API路由
app.use('/api', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/bookings', verifyApprovedUser, bookingRoutes);  // 所有预约操作都要求已批准
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查接口（放在API路由之后，静态文件之前）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 兼容旧的健康检查路径
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件托管 - 管理后台
// 注意：在 Docker 容器中，admin 目录位于 /app/admin/，而非上级目录
const adminDir = path.join(__dirname, './admin');
app.use(express.static(path.join(adminDir, 'public')));
app.use('/css', express.static(path.join(adminDir, 'css')));
app.use('/js', express.static(path.join(adminDir, 'js')));

// 默认路由指向管理后台
app.get('/', (req, res) => {
  res.sendFile(path.join(adminDir, 'public/index.html'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 启动服务器
db.initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║                                    ║
║   🚀 Server Started Successfully   ║
║                                    ║
║   Port: ${PORT}                      ║
║   URL:  http://localhost:${PORT}       ║
║                                    ║
╚════════════════════════════════════╝
    `);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
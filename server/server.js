/**
 * Course Reservation Server
 * 主服务器入口文件
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 引入路由
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

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/courses', courseRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 静态文件托管 - 管理后台
app.use(express.static(path.join(__dirname, '../admin/public')));
app.use('/css', express.static(path.join(__dirname, '../admin/css')));
app.use('/js', express.static(path.join(__dirname, '../admin/js')));

// 默认路由指向管理后台
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/public/index.html'));
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
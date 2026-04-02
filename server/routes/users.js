/**
 * Users Routes
 * 用户相关API路由
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../database/init');

/**
 * 获取数据库连接的辅助函数
 */
const getDbConnection = () => {
  const dbInstance = getInstance();
  return dbInstance ? dbInstance.getConnection() : null;
};

/**
 * POST /api/user/login
 * 用户登录/注册
 */
router.post('/login', async (req, res) => {
  try {
    const { openid, nickname, avatarUrl } = req.body;

    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少OpenID' });
    }

    const db = getInstance();

    // 查找用户
    let user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 如果用户不存在则创建
    if (!user) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (openid, nickname, avatar_url) VALUES (?, ?, ?)',
          [openid, nickname || '微信用户', avatarUrl || ''],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // 再次查询获取刚创建的用户
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      // 更新用户信息
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET nickname = COALESCE(?, nickname), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [nickname, avatarUrl, user.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // 移除敏感字段
    delete user.openid;

    res.json({ 
      success: true, 
      data: user,
      message: '登录成功'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

/**
 * GET /api/user/info
 * 获取用户信息
 */
router.get('/info', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, nickname, avatar_url, phone, email, role, created_at FROM users WHERE id = ?', 
            [userId], 
            (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

/**
 * PUT /api/user/update
 * 更新用户信息
 */
router.put('/update', async (req, res) => {
  try {
    const { userId, nickname, phone, email } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();

    // 检查手机号是否已被他人使用
    if (phone) {
      const existingUser = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: '该手机号已被使用' });
      }
    }

    // 检查邮箱是否已被他人使用
    if (email) {
      const existingEmail = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingEmail) {
        return res.status(400).json({ success: false, message: '该邮箱已被使用' });
      }
    }

    // 更新用户信息
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET nickname = COALESCE(?, nickname), phone = COALESCE(?, phone), email = COALESCE(?, email), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nickname, phone, email, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: '更新用户信息失败' });
  }
});

/**
 * GET /api/user/bookings
 * 获取用户的预约列表
 */
router.get('/bookings', async (req, res) => {
  console.log('\n========== [/api/user/bookings] 请求开始 ==========');
  const startTime = Date.now();
  
  try {
    const { userId } = req.query;
    console.log('[INFO] 请求参数 - userId:', userId);

    if (!userId) {
      console.warn('[WARN] 缺少用户ID');
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();
    
    if (!db) {
      console.error('[ERROR] 无法获取数据库连接');
      throw new Error('数据库连接失败');
    }

    console.log('[STEP 1] 查询用户预约记录...');
    const bookings = await new Promise((resolve, reject) => {
      const sql = `
        SELECT b.*,
               c.title as course_title,
               c.description as course_description,
               c.teacher,
               c.location,
               c.start_time,
               c.end_time,
               c.price,
               c.image,
               ca.name as category_name
        FROM bookings b
        INNER JOIN courses c ON b.course_id = c.id
        LEFT JOIN categories ca ON c.category_id = ca.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `;
      console.log('[SQL] 查询SQL:', sql.replace(/\s+/g, ' ').trim());
      
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          console.error('[DB ERROR] 查询预约记录失败:', err);
          reject(err);
        } else {
          console.log('[STEP 1 完成] 找到', rows.length, '条预约记录');
          resolve(rows);
        }
      });
    });

    const responseData = { success: true, list: bookings };
    
    const elapsed = Date.now() - startTime;
    console.log(`[/api/user/bookings] 请求完成 ✓ 耗时: ${elapsed}ms`);
    console.log('==================================================\n');
    
    res.json(responseData);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/user/bookings] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('==================================================\n');
    
    res.status(500).json({
      success: false,
      message: '获取预约列表失败',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user/stats
 * 获取用户统计数据
 */
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();

    // 总预约次数
    const totalBookings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM bookings WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 已参与的课程（已签到的）
    const attendedCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND check_in_status = "checked"',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 计算累计学习时长（假设每门课平均2小时）
    const studyHours = attendedCount * 2;

    res.json({
      success: true,
      data: {
        total_bookings: totalBookings,
        attended_count: attendedCount,
        study_hours: studyHours
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

module.exports = router;
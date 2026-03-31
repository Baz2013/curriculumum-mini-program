/**
 * Users Routes
 * 用户相关API路由
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../database/init');

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
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();

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
      db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, list: bookings });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ success: false, message: '获取预约列表失败' });
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
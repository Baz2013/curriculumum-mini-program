/**
 * Bookings Routes
 * 预约相关API路由
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
 * POST /api/bookings/create
 * 创建新的预约
 */
router.post('/create', async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const db = getInstance();

    // 检查课程是否存在且有名额
    const course = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    if (course.booked_count >= course.capacity) {
      return res.status(400).json({ success: false, message: '课程已满员' });
    }

    // 检查是否已经预约过
    const existingBooking = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status != "cancelled"',
        [userId, courseId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingBooking) {
      return res.status(400).json({ success: false, message: '您已经预约过这门课程' });
    }

    // 创建预约
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookings (user_id, course_id, status) VALUES (?, ?, ?)',
        [userId, courseId, 'confirmed'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 更新课程的预约人数
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?',
        [courseId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '预约成功' });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: '预约失败' });
  }
});

/**
 * DELETE /api/bookings/cancel/:courseId
 * 取消预约
 */
router.delete('/cancel/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();

    // 查找预约记录
    const booking = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status = "confirmed"',
        [userId, courseId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: '找不到有效的预约记录' });
    }

    // 检查是否允许取消（例如：开课前24小时内不允许取消）
    const course = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const now = new Date();
    const startTime = new Date(course.start_time);
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      return res.status(400).json({ 
        success: false, 
        message: '开课前24小时内不能取消预约' 
      });
    }

    // 更新预约状态为已取消
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE bookings SET status = "cancelled" WHERE id = ?',
        [booking.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 减少课程的预约人数
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE courses SET booked_count = MAX(0, booked_count - 1) WHERE id = ?',
        [courseId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '已取消预约' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: '取消预约失败' });
  }
});

/**
 * GET /api/bookings/user/:userId
 * 获取用户的预约列表
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const db = getInstance();

    let conditions = ['b.user_id = ?'];
    let params = [userId];

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

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
               ca.name as category_name
        FROM bookings b
        INNER JOIN courses c ON b.course_id = c.id
        LEFT JOIN categories ca ON c.category_id = ca.id
        WHERE ${whereClause}
        ORDER BY b.created_at DESC
      `;
      db.all(sql, params, (err, rows) => {
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
 * PUT /api/bookings/checkin/:id
 * 签到打卡
 */
router.put('/checkin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const db = getInstance();

    // 检查预约是否存在
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: '预约记录不存在' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: '只能对有效预约进行签到' });
    }

    // 更新签到状态
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE bookings SET check_in_status = "checked" WHERE id = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '签到成功' });
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ success: false, message: '签到失败' });
  }
});

module.exports = router;
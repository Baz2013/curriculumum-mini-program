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
  console.log('\n========== [/api/bookings/create] 请求开始 ==========');
  const startTime = Date.now();
  
  try {
    const { userId, courseId } = req.body;
    console.log('[INFO] 请求参数 - userId:', userId, ', courseId:', courseId);

    if (!userId || !courseId) {
      console.warn('[WARN] 参数不完整');
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const db = getInstance();
    
    if (!db) {
      console.error('[ERROR] 无法获取数据库连接');
      throw new Error('数据库连接失败');
    }

    // 检查课程是否存在且有名额
    console.log('[STEP 1] 检查课程信息和可用名额...');
    const course = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
        if (err) {
          console.error('[DB ERROR] 查询课程失败:', err);
          reject(err);
        } else {
          console.log('[STEP 1 完成] 课程信息:', row ? '找到' : '未找到');
          resolve(row);
        }
      });
    });

    if (!course) {
      console.warn('[WARN] 课程不存在');
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    if (course.booked_count >= course.capacity) {
      console.warn('[WARN] 课程已满员');
      return res.status(400).json({ success: false, message: '课程已满员' });
    }

    // 检查是否已经预约过
    console.log('[STEP 2] 检查重复预约...');
    const existingBooking = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status != "cancelled"',
        [userId, courseId],
        (err, row) => {
          if (err) {
            console.error('[DB ERROR] 查询预约记录失败:', err);
            reject(err);
          } else {
            console.log('[STEP 2 完成] 重复预约检查:', existingBooking ? '已预约' : '可预约');
            resolve(row);
          }
        }
      );
    });

    if (existingBooking) {
      console.warn('[WARN] 已经预约过这门课程');
      return res.status(400).json({ success: false, message: '您已经预约过这门课程' });
    }

    // 创建预约
    console.log('[STEP 3] 创建预约记录...');
    const bookingId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookings (user_id, course_id, status) VALUES (?, ?, ?)',
        [userId, courseId, 'confirmed'],
        function(err) {
          if (err) {
            console.error('[DB ERROR] 创建预约失败:', err);
            reject(err);
          } else {
            console.log('[STEP 3 完成] 预约记录创建成功, ID:', this.lastID);
            resolve(this.lastID);
          }
        }
      );
    });

    // 更新课程的预约人数
    console.log('[STEP 4] 更新课程预约人数...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?',
        [courseId],
        (err) => {
          if (err) {
            console.error('[DB ERROR] 更新课程预约人数失败:', err);
            reject(err);
          } else {
            console.log('[STEP 4 完成] 课程预约人数更新成功');
            resolve();
          }
        }
      );
    });

    const responseData = { success: true, message: '预约成功' };
    
    const elapsed = Date.now() - startTime;
    console.log(`[/api/bookings/create] 请求完成 ✓ 耗时: ${elapsed}ms`);
    console.log('===================================================\n');
    
    res.json(responseData);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/bookings/create] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('===================================================\n');
    
    res.status(500).json({
      success: false,
      message: '预约失败',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/bookings/cancel/:courseId
 * 取消预约
 */
router.delete('/cancel/:courseId', async (req, res) => {
  console.log('\n========== [/api/bookings/cancel/:courseId] 请求开始 ==========');
  const startTime = Date.now();
  
  try {
    const { courseId } = req.params;
    const { userId } = req.body;
    console.log('[INFO] 请求参数 - userId:', userId, ', courseId:', courseId);

    if (!userId) {
      console.warn('[WARN] 缺少用户ID');
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    const db = getInstance();
    
    if (!db) {
      console.error('[ERROR] 无法获取数据库连接');
      throw new Error('数据库连接失败');
    }

    // 查找预约记录
    console.log('[STEP 1] 查找预约记录...');
    const booking = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status = "confirmed"',
        [userId, courseId],
        (err, row) => {
          if (err) {
            console.error('[DB ERROR] 查询预约记录失败:', err);
            reject(err);
          } else {
            console.log('[STEP 1 完成] 预约记录:', booking ? '找到' : '未找到');
            resolve(row);
          }
        }
      );
    });

    if (!booking) {
      console.warn('[WARN] 找不到有效的预约记录');
      return res.status(404).json({ success: false, message: '找不到有效的预约记录' });
    }

    // 检查是否允许取消（例如：开课前24小时内不允许取消）
    console.log('[STEP 2] 检查取消限制...');
    const course = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
        if (err) {
          console.error('[DB ERROR] 查询课程信息失败:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    const now = new Date();
    const startTimeDate = new Date(course.start_time);
    const hoursUntilStart = (startTimeDate - now) / (1000 * 60 * 60);
    console.log('[STEP 2] 距离开课时间:', hoursUntilStart.toFixed(2), '小时');

    if (hoursUntilStart < 24) {
      console.warn('[WARN] 开课前24小时内不能取消预约');
      return res.status(400).json({
        success: false,
        message: '开赛前24小时内不能取消预约'
      });
    }

    // 更新预约状态为已取消
    console.log('[STEP 3] 更新预约状态...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE bookings SET status = "cancelled" WHERE id = ?',
        [booking.id],
        (err) => {
          if (err) {
            console.error('[DB ERROR] 更新预约状态失败:', err);
            reject(err);
          } else {
            console.log('[STEP 3 完成] 预约状态更新成功');
            resolve();
          }
        }
      );
    });

    // 减少课程的预约人数
    console.log('[STEP 4] 更新课程预约人数...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE courses SET booked_count = MAX(0, booked_count - 1) WHERE id = ?',
        [courseId],
        (err) => {
          if (err) {
            console.error('[DB ERROR] 更新课程预约人数失败:', err);
            reject(err);
          } else {
            console.log('[STEP 4 完成] 课程预约人数更新成功');
            resolve();
          }
        }
      );
    });

    const responseData = { success: true, message: '已取消预约' };
    
    const elapsed = Date.now() - startTime;
    console.log(`[/api/bookings/cancel/:courseId] 请求完成 ✓ 耗时: ${elapsed}ms`);
    console.log('===========================================================\n');
    
    res.json(responseData);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/bookings/cancel/:courseId] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('===========================================================\n');
    
    res.status(500).json({
      success: false,
      message: '取消预约失败',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
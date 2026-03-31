/**
 * Admin Routes
 * 管理员相关API路由
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../database/init');

/**
 * 中间件：验证管理员权限
 */
const verifyAdmin = (req, res, next) => {
  // 这里应该有真实的认证逻辑
  // 目前简化处理，直接放行
  next();
};

/**
 * GET /api/admin/dashboard
 * 获取仪表盘统计数据
 */
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const db = getInstance();

    // 总课程数
    const totalCourses = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM courses', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 总预约数
    const totalBookings = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 总用户数
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 今日新增预约
    const todayBookings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = DATE("now")',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 最近7天的预约趋势
    const weeklyTrend = await new Promise((resolve, reject) => {
      const sql = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bookings
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 各分类课程数量
    const categoryDistribution = await new Promise((resolve, reject) => {
      const sql = `
        SELECT ca.name, COUNT(c.id) as count
        FROM categories ca
        LEFT JOIN courses c ON ca.id = c.category_id
        GROUP BY ca.id
        ORDER BY count DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalCourses,
          totalBookings,
          totalUsers,
          todayBookings
        },
        trends: {
          weekly: weeklyTrend,
          categories: categoryDistribution
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

/**
 * GET /api/admin/courses
 * 获取所有课程（管理员视图）
 */
router.get('/courses', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let conditions = [];
    let params = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const db = getInstance();

    // 查询总数
    const countResult = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as total FROM courses ${whereClause}`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 查询课程列表
    const courses = await new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, ca.name as category_name,
               u.nickname as creator_name
        FROM courses c
        LEFT JOIN categories ca ON c.category_id = ca.id
        LEFT JOIN users u ON c.created_by = u.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      list: courses,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin courses error:', error);
    res.status(500).json({ success: false, message: '获取课程列表失败' });
  }
});

/**
 * POST /api/admin/courses
 * 创建新课程
 */
router.post('/courses', verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      teacher,
      location,
      startTime,
      endTime,
      capacity,
      price,
      image
    } = req.body;

    // 参数验证
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '课程名称不能为空' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: '开始时间和结束时间是必填项' });
    }

    // 类型转换
    const parsedCategoryId = categoryId ? parseInt(categoryId) : null;
    const parsedCapacity = capacity ? parseInt(capacity) : 50;
    const parsedPrice = price ? parseFloat(price) : 0;

    const db = getInstance();

    await new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO courses (
          title, description, category_id, teacher, location,
          start_time, end_time, capacity, price, image, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
      `;
      
      const params = [
        title.trim(),
        description || '',
        parsedCategoryId,
        teacher || '',
        location || '',
        startTime,
        endTime,
        parsedCapacity,
        parsedPrice,
        image || ''
      ];

      db.run(sql, params, function(err) {
        if (err) {
          console.error('Database error inserting course:', err);
          reject(err);
        } else {
          console.log('Course created successfully with ID:', this.lastID);
          resolve(this.lastID);
        }
      });
    });

    res.json({ success: true, message: '课程创建成功' });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: '创建课程失败: ' + error.message
    });
  }
});

/**
 * PUT /api/admin/courses/:id
 * 更新课程信息
 */
router.put('/courses/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const fieldsToUpdate = {};
    const allowedFields = ['title', 'description', 'category_id', 'teacher', 'location', 
                           'start_time', 'end_time', 'capacity', 'price', 'image', 'status'];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        fieldsToUpdate[key] = req.body[key];
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: '没有提供任何更新的字段' });
    }

    const db = getInstance();

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = Object.values(fieldsToUpdate);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE courses SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '课程更新成功' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: '更新课程失败' });
  }
});

/**
 * DELETE /api/admin/courses/:id
 * 删除课程
 */
router.delete('/courses/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getInstance();

    // 先删除关联的预约记录
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM bookings WHERE course_id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 再删除课程
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM courses WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: '课程删除成功' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: '删除课程失败' });
  }
});

/**
 * GET /api/admin/bookings
 * 获取所有预约记录
 */
router.get('/bookings', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, courseId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let conditions = [];
    let params = [];

    if (status) {
      conditions.push("b.status = ?");
      params.push(status);
    }

    if (courseId) {
      conditions.push("b.course_id = ?");
      params.push(parseInt(courseId));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const db = getInstance();

    // 查询总数
    const countResult = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as total FROM bookings b ${whereClause}`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 查询预约列表
    const bookings = await new Promise((resolve, reject) => {
      const sql = `
        SELECT b.*,
               u.nickname as user_nickname,
               u.phone as user_phone,
               c.title as course_title,
               c.start_time as course_start_time,
               c.end_time as course_end_time
        FROM bookings b
        INNER JOIN users u ON b.user_id = u.id
        INNER JOIN courses c ON b.course_id = c.id
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `;
      db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      list: bookings,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ success: false, message: '获取预约记录失败' });
  }
});

/**
 * GET /api/admin/users
 * 获取用户列表
 */
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const db = getInstance();

    // 查询总数
    const countResult = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM users', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 查询用户列表及其预约统计
    const users = await new Promise((resolve, reject) => {
      const sql = `
        SELECT u.*,
               (SELECT COUNT(*) FROM bookings WHERE user_id = u.id AND status = 'confirmed') as booking_count
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      list: users,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

module.exports = router;
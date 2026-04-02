/**
 * Courses Routes
 * 课程相关API路由
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
 * GET /api/courses/list
 * 获取课程列表（支持分页、分类过滤、关键字搜索）
 */
router.get('/list', async (req, res) => {
  console.log('\n========== [/api/courses/list] 请求开始 ==========');
  const startTime = Date.now();
  
  try {
    const { page = 1, pageSize = 10, categoryId, keyword } = req.query;
    console.log('[INFO] 请求参数:', { page, pageSize, categoryId, keyword });
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let conditions = [];
    let params = [];

    // 只显示已发布的课程
    conditions.push("c.status = ?");
    params.push('published');

    // 分类过滤
    if (categoryId && categoryId != 0) {
      conditions.push("c.category_id = ?");
      params.push(parseInt(categoryId));
    }

    // 关键字搜索
    if (keyword && keyword.trim()) {
      conditions.push("(c.title LIKE ? OR c.description LIKE ?)");
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    console.log('[SQL] WHERE子句:', whereClause);

    const db = getDbConnection();
    
    if (!db) {
      console.error('[ERROR] 无法获取数据库连接');
      throw new Error('数据库连接失败');
    }

    // 查询总数
    console.log('[STEP 1] 查询课程总数...');
    const countResult = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as total FROM courses c ${whereClause}`, params, (err, row) => {
        if (err) {
          console.error('[DB ERROR] 查询总数失败:', err);
          reject(err);
        } else {
          console.log('[STEP 1 完成] 总数:', row.total);
          resolve(row);
        }
      });
    });

    // 查询课程列表
    console.log('[STEP 2] 查询课程列表...');
    const courses = await new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, ca.name as category_name,
               CASE WHEN c.booked_count >= c.capacity THEN 'full' ELSE 'available' END as availability
        FROM courses c
        LEFT JOIN categories ca ON c.category_id = ca.id
        ${whereClause}
        ORDER BY c.start_time ASC
        LIMIT ? OFFSET ?
      `;
      console.log('[SQL] 查询SQL:', sql.replace(/\s+/g, ' ').trim());
      console.log('[SQL] 参数:', [...params, limit, offset]);
      
      db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) {
          console.error('[DB ERROR] 查询课程列表失败:', err);
          reject(err);
        } else {
          console.log('[STEP 2 完成] 返回', rows.length, '条记录');
          resolve(rows);
        }
      });
    });

    const responseData = {
      success: true,
      list: courses,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
    
    const elapsed = Date.now() - startTime;
    console.log(`[/api/courses/list] 请求完成 ✓ 耗时: ${elapsed}ms`);
    console.log('===============================================\n');
    
    res.json(responseData);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/courses/list] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('===============================================\n');
    
    res.status(500).json({
      success: false,
      message: '获取课程列表失败',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/courses/:id/detail
 * 获取单个课程详情
 */
router.get('/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDbConnection();

    const course = await new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, ca.name as category_name
        FROM courses c
        LEFT JOIN categories ca ON c.category_id = ca.id
        WHERE c.id = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Get course detail error:', error);
    res.status(500).json({ success: false, message: '获取课程详情失败' });
  }
});

/**
 * POST /api/courses/search
 * 高级搜索课程
 */
router.post('/search', async (req, res) => {
  try {
    const { filters } = req.body;
    const { categoryId, dateFrom, dateTo, maxPrice, sortBy = 'start_time' } = filters || {};

    let conditions = ["status = ?", "capacity > booked_count"];
    let params = ['published'];

    if (categoryId && categoryId != 0) {
      conditions.push("category_id = ?");
      params.push(parseInt(categoryId));
    }

    if (dateFrom) {
      conditions.push("DATE(start_time) >= DATE(?)");
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push("DATE(start_time) <= DATE(?)");
      params.push(dateTo);
    }

    if (maxPrice !== undefined) {
      conditions.push("price <= ?");
      params.push(parseFloat(maxPrice));
    }

    const whereClause = conditions.join(' AND ');
    const orderByClause = sortBy === 'price_asc' ? 'ORDER BY price ASC' :
                          sortBy === 'price_desc' ? 'ORDER BY price DESC' :
                          'ORDER BY start_time ASC';

    const db = getDbConnection();

    const courses = await new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, ca.name as category_name
        FROM courses c
        LEFT JOIN categories ca ON c.category_id = ca.id
        WHERE ${whereClause}
        ${orderByClause}
      `;
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, list: courses });
  } catch (error) {
    console.error('Search courses error:', error);
    res.status(500).json({ success: false, message: '搜索课程失败' });
  }
});

/**
 * GET /api/categories
 * 获取所有分类
 */
router.get('/categories/all', async (req, res) => {
  try {
    const db = getDbConnection();

    const categories = await new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM categories ORDER BY sort_order ASC';
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, list: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: '获取分类列表失败' });
  }
});

module.exports = router;
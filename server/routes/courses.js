/**
 * Courses Routes
 * 课程相关API路由
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../database/init');

/**
 * GET /api/courses/list
 * 获取课程列表（支持分页、分类过滤、关键字搜索）
 */
router.get('/list', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, categoryId, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let conditions = [];
    let params = [];

    // 只显示已发布的课程
    conditions.push("status = ?");
    params.push('published');

    // 分类过滤
    if (categoryId && categoryId != 0) {
      conditions.push("category_id = ?");
      params.push(parseInt(categoryId));
    }

    // 关键字搜索
    if (keyword && keyword.trim()) {
      conditions.push("(title LIKE ? OR description LIKE ?)");
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm);
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
               CASE WHEN c.booked_count >= c.capacity THEN 'full' ELSE 'available' END as availability
        FROM courses c
        LEFT JOIN categories ca ON c.category_id = ca.id
        ${whereClause}
        ORDER BY c.start_time ASC
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
    console.error('Get courses list error:', error);
    res.status(500).json({ success: false, message: '获取课程列表失败' });
  }
});

/**
 * GET /api/courses/:id/detail
 * 获取单个课程详情
 */
router.get('/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getInstance();

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

    const db = getInstance();

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
    const db = getInstance();

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
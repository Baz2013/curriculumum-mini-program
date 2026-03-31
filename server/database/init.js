/**
 * Database Initialization Module
 * 用于初始化SQLite数据库和相关表结构
 */

const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor(dbPath = './database.sqlite') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database.');
      }
    });

    // 使其支持Promise
    this.db.runAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    };

    this.db.allAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };
  }

  /**
   * 初始化数据库表结构
   */
  async initializeTables() {
    console.log('Initializing database tables...');
    
    // 创建用户表
    await this.createTable(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openid TEXT UNIQUE NOT NULL,
        nickname TEXT,
        avatar_url TEXT,
        phone TEXT,
        email TEXT,
        role TEXT DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // 创建课程分类表
    await this.createTable(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // 创建课程表
    await this.createTable(
      `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        teacher TEXT,
        location TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        capacity INTEGER DEFAULT 50,
        booked_count INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        image TEXT,
        status TEXT DEFAULT 'published',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`
    );

    // 创建预约表
    await this.createTable(
      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        status TEXT DEFAULT 'confirmed',
        check_in_status TEXT DEFAULT 'unchecked',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        UNIQUE(user_id, course_id)
      )`
    );

    // 创建索引以提高查询性能
    await this.createIndex('idx_courses_category', 'courses(category_id)');
    await this.createIndex('idx_courses_start_time', 'courses(start_time)');
    await this.createIndex('idx_bookings_user', 'bookings(user_id)');
    await this.createIndex('idx_bookings_course', 'bookings(course_id)');
    await this.createIndex('idx_users_openid', 'users(openid)');

    console.log('All tables initialized successfully!');
  }

  /**
   * 创建表的辅助方法
   */
  createTable(createSQL) {
    return new Promise((resolve, reject) => {
      this.db.run(createSQL, (err) => {
        if (err) {
          console.error(`Error creating table:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 创建索引的辅助方法
   */
  createIndex(indexName, columns) {
    return new Promise((resolve, reject) => {
      const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${columns}`;
      this.db.run(sql, (err) => {
        if (err) {
          console.warn(`Warning creating index ${indexName}:`, err.message);
          resolve(); // 不阻塞执行
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 插入示例数据
   */
  async insertSampleData() {
    console.log('Inserting sample data...');

    // 检查是否已有数据
    const categoryCount = await this.db.allAsync('SELECT COUNT(*) as count FROM categories');
    if (categoryCount[0].count > 0) {
      console.log('Sample data already exists, skipping insertion.');
      return;
    }

    // 插入分类数据
    const categories = [
      { name: '编程技术', description: '各类编程语言和技术培训' },
      { name: '设计创意', description: '平面设计、UI/UX设计等' },
      { name: '语言学习', description: '外语培训和口才训练' },
      { name: '职业技能', description: '办公软件、项目管理等' },
      { name: '兴趣爱好', description: '音乐、绘画、运动等' }
    ];

    for (const cat of categories) {
      await this.db.runAsync(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [cat.name, cat.description]
      );
    }

    // 插入示例课程
    const courses = [
      {
        title: 'Python零基础入门到精通',
        description: '从零开始学Python，掌握核心语法与实战技能',
        category_id: 1,
        teacher: '张老师',
        location: '线上直播',
        start_time: '2024-04-15 19:00:00',
        end_time: '2024-04-15 21:00:00',
        capacity: 50,
        price: 199
      },
      {
        title: 'UI设计实战训练营',
        description: '学习现代UI设计理念与实践技巧',
        category_id: 2,
        teacher: '李设计师',
        location: '教室201',
        start_time: '2024-04-16 14:00:00',
        end_time: '2024-04-16 17:00:00',
        capacity: 30,
        price: 299
      },
      {
        title: '商务英语口语提升班',
        description: '快速提升职场英语沟通能力',
        category_id: 3,
        teacher: '王教授',
        location: '语音室305',
        start_time: '2024-04-17 10:00:00',
        end_time: '2024-04-17 12:00:00',
        capacity: 20,
        price: 350
      },
      {
        title: '数据分析与可视化',
        description: 'Excel高级应用与Power BI实践',
        category_id: 4,
        teacher: '赵分析师',
        location: '机房102',
        start_time: '2024-04-18 13:30:00',
        end_time: '2024-04-18 16:30:00',
        capacity: 40,
        price: 250
      },
      {
        title: '摄影艺术鉴赏与实践',
        description: '发现生活中的美，用镜头记录精彩瞬间',
        category_id: 5,
        teacher: '陈摄影师',
        location: '户外基地',
        start_time: '2024-04-19 09:00:00',
        end_time: '2024-04-19 11:30:00',
        capacity: 15,
        price: 180
      }
    ];

    for (const course of courses) {
      await this.db.runAsync(
        `INSERT INTO courses (title, description, category_id, teacher, location, 
                              start_time, end_time, capacity, price) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [course.title, course.description, course.category_id, course.teacher, 
         course.location, course.start_time, course.end_time, course.capacity, course.price]
      );
    }

    console.log('Sample data inserted successfully!');
  }

  /**
   * 获取数据库实例
   */
  getConnection() {
    return this.db;
  }

  /**
   * 关闭数据库连接
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed.');
          resolve();
        }
      });
    });
  }
}

// 单例模式导出
let dbInstance = null;

async function initializeDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
    await dbInstance.initializeTables();
    await dbInstance.insertSampleData();
  }
  return dbInstance.getConnection();
}

module.exports = {
  initializeDatabase,
  getInstance: () => dbInstance
};
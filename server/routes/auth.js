/**
 * Authentication Routes
 * 处理用户注册、登录、审批等相关功能
 */

const router = require('express').Router();

// 辅助函数：获取数据库连接
const getDbConnection = () => {
  const { getInstance } = require('../database/init');
  const dbInstance = getInstance();
  return dbInstance ? dbInstance.getConnection() : null;
};

/**
 * POST /api/register
 * 用户注册（提交注册申请）
 */
router.post('/register', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { nickname, phone, email, reason, shareCode } = req.body;

    // 参数验证
    if (!nickname) {
      return res.status(400).json({ error: '昵称为必填项' });
    }

    // 生成唯一的share code
    const generateShareCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const newShareCode = shareCode || generateShareCode();

    // 检查phone/email是否已被注册
    if (phone) {
      const existingPhone = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM registrations WHERE phone = ?', [phone], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingPhone) {
        return res.status(400).json({ error: '该手机号已被注册' });
      }
    }

    if (email) {
      const existingEmail = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM registrations WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingEmail) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
    }

    // 插入注册申请
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO registrations (nickname, phone, email, reason, share_code, registration_source) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nickname, phone, email, reason, newShareCode, 'mini_program'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.json({
      success: true,
      message: '注册申请已提交，请耐心等待管理员审核',
      shareCode: newShareCode
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * GET /api/pending-registrations
 * 获取待审批的注册列表（管理员专用）
 */
router.get('/pending-registrations', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const registrations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, u.nickname as approver_nickname 
         FROM registrations r 
         LEFT JOIN users u ON r.approved_by = u.id 
         WHERE r.approval_status = 'pending' 
         ORDER BY r.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(registrations);

  } catch (error) {
    console.error('获取待审批列表失败:', error);
    res.status(500).json({ error: '获取列表失败' });
  }
});

/**
 * PUT /api/approve-registration/:id
 * 审批注册申请（管理员专用）
 */
router.put('/approve-registration/:id', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    const regId = req.params.id;
    const adminUserId = req.user?.id || 1; // 默认第一个管理员

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的操作' });
    }

    // 获取注册信息
    const registration = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM registrations WHERE id = ?', [regId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!registration) {
      return res.status(404).json({ error: '注册申请不存在' });
    }

    if (registration.approval_status !== 'pending') {
      return res.status(400).json({ error: '该申请已经被处理过了' });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 同意：将注册信息转移到users表
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE registrations 
           SET approval_status = 'approved', 
               approved_by = ?, 
               approved_at = ?
           WHERE id = ?`,
          [adminUserId, now, regId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({
        success: true,
        message: '已同意该注册申请'
      });

    } else {
      // 拒绝
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE registrations 
           SET approval_status = 'rejected', 
               approved_by = ?, 
               approved_at = ?,
               rejection_reason = ?
           WHERE id = ?`,
          [adminUserId, now, reason || '', regId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({
        success: true,
        message: '已拒绝该注册申请'
      });
    }

  } catch (error) {
    console.error('审批失败:', error);
    res.status(500).json({ error: '审批失败，请稍后重试' });
  }
});

/**
 * POST /api/bind-wechat
 * 绑定微信OpenID（用户扫码登录时调用）
 */
router.post('/bind-wechat', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { shareCode, openid, nickname, avatarUrl } = req.body;

    if (!shareCode || !openid) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 查找匹配的注册记录
    const registration = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM registrations WHERE share_code = ? AND approval_status = ?',
        [shareCode, 'approved'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!registration) {
      return res.status(404).json({ error: '找不到有效的注册信息' });
    }

    // 检查是否已经绑定过
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.json({
        success: true,
        userId: existingUser.id,
        nickname: existingUser.nickname,
        role: existingUser.role,
        message: '登录成功'
      });
    }

    // 创建新用户并绑定openid
    const userId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (openid, nickname, avatar_url, phone, email, role, approval_status, share_code, referrer_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          openid,
          nickname || registration.nickname,
          avatarUrl || '',
          registration.phone,
          registration.email,
          'student',
          'approved',
          registration.share_code,
          registration.referrer_id
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.json({
      success: true,
      userId,
      nickname: nickname || registration.nickname,
      role: 'student',
      message: '绑定成功，登录成功'
    });

  } catch (error) {
    console.error('绑定微信失败:', error);
    res.status(500).json({ error: '绑定失败，请稍后重试' });
  }
});

/**
 * GET /api/check-share-code/:code
 * 检查分享码有效性（用于分享约课）
 */
router.get('/check-share-code/:code', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const code = req.params.code;

    // 查找分享码对应的用户
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, nickname, avatar_url FROM users WHERE share_code = ? AND approval_status = ?',
        [code, 'approved'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (user) {
      res.json({
        valid: true,
        sharer: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatar_url
        }
      });
    } else {
      res.json({
        valid: false,
        message: '分享码无效'
      });
    }

  } catch (error) {
    console.error('检查分享码失败:', error);
    res.status(500).json({ error: '检查失败' });
  }
});

/**
 * GET /api/all-users
 * 获取所有用户列表（管理员专用）
 */
router.get('/all-users', async (req, res) => {
  const db = getDbConnection();
  if (!db) {
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.*, 
                (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as booking_count
         FROM users u 
         ORDER BY u.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(users);

  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取列表失败' });
  }
});

module.exports = router;
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
 * 包括两部分：
 * 1. registrations表中approval_status=pending的传统注册申请
 * 2. users表中approval_status=pending的一键登录用户
 */
router.get('/pending-registrations', async (req, res) => {
  console.log('\n========== [/api/pending-registrations] 请求开始 ==========');
  const startTime = Date.now();
  
  const db = getDbConnection();
  if (!db) {
    console.error('[ERROR] 数据库连接失败');
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    // 查询传统注册申请
    console.log('[STEP 1] 查询传统注册申请...');
    const traditionalRegs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, u.nickname as approver_nickname, 'traditional' as source_type
         FROM registrations r
         LEFT JOIN users u ON r.approved_by = u.id
         WHERE r.approval_status = 'pending'
         ORDER BY r.created_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            console.error('[DB ERROR] 查询传统注册申请失败:', err);
            reject(err);
          } else {
            console.log('[STEP 1 完成] 传统注册申请:', rows.length, '条');
            resolve(rows);
          }
        }
      );
    });

    // 查询一键登录的待审批用户
    console.log('[STEP 2] 查询一键登录待审用户...');
    const quickLogins = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.*, 'quick_login' as source_type
         FROM users u
         WHERE u.approval_status = 'pending'
         ORDER BY u.created_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            console.error('[DB ERROR] 查询一键登录用户失败:', err);
            reject(err);
          } else {
            console.log('[STEP 2 完成] 一键登录用户:', rows.length, '条');
            resolve(rows);
          }
        }
      );
    });

    // 合并结果，转换为统一格式
    const mergedResults = [
      ...traditionalRegs.map(r => ({
        id: r.id,
        nickname: r.nickname,
        phone: r.phone,
        email: r.email,
        reason: r.reason,
        created_at: r.created_at,
        approval_status: r.approval_status,
        source_type: r.source_type,
        extra_info: {
          registration_source: r.registration_source,
          share_code: r.share_code
        }
      })),
      ...quickLogins.map(u => ({
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        email: u.email,
        reason: '一键登录注册',
        created_at: u.created_at,
        approval_status: u.approval_status,
        source_type: u.source_type,
        extra_info: {
          avatar_url: u.avatar_url,
          share_code: u.share_code,
          registration_source: u.registration_source
        }
      }))
    ];

    // 按创建时间排序
    mergedResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const elapsed = Date.now() - startTime;
    console.log(`[/api/pending-registrations] 请求完成 ✓ 总数: ${mergedResults.length}, 耗时: ${elapsed}ms`);
    console.log('=============================================================\n');

    res.json(mergedResults);

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/pending-registrations] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('=============================================================\n');
    
    res.status(500).json({ error: '获取列表失败' });
  }
});

/**
 * PUT /api/approve-registration/:id
 * 审批注册申请（管理员专用）
 * 支持两种类型的审批：
 * 1. 传统注册申请（registrations表）
 * 2. 一键登录用户（users表）
 */
router.put('/approve-registration/:id', async (req, res) => {
  console.log('\n========== [/api/approve-registration/:id] 请求开始 ==========');
  const startTime = Date.now();
  
  const db = getDbConnection();
  if (!db) {
    console.error('[ERROR] 数据库连接失败');
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { action, reason, sourceType } = req.body; // action: 'approve' | 'reject', sourceType: 'traditional' | 'quick_login'
    const regId = req.params.id;
    const adminUserId = req.user?.id || 1; // 默认第一个管理员

    console.log('[INFO] 审批参数:', { id: regId, action, sourceType });

    if (!['approve', 'reject'].includes(action)) {
      console.warn('[WARN] 无效的操作');
      return res.status(400).json({ error: '无效的操作' });
    }

    const now = new Date().toISOString();

    // 判断是传统注册还是一键登录
    if (sourceType === 'quick_login') {
      // 处理一键登录用户的审批
      console.log('[TYPE] 一键登录用户审批');
      
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [regId], (err, row) => {
          if (err) {
            console.error('[DB ERROR] 查询用户失败:', err);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
      
      console.log('[QUERY RESULT] 用户:', user ? '找到' : '未找到');

      if (!user) {
        console.warn('[WARN] 用户不存在');
        return res.status(404).json({ error: '用户不存在' });
      }

      if (user.approval_status !== 'pending') {
        console.warn('[WARN] 该用户已经被处理过了');
        return res.status(400).json({ error: '该用户已经被处理过了' });
      }

      if (action === 'approve') {
        console.log('[ACTION] 批准用户');
        
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users
             SET approval_status = 'approved',
                 approved_by = ?,
                 approved_at = ?
             WHERE id = ?`,
            [adminUserId, now, regId],
            (err) => {
              if (err) {
                console.error('[DB ERROR] 更新用户状态失败:', err);
                reject(err);
              } else {
                console.log('[SUCCESS] 用户状态更新成功');
                resolve();
              }
            }
          );
        });

        res.json({
          success: true,
          message: '已批准该用户'
        });

      } else {
        console.log('[ACTION] 拒绝用户');
        
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users
             SET approval_status = 'rejected',
                 approved_by = ?,
                 approved_at = ?,
                 rejection_reason = ?
             WHERE id = ?`,
            [adminUserId, now, reason || '', regId],
            (err) => {
              if (err) {
                console.error('[DB ERROR] 更新用户状态失败:', err);
                reject(err);
              } else {
                console.log('[SUCCESS] 用户状态更新成功');
                resolve();
              }
            }
          );
        });

        res.json({
          success: true,
          message: '已拒绝该用户'
        });
      }

    } else {
      // 处理传统注册申请的审批
      console.log('[TYPE] 传统注册申请审批');
      
      const registration = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM registrations WHERE id = ?', [regId], (err, row) => {
          if (err) {
            console.error('[DB ERROR] 查询注册申请失败:', err);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
      
      console.log('[QUERY RESULT] 注册申请:', registration ? '找到' : '未找到');

      if (!registration) {
        console.warn('[WARN] 注册申请不存在');
        return res.status(404).json({ error: '注册申请不存在' });
      }

      if (registration.approval_status !== 'pending') {
        console.warn('[WARN] 该申请已经被处理过了');
        return res.status(400).json({ error: '该申请已经被处理过了' });
      }

      if (action === 'approve') {
        console.log('[ACTION] 批准注册申请');
        
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
              if (err) {
                console.error('[DB ERROR] 更新注册申请失败:', err);
                reject(err);
              } else {
                console.log('[SUCCESS] 注册申请状态更新成功');
                resolve();
              }
            }
          );
        });

        res.json({
          success: true,
          message: '已同意该注册申请'
        });

      } else {
        console.log('[ACTION] 拒绝注册申请');
        
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
              if (err) {
                console.error('[DB ERROR] 更新注册申请失败:', err);
                reject(err);
              } else {
                console.log('[SUCCESS] 注册申请状态更新成功');
                resolve();
              }
            }
          );
        });

        res.json({
          success: true,
          message: '已拒绝该注册申请'
        });
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[/api/approve-registration/:id] 请求完成 ✓ 耗时: ${elapsed}ms`);
    console.log('================================================================\n');

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/api/approve-registration/:id] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR DETAILS]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    console.error('================================================================\n');
    
    res.status(500).json({ error: '审批失败，请稍后重试' });
  }
});

/**
 * POST /api/auto-login
 * 自动登录（新用户自动注册，老用户直接登录）
 */
router.post('/auto-login', async (req, res) => {
  const startTime = Date.now();
  console.log('\n========== [/auto-login] 请求开始 ==========');
  
  const db = getDbConnection();
  if (!db) {
    console.error('[ERROR] 数据库连接失败');
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    const { code, userInfo, shareCode } = req.body;
    console.log('[INFO] 收到的参数:');
    console.log('  - code:', code ? code.substring(0, 10) + '...' : '(空)');
    console.log('  - userInfo nickName:', userInfo?.nickName || '(空)');
    console.log('  - shareCode:', shareCode || '(无)');

    if (!code || !userInfo) {
      console.warn('[WARN] 缺少必要参数');
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 注意：这里简化处理，实际应用中应该用code换取真实的openid
    // 由于这是演示项目，我们直接使用code作为openid的唯一标识
    const openid = `WX_${code}`;
    console.log('[STEP 1] 生成的openid:', openid);

    // 检查用户是否存在
    console.log('[STEP 2] 查询现有用户...');
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
        if (err) {
          console.error('[DB ERROR] 查询用户失败:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    console.log('[STEP 2 完成] 查询结果:', existingUser ? '找到用户' : '新用户');

    let user;
    let isNewUser = false;

    if (existingUser) {
      // 老用户，直接返回
      console.log('[INFO] 老用户登录');
      user = existingUser;
    } else {
      // 新用户，自动创建账户（待审批状态）
      console.log('[INFO] 新用户注册流程开始');
      isNewUser = true;
      
      // 生成唯一分享码
      console.log('[STEP 3] 生成唯一分享码...');
      const generateUniqueShareCode = async () => {
        let code;
        let attempts = 0;
        while (attempts < 10) {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const exists = await new Promise((resolve) => {
            db.get('SELECT id FROM users WHERE share_code = ?', [code], (err, row) => {
              resolve(!!row);
            });
          });
          if (!exists) return code;
          attempts++;
        }
        return code;
      };

      const newUserShareCode = await generateUniqueShareCode();
      console.log('[STEP 3 完成] 分享码:', newUserShareCode);

      // 处理推荐人
      console.log('[STEP 4] 处理推荐关系...');
      let referrerId = null;
      if (shareCode) {
        const referrer = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM users WHERE share_code = ? AND approval_status = ?',
            [shareCode, 'approved'],
            (err, row) => {
              if (err) {
                console.error('[DB ERROR] 查询推荐人失败:', err);
                reject(err);
              } else {
                resolve(row);
              }
            }
          );
        });
        if (referrer) {
          referrerId = referrer.id;
          console.log('[STEP 4 完成] 找到推荐人 ID:', referrerId);
        } else {
          console.log('[STEP 4 完成] 无有效推荐人或推荐人未通过审核');
        }
      } else {
        console.log('[STEP 4 完成] 无分享码');
      }

      // 创建新用户
      console.log('[STEP 5] 创建新用户记录...');
      const userData = [
        openid,
        userInfo.nickName || '微信用户',
        userInfo.avatarUrl || '',
        'student',
        'pending', // 新用户默认为待审批状态
        newUserShareCode,
        referrerId,
        'mini_program'
      ];
      console.log('[STEP 5] 用户数据:', {
        openid: openid.substring(0, 20),
        nickname: userData[1],
        role: userData[3]
      });
      
      const userId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (openid, nickname, avatar_url, role, approval_status, share_code, referrer_id, registration_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          userData,
          function(err) {
            if (err) {
              console.error('[DB ERROR] 插入用户失败:', err);
              reject(err);
            } else {
              console.log('[STEP 5 完成] 用户插入成功, ID:', this.lastID);
              resolve(this.lastID);
            }
          }
        );
      });

      // 获取刚创建的用户信息
      console.log('[STEP 6] 获取新用户信息...');
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
          if (err) {
            console.error('[DB ERROR] 查询新用户失败:', err);
            reject(err);
          } else {
            console.log('[STEP 6 完成] 用户信息查询成功');
            resolve(row);
          }
        });
      });
    }

    // 生成JWT token（简单实现，生产环境应使用jsonwebtoken）
    console.log('[STEP 7] 生成Token...');
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      openid: user.openid,
      timestamp: Date.now()
    })).toString('base64');

    const responseData = {
      success: true,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        role: user.role,
        approvalStatus: user.approval_status,
        shareCode: user.share_code,
        createdAt: user.created_at
      },
      isNewUser,
      message: isNewUser ? '账户已创建，请等待管理员审批' : '登录成功'
    };
    
    const elapsed = Date.now() - startTime;
    console.log(`[/auto-login] 请求完成 ✓ 总耗时: ${elapsed}ms`);
    console.log('=============================================\n');
    
    res.json(responseData);

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[/auto-login] 请求失败 ✗ 耗时: ${elapsed}ms`);
    console.error('[ERROR STACK]:', error.stack);
    console.error('[ERROR MESSAGE]:', error.message);
    console.error('[ERROR CODE]:', error.code);
    console.error('=============================================\n');
    
    res.status(500).json({
      error: '登录失败，请稍后重试',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
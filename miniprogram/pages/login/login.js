// login.js
const app = getApp()

Page({
  data: {
    shareCode: '',
    currentUser: null,
    approvalStatus: '', // 'pending', 'approved', 'rejected', ''
    showWaitingCard: false
  },

  onLoad(options) {
    // 检查是否有传入的分享码
    if (options.shareCode) {
      this.setData({ shareCode: options.shareCode })
    }
    
    // 检查是否有缓存的分享码
    const tempShareCode = wx.getStorageSync('tempShareCode')
    if (tempShareCode) {
      this.setData({ shareCode: tempShareCode })
    }
    
    // 检查是否已登录且已审批
    if (app.globalData.token && app.globalData.userInfo) {
      this.checkUserStatus(app.globalData.userInfo)
    }
  },

  /**
   * 获取微信用户信息
   */
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      // 用户同意授权
      this.handleAutoLogin(e.detail.userInfo)
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none'
      })
    }
  },

  /**
   * 自动登录（新用户自动注册，老用户直接登录）
   */
  async handleAutoLogin(userInfo) {
    app.showLoading('登录中...')
    
    try {
      console.log('[登录流程开始]')
      console.log('[步骤1] 开始获取微信登录code')
      
      // 先执行微信登录获取code
      const loginResult = await this.weixinLogin()
      console.log('[步骤1完成] 成功获取微信code:', loginResult.code.substring(0, 10) + '***')
      
      console.log('[步骤2] 准备发送登录请求到后端')
      console.log('[请求参数] 分享码:', this.data.shareCode || '(无)')
      
      // 调用后端自动登录接口，设置较长的超时时间以适应云函数+CVM的多层架构
      const result = await app.request({
        url: '/auto-login',
        method: 'POST',
        data: {
          code: loginResult.code,
          userInfo: userInfo,
          shareCode: this.data.shareCode
        },
        timeout: 80000 // 登录请求特别设置为80秒，因为涉及数据库操作和多级代理
      })
      
      console.log('[步骤2完成] 后端登录请求成功')

      // 保孔回复的信息
      app.globalData.token = result.token
      app.globalData.userInfo = result.user
      
      // 缓存token
      wx.setStorageSync('token', result.token)
      wx.setStorageSync('userInfo', result.user)
      
      // 清除临时的分享码
      wx.removeStorageSync('tempShareCode')

      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 根据用户状态跳转
      setTimeout(() => {
        this.checkUserStatus(result.user)
      }, 1500)

    } catch (error) {
      console.error('[登录失败详情]:', {
        message: error.message,
        errMsg: error.errMsg,
        statusCode: error.statusCode,
        data: error.data
      })
      
      wx.hideLoading()
      
      // 更友好的错误提示
      let errorMessage = '登录失败，请重试'
      if (error.message && error.message.includes('timeout')) {
        errorMessage = '网络请求超时，请检查网络连接后重试'
      } else if (error.message && error.message.includes('network')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
    }
  },

  /**
   * 微信登录
   */
  weixinLogin() {
    return new Promise((resolve, reject) => {
      console.log('[wx.login] 正在调用微信登录接口...')
      wx.login({
        success: res => {
          console.log('[wx.login] 回调结果:', res)
          if (res.code) {
            console.log('[wx.login] 成功获取code')
            resolve(res)
          } else {
            console.error('[wx.login] 未返回code')
            reject(new Error('获取微信登录凭证失败'))
          }
        },
        fail: err => {
          console.error('[wx.login] 接口调用失败:', err)
          reject(err)
        }
      })
    })
  },

  /**
   * 检查用户状态并根据状态跳转
   */
  checkUserStatus(user) {
    if (!user) {
      return
    }

    // 兼容不同的字段命名方式
    const approvalStatus = user.approvalStatus || user.approval_status
    
    console.log('[用户状态检查]', {
      userId: user.id,
      approvalStatus: approvalStatus,
      nickname: user.nickname
    })

    // 首次登录或待审核状态：停留在登录页面，显示待审批卡片
    if (approvalStatus === 'pending') {
      this.setData({
        currentUser: user,
        approvalStatus: 'pending',
        showWaitingCard: true
      })
      
      wx.showToast({
        title: '账户待审核',
        icon: 'loading',
        duration: 2000
      })
      
      // 不再跳转到任何页面，保持在登录页面
      return
    }

    // 被拒绝的状态：清除凭据，让用户重新申请
    if (approvalStatus === 'rejected') {
      wx.showModal({
        title: '账户未通过审核',
        content: user.rejection_reason || '很抱歉，您的账户未能通过审核。如需帮助请联系客服。',
        showCancel: false,
        success: () => {
          // 清除本地存储的认证信息
          app.globalData.token = ''
          app.globalData.userInfo = null
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          
          // 重置页面状态回到初始登录界面
          this.setData({
            currentUser: null,
            approvalStatus: '',
            showWaitingCard: false
          })
        }
      })
      return
    }

    // 只有已批准的用户才允许进入主应用
    if (approvalStatus === 'approved') {
      wx.switchTab({
        url: '/pages/index/index'
      })
      return
    }

    // 如果没有明确的审批状态，默认不允许进入
    console.warn('[警告] 用户缺少审批状态字段:', user)
    this.setData({
      currentUser: user,
      approvalStatus: 'unknown',
      showWaitingCard: true
    })
  },

  /**
   * 手动刷新用户状态（用于待审批状态下轮询）
   */
  async refreshUserStatus() {
    if (!this.data.currentUser) {
      return
    }

    try {
      const result = await app.request({
        url: '/me',
        method: 'GET'
      })

      if (result.success && result.user) {
        console.log('[状态刷新] 最新用户状态:', result.user.approval_status)
        
        // 使用最新的用户信息重新检查状态
        app.globalData.userInfo = result.user
        wx.setStorageSync('userInfo', result.user)
        
        this.checkUserStatus(result.user)
      }
    } catch (error) {
      console.error('[状态刷新失败]', error)
      wx.showToast({
        title: '刷新失败，稍后再试',
        icon: 'none'
      })
    }
  },

  /**
   * 返回登录按钮点击事件（从待审批状态退出）
   */
  logoutAndReturn() {
    wx.showModal({
      title: '确定要退出？',
      content: '退出后将无法收到审批通知',
      success: (res) => {
        if (res.confirm) {
          // 清除所有认证信息
          app.globalData.token = ''
          app.globalData.userInfo = null
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          
          // 重置页面状态
          this.setData({
            currentUser: null,
            approvalStatus: '',
            showWaitingCard: false
          })
          
          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  }
})
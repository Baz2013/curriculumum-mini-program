// login.js
const app = getApp()

Page({
  data: {
    shareCode: ''
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

    // 检查审批状态
    if (user.approval_status === 'pending') {
      wx.showModal({
        title: '账户待审核',
        content: '您的账户正在审核中，请耐心等待管理员审批。您可以先浏览课程，但暂时不能预约。',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }
      })
      return
    }

    if (user.approval_status === 'rejected') {
      wx.showModal({
        title: '账户已被拒绝',
        content: user.rejection_reason || '您的账户未能通过审核，如有疑问请联系客服。',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }
      })
      return
    }

    // 已批准的用户可以正常使用
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
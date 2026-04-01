// login.js
const app = getApp()

Page({
  data: {
    shareCode: '',
    userInfo: null
  },

  onLoad(options) {
    // 检查是否从分享链接进入
    if (options.scene) {
      // scene可能是分享码
      this.setData({
        shareCode: decodeURIComponent(options.scene)
      })
    }

    // 检查是否已登录
    const token = wx.getStorageSync('token')
    if (token) {
      this.goToHomePage()
    }
  },

  onShareCodeInput(e) {
    this.setData({
      shareCode: e.detail.value.toUpperCase()
    })
  },

  /**
   * 获取用户信息并登录
   */
  async onGetUserInfo(e) {
    if (e.detail.errMsg !== 'getUserInfo:ok') {
      wx.showToast({
        title: '需要授权才能继续',
        icon: 'none'
      })
      return
    }

    const userInfo = e.detail.userInfo
    this.setData({ userInfo })

    try {
      // 第一步：微信登录获取code
      const loginRes = await this.wechatLogin()
      
      // 第二步：绑定微信OpenID
      await this.bindWechat(loginRes.code, userInfo)

    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 微信登录
   */
  wechatLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res)
          } else {
            reject(new Error('获取微信登录凭证失败'))
          }
        },
        fail: (err) => {
          reject(new Error('微信登录失败'))
        }
      })
    })
  },

  /**
   * 绑定微信OpenID
   */
  async bindWechat(code, userInfo) {
    wx.showLoading({ title: '登录中...' })

    try {
      // 获取缓存的分享码（如果是通过分享进入的）
      const cachedShareCode = wx.getStorageSync('temp_share_code') || ''

      const res = await app.request({
        url: '/bind-wechat',
        method: 'POST',
        data: {
          shareCode: this.data.shareCode || cachedShareCode,
          openid: code, // 这里简化处理，实际上应该用code换取openid
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      })

      // 保存用户信息和token
      wx.setStorageSync('userId', res.userId)
      wx.setStorageSync('nickname', res.nickname)
      wx.setStorageSync('role', res.role)
      wx.setStorageSync('userInfo', {
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName
      })

      // 更新全局数据
      app.globalData.userInfo = {
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName
      }

      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      })

      // 跳转到首页
      setTimeout(() => {
        this.goToHomePage()
      }, 1500)

    } catch (error) {
      wx.hideLoading()
      throw error
    }
  },

  /**
   * 手动输入分享码并验证
   */
  async verifyAndBind() {
    if (!this.data.shareCode) {
      wx.showToast({
        title: '请输入分享码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '验证中...' })

    try {
      // 检查分享码是否有效
      const res = await app.request({
        url: `/check-share-code/${this.data.shareCode}`,
        method: 'GET'
      })

      if (res.valid) {
        // 保存分享码到缓存
        wx.setStorageSync('temp_share_code', this.data.shareCode)
        
        wx.hideLoading()
        wx.showModal({
          title: '分享码有效',
          content: `来自 ${res.sharer.nickname} 的邀请，请点击下方"微信授权登录"完成绑定`,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: res.message || '分享码无效',
          icon: 'none'
        })
      }

    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '验证失败，请检查分享码',
        icon: 'none'
      })
    }
  },

  /**
   * 跳转到首页
   */
  goToHomePage() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  /**
   * 跳转到注册页
   */
  goToRegister() {
    wx.redirectTo({
      url: '/pages/register/register'
    })
  }
})
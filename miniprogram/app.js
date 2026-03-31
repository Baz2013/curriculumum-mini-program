// app.js
App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'http://localhost:3000/api'
  },

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 从缓存中获取token
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }

    // 登录
    wx.login({
      success: res => {
        console.log('wx.login成功:', res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },

  /**
   * 封装网络请求方法
   */
  request(options) {
    const { url, data, method = 'GET', header = {} } = options
    
    // 设置统一的header
    const headers = {
      ...header,
      'Content-Type': 'application/json',
      'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : ''
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}${url}`,
        data: data,
        method: method,
        header: headers,
        success(res) {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            // 未授权，跳转到登录页
            wx.showToast({
              title: '请先登录',
              icon: 'none'
            })
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            }, 1500)
            reject(new Error('未授权'))
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            })
            reject(new Error(res.data.message || '请求失败'))
          }
        },
        fail(err) {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
          reject(err)
        }
      })
    })
  },

  /**
   * 显示加载提示
   */
  showLoading(title = '加载中...') {
    wx.showLoading({ title, mask: true })
  },

  /**
   * 隐藏加载提示
   */
  hideLoading() {
    wx.hideLoading()
  }
})
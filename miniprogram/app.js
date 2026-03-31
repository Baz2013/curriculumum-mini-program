// app.js
App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'http://43.167.225.6:3000/api'
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
    const { url, data, method = 'GET', header = {}, timeout = 10000 } = options
    
    // 设置统一的header
    const headers = {
      ...header,
      'Content-Type': 'application/json',
      'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : ''
    }

    return new Promise((resolve, reject) => {
      // 设置请求超时计时器
      const timer = setTimeout(() => {
        reject(new Error('请求超时，请稍后再试'))
      }, timeout)

      wx.request({
        url: `${this.globalData.baseUrl}${url}`,
        data: data,
        method: method,
        header: headers,
        timeout: timeout,
        success(res) {
          clearTimeout(timer)
          
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
              title: res.data?.message || '请求失败',
              icon: 'none'
            })
            reject(new Error(res.data?.message || '请求失败'))
          }
        },
        fail(err) {
          clearTimeout(timer)
          
          // 区分不同的错误类型
          let errorMsg = '网络错误'
          if (err.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请检查网络连接'
          } else if (err.errMsg.includes('fail')) {
            errorMsg = '网络连接失败，请稍后重试'
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
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
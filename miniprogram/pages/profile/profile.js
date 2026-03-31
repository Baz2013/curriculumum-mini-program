// profile.js
const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      joinDate: '2024年1月'
    },
    stats: {
      totalBookings: 0,
      attendedCount: 0
    },
    studyHours: 0,
    notificationEnabled: true,
    cacheSize: '计算中...'
  },

  onLoad() {
    this.loadUserInfo()
    this.getUserStats()
    this.calculateCacheSize()
  },

  onShow() {
    // 每次显示页面都更新统计数据
    this.getUserStats()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    try {
      // 尝试从全局数据获取用户信息
      const globalUserInfo = app.globalData.userInfo
      
      if (globalUserInfo) {
        this.setData({
          'userInfo.avatarUrl': globalUserInfo.avatarUrl,
          'userInfo.nickName': globalUserInfo.nickName
        })
      } else {
        // 尝试从缓存读取
        const cachedUserInfo = wx.getStorageSync('userInfo')
        if (cachedUserInfo) {
          this.setData({
            'userInfo.avatarUrl': cachedUserInfo.avatarUrl,
            'userInfo.nickName': cachedUserInfo.nickName
          })
        }
      }
      
      // 设置加入时间为当前月份
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      this.setData({
        'userInfo.joinDate': `${year}年${month}月`
      })
      
    } catch (error) {
      console.error('加载用户信息失败:', error)
      // 使用默认值
      this.setData({
        'userInfo.nickName': '学员'
      })
    }
  },

  /**
   * 获取用户统计数据
   */
  async getUserStats() {
    try {
      const res = await app.request({
        url: '/user/stats',
        method: 'GET'
      })

      this.setData({
        stats: {
          totalBookings: res.total_bookings || 0,
          attendedCount: res.attended_count || 0
        },
        studyHours: res.study_hours || 0
      })
      
    } catch (error) {
      console.error('获取用户统计失败:', error)
      
      // 使用模拟数据
      this.setData({
        stats: {
          totalBookings: 12,
          attendedCount: 8
        },
        studyHours: 24
      })
    }
  },

  /**
   * 导航到指定页面
   */
  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.switchTab({
        url: url,
        fail: () => {
          wx.navigateTo({ url })
        }
      })
    }
  },

  /**
   * 切换通知开关
   */
  toggleNotification(e) {
    const enabled = e.detail.checked
    this.setData({ notificationEnabled: enabled })
    
    wx.showToast({
      title: enabled ? '已开启通知' : '已关闭通知',
      icon: 'none'
    })
    
    // 可以在这里调用API保存设置
  },

  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      confirmText: '清除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              this.setData({ cacheSize: '0KB' })
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
              
              // 重新初始化必要的数据
              setTimeout(() => {
                this.onLoad()
              }, 1000)
            },
            fail: () => {
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  /**
   * 计算缓存大小
   */
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeInBytes = info.currentSize
      
      // 将字节转换为更友好的单位
      let sizeText = ''
      if (sizeInBytes < 1024) {
        sizeText = sizeInBytes + 'B'
      } else if (sizeInBytes < 1048576) {
        sizeText = (sizeInBytes / 1024).toFixed(2) + 'KB'
      } else {
        sizeText = (sizeInBytes / 1048576).toFixed(2) + 'MB'
      }
      
      this.setData({ cacheSize: sizeText })
    } catch (error) {
      console.error('计算缓存大小失败:', error)
      this.setData({ cacheSize: '--' })
    }
  },

  /**
   * 显示关于弹窗
   */
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '课程预约小程序 v1.0.0\n\n致力于为您提供优质的在线教育体验，随时随地轻松预约心仪课程。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /**
   * 显示敬请期待提示
   */
  showComingSoon() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none',
      duration: 2000
    })
  }
})
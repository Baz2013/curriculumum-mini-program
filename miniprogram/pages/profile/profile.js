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
      upcomingCount: 0,
      completedCount: 0,
      attendedCount: 0
    },
    studyHours: 0,
    notificationEnabled: true,
    cacheSize: '计算中...',
    recentBookings: [],
    favoriteCategories: [],
    hasAchievement: {
      first_booking: false,
      five_courses: false,
      all_categories: false,
      streak_learner: false
    }
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
        url: '/user/bookings',
        method: 'GET'
      })

      // 处理预约数据
      const bookings = Array.isArray(res) ? res : []
      const now = new Date()

      // 统计各类别数量
      let upcomingCount = 0
      let completedCount = 0
      let totalStudyHours = 0
      const categoryCounts = {}
      const recentUpcoming = []

      bookings.forEach(booking => {
        // 安全检查：确保booking对象存在
        if (!booking) return
        
        const courseStartTime = booking.course?.start_time
        const courseEndTime = booking.course?.end_time
        const fallbackTime = booking.created_at
        
        const startTime = new Date(courseStartTime || fallbackTime)
        const endTime = new Date(courseEndTime || fallbackTime)
        
        // 统计学习时长（假设每节课平均2小时）
        if (endTime > startTime && !isNaN(endTime - startTime)) {
          const hours = (endTime - startTime) / (1000 * 60 * 60)
          totalStudyHours += hours
        }

        // 统计分类偏好
        const categoryName = booking.course?.category_name || '其他'
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1

        // 判断状态
        if (booking.status === 'cancelled') {
          // 已取消不计入
        } else if (!isNaN(startTime) && now > startTime) {
          completedCount++
        } else if (!isNaN(startTime)) {
          upcomingCount++
          // 收集最近的待参加课程（最多3个）
          if (recentUpcoming.length < 3) {
            recentUpcoming.push(this.formatBookingItem(booking))
          }
        }
      })

      // 计算学习偏好排序
      const sortedCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 计算成就
      const achievements = this.calculateAchievements(bookings, categoryCounts)

      this.setData({
        stats: {
          totalBookings: bookings.length,
          upcomingCount,
          completedCount,
          attendedCount: completedCount
        },
        studyHours: Math.round(totalStudyHours),
        recentBookings: recentUpcoming.sort((a, b) => new Date(a.full_date) - new Date(b.full_date)),
        favoriteCategories: sortedCategories,
        hasAchievement: achievements
      })
      
    } catch (error) {
      console.error('获取用户统计失败:', error)
      
      // 使用模拟数据
      this.loadMockProfileData()
    }
  },

  /**
   * 格式化预约项
   */
  formatBookingItem(booking) {
    // 安全检查
    if (!booking) {
      return null
    }
    
    const courseStartTime = booking.course?.start_time
    const courseEndTime = booking.course?.end_time
    const fallbackTime = booking.created_at
    
    const startTime = new Date(courseStartTime || fallbackTime)
    const endTime = new Date(courseEndTime || fallbackTime)
    
    // 检查日期是否有效
    if (isNaN(startTime.getTime())) {
      return null
    }
    
    const day = String(startTime.getDate()).padStart(2, '0')
    const month = String(startTime.getMonth() + 1).padStart(2, '0')
    
    const formatTime = (date) => {
      if (isNaN(date.getTime())) return '--:--'
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }

    return {
      id: booking.id,
      course_id: booking.course_id,
      course_title: booking.course?.title || '未知课程',
      location: booking.course?.location || '待定',
      day,
      month,
      time_range: `${formatTime(startTime)}-${formatTime(endTime)}`,
      full_date: startTime
    }
  },

  /**
   * 计算成就
   */
  calculateAchievements(bookings, categoryCounts) {
    const nonCancelledBookings = bookings.filter(b => b.status !== 'cancelled')
    
    return {
      first_booking: nonCancelledBookings.length >= 1,
      five_courses: nonCancelledBookings.length >= 5,
      all_categories: Object.keys(categoryCounts).length >= 3,
      streak_learner: this.hasStreakLearning(nonCancelledBookings)
    }
  },

  /**
   * 检测连续学习
   */
  hasStreakLearning(bookings) {
    if (!Array.isArray(bookings) || bookings.length < 3) return false
    
    const dates = bookings
      .filter(b => b && (b.course?.start_time || b.created_at)) // 过滤掉无效数据
      .map(b => {
        const date = new Date(b.course?.start_time || b.created_at)
        return isNaN(date.getTime()) ? null : date.toDateString()
      })
      .filter(Boolean) // 移除null值
      .reverse()
    
    if (dates.length < 3) return false
    
    let consecutiveDays = 1
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      
      if (isNaN(prev.getTime()) || isNaN(curr.getTime())) continue
      
      const diffDays = (prev - curr) / (1000 * 60 * 60 * 24)
      
      if (diffDays <= 7) { // 一周内有多次学习也算连续
        consecutiveDays++
      } else {
        break
      }
    }
    
    return consecutiveDays >= 3
  },

  /**
   * 加载模拟的个人中心数据
   */
  loadMockProfileData() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    this.setData({
      stats: {
        totalBookings: 12,
        upcomingCount: 3,
        completedCount: 8,
        attendedCount: 8
      },
      studyHours: 24,
      recentBookings: [
        {
          id: 1,
          course_id: 1,
          course_title: 'Python零基础入门到精通',
          location: '线上直播间',
          day: String(tomorrow.getDate()).padStart(2, '0'),
          month: String(tomorrow.getMonth() + 1).padStart(2, '0'),
          time_range: '19:00-21:00',
          full_date: tomorrow
        },
        {
          id: 2,
          course_id: 2,
          course_title: 'UI设计实战训练营',
          location: '教室201',
          day: String(dayAfterTomorrow.getDate()).padStart(2, '0'),
          month: String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0'),
          time_range: '14:00-17:00',
          full_date: dayAfterTomorrow
        }
      ],
      favoriteCategories: [
        { name: '编程技术', count: 5 },
        { name: '设计创意', count: 3 },
        { name: '职业技能', count: 2 }
      ],
      hasAchievement: {
        first_booking: true,
        five_courses: true,
        all_categories: true,
        streak_learner: true
      }
    })
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
  },

  /**
   * 跳转到我的预约页面
   */
  goToBookings() {
    wx.switchTab({
      url: '/pages/my-bookings/my-bookings'
    })
  },

  /**
   * 跳转到课程详情
   */
  goToDetail(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${courseId}`
    })
  },
  
  /**
   * 邀请好友
   */
  inviteFriends() {
    const userInfo = app.globalData.userInfo || {}
    const shareCode = userInfo.share_code || ''
    
    // 触发分享面板
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 手动触发分享
    wx.updateShareMenu({
      withShareTicket: true,
      isSuccess: true
    })
    
    wx.showToast({
      title: '点击右上角分享给好友',
      icon: 'none',
      duration: 2000
    })
  },
  
  /**
   * 个人中心页面分享配置
   */
  onShareAppMessage() {
    const userInfo = app.globalData.userInfo || {}
    const shareCode = userInfo.share_code || ''
    
    return {
      title: '快来和我一起学习吧！',
      path: `/pages/index/index${shareCode ? '?shareCode=' + shareCode : ''}`,
      imageUrl: '',
      success: (res) => {
        console.log('分享成功')
        wx.showToast({
          title: '感谢您的分享',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('分享失败:', err)
      }
    }
  },
  
  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '发现一个很棒的学习平台，推荐给你！',
      query: '',
      imageUrl: ''
    }
  }
})
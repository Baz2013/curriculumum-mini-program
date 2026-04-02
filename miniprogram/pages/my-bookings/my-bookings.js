// my-bookings.js
const app = getApp()

Page({
  data: {
    tabs: [
      { label: '待参加', key: 'upcoming', count: 0 },
      { label: '已完成', key: 'completed', count: 0 },
      { label: '已取消', key: 'cancelled', count: 0 }
    ],
    currentTab: 'upcoming',
    bookings: [],
    filteredBookings: [],
    loading: false
  },

  onLoad() {
    this.getMyBookings()
  },

  onShow() {
    // 每次返回页面都刷新数据
    this.getMyBookings()
  },

  onPullDownRefresh() {
    this.getMyBookings().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 获取我的预约列表
   */
  async getMyBookings() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const userInfo = app.globalData.userInfo
      
      if (!userInfo || !userInfo.id) {
        console.warn('[获取预约列表] 用户未登录或缺少用户ID')
        this.setData({ loading: false })
        return
      }
      
      console.log('[获取预约列表] 用户ID:', userInfo.id)
      
      const result = await app.request({
        url: '/user/bookings',
        method: 'GET',
        data: {
          userId: userInfo.id
        }
      })

      // 安全检查：确保结果是数组
      const rawBookings = Array.isArray(result?.list) ? result.list : []
      
      const bookings = rawBookings.map(booking => ({
        ...booking,
        course_title: booking.course_title || '未知课程',
        category_name: booking.category_name || '其他',
        teacher: booking.teacher || '未知教师',
        location: booking.location || '待定',
        start_time: booking.start_time || booking.created_at,
        end_time: booking.end_time || booking.created_at
      }))

      this.updateTabs(bookings)
      this.filterBookings()
      
    } catch (error) {
      console.error('获取预约列表失败:', error)
      
      // 加载模拟数据用于演示
      this.loadMockData()
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 更新各状态的计数
   */
  updateTabs(bookings) {
    const counts = {
      upcoming: 0,
      completed: 0,
      cancelled: 0
    }

    bookings.forEach(booking => {
      const status = this.getStatusType(booking)
      counts[status]++
    })

    const tabs = this.data.tabs.map(tab => ({
      ...tab,
      count: counts[tab.key]
    }))

    this.setData({ 
      bookings,
      tabs
    })
  },

  /**
   * 切换Tab
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.filterBookings()
  },

  /**
   * 过滤预约列表
   */
  filterBookings() {
    const { bookings, currentTab } = this.data
    const filtered = bookings.filter(booking => {
      return this.getStatusType(booking) === currentTab
    }).sort((a, b) => {
      // 待参加的按时间升序排列，其他的按时间降序
      if (currentTab === 'upcoming') {
        return new Date(a.start_time) - new Date(b.start_time)
      } else {
        return new Date(b.start_time) - new Date(a.start_time)
      }
    })

    this.setData({ filteredBookings: filtered })
  },

  /**
   * 获取预约状态类型
   */
  getStatusType(booking) {
    if (booking.status === 'cancelled') {
      return 'cancelled'
    }
    
    const now = new Date()
    const startTime = new Date(booking.start_time)
    
    if (now > startTime) {
      return 'completed'
    }
    
    return 'upcoming'
  },

  /**
   * 获取状态文本
   */
  getStatusText(booking) {
    const statusType = this.getStatusType(booking)
    const texts = {
      upcoming: '待参加',
      completed: '已完成',
      cancelled: '已取消'
    }
    return texts[statusType]
  },

  /**
   * 获取状态类名
   */
  getStatusClass(booking) {
    const statusType = this.getStatusType(booking)
    const classes = {
      upcoming: 'dot-blue',
      completed: 'dot-green',
      cancelled: 'dot-red'
    }
    return classes[statusType]
  },

  /**
   * 判断是否可以取消
   */
  canCancel(booking) {
    const statusType = this.getStatusType(booking)
    if (statusType !== 'upcoming') return false
    
    // 检查距离开课时间是否小于24小时
    const now = new Date()
    const startTime = new Date(booking.start_time)
    const hoursDiff = (startTime - now) / (1000 * 60 * 60)
    
    return hoursDiff >= 24
  },

  /**
   * 取消预约
   */
  async cancelBooking(e) {
    const { id, courseId } = e.currentTarget.dataset
    
    const confirmRes = await new Promise(resolve => {
      wx.showModal({
        title: '取消预约',
        content: '确定要取消这次预约吗？取消后将无法恢复。',
        cancelText: '我再想想',
        confirmText: '确定取消',
        confirmColor: '#ff4d4f',
        success: resolve
      })
    })

    if (!confirmRes.confirm) return

    app.showLoading('处理中...')

    try {
      const userInfo = app.globalData.userInfo
      
      if (!userInfo || !userInfo.id) {
        throw new Error('用户未登录，请先登录')
      }
      
      console.log('[取消预约] 用户ID:', userInfo.id, ', 课程ID:', courseId)
      
      await app.request({
        url: `/bookings/cancel/${courseId}`,
        method: 'DELETE',
        data: {
          userId: userInfo.id
        }
      })

      wx.showToast({
        title: '已取消预约',
        icon: 'success'
      })

      // 刷新列表
      this.getMyBookings()

    } catch (error) {
      console.error('取消预约失败:', error)
      wx.showToast({
        title: error.message || '操作失败，请重试',
        icon: 'none'
      })
    } finally {
      app.hideLoading()
    }
  },

  /**
   * 跳转到课程详情
   */
  goToDetail(e) {
    const courseId = e.currentTarget.dataset.courseId
    wx.navigateTo({
      url: `/pages/detail/detail?id=${courseId}`
    })
  },

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[date.getDay()]
    
    return `${year}-${month}-${day} ${weekday}`
  },

  /**
   * 获取时间段
   */
  getTimeRange(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    const formatTime = (date) => {
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  },

  /**
   * 获取空状态文案
   */
  getEmptyText() {
    const texts = {
      upcoming: '还没有即将开始的课程哦~',
      completed: '暂时没有完成的课程记录',
      cancelled: '没有被取消的预约记录'
    }
    return texts[this.data.currentTab]
  },

  /**
   * 加载模拟数据
   */
  loadMockData() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const mockBookings = [
      {
        id: 1,
        course_id: 1,
        course: {
          title: 'Python零基础入门到精通',
          category_name: '编程技术',
          teacher: '张老师',
          location: '线上直播间',
          start_time: tomorrow.toISOString(),
          end_time: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString()
        },
        status: 'confirmed',
        created_at: now.toISOString()
      },
      {
        id: 2,
        course_id: 2,
        course: {
          title: 'UI设计实战训练营',
          category_name: '设计创意',
          teacher: '李设计师',
          location: '教室201',
          start_time: yesterday.toISOString(),
          end_time: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000).toISOString()
        },
        status: 'confirmed',
        created_at: lastWeek.toISOString()
      },
      {
        id: 3,
        course_id: 3,
        course: {
          title: '商务英语口语提升班',
          category_name: '语言学习',
          teacher: '王教授',
          location: '语音室305',
          start_time: lastWeek.toISOString(),
          end_time: new Date(lastWeek.getTime() + 2 * 60 * 60 * 1000).toISOString()
        },
        status: 'cancelled',
        created_at: lastWeek.toISOString()
      }
    ]

    this.updateTabs(mockBookings)
    this.filterBookings()
  }
})
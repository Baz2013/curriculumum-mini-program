// detail.js
const app = getApp()

Page({
  data: {
    courseId: null,
    courseInfo: {},
    startDate: {}, // 格式化的起始日期对象
    startTime: '', // 开始时间
    endTime: '', // 结束时间
    weekDay: '', // 星期几
    duration: '', // 时长
    targets: ['初学者', '进阶学员', '兴趣爱好者'], // 适用人群
    isBooked: false, // 是否已预约
    bookingStatus: 'idle', // idle, submitting, success
    userShareCode: '' // 当前用户的分享码
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ courseId: parseInt(options.id) })
      
      // 从全局数据获取用户的分享码
      const userInfo = app.globalData.userInfo || {}
      if (userInfo.share_code) {
        this.setData({ userShareCode: userInfo.share_code })
      }
      
      this.getCourseDetail()
      this.checkBookingStatus()
    } else {
      wx.showToast({
        title: '缺少课程ID',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },
  
  /**
   * 微信分享配置
   */
  onShareAppMessage() {
    const { courseInfo, userShareCode } = this.data
    
    return {
      title: courseInfo.title || '精彩课程等你来',
      path: `/pages/detail/detail?id=${this.data.courseId}${userShareCode ? '&shareCode=' + userShareCode : ''}`,
      imageUrl: courseInfo.image || '',
      success: (res) => {
        console.log('分享成功')
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('分享失败:', err)
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        })
      }
    }
  },
  
  /**
   * 分享到朋友圈（仅支持安卓）
   */
  onShareTimeline() {
    const { courseInfo } = this.data
    
    return {
      title: courseInfo.title || '精彩课程等你来',
      query: `id=${this.data.courseId}`,
      imageUrl: courseInfo.image || ''
    }
  },

  onShow() {
    // 每次进入页面都刷新一下预约状态
    if (this.data.courseId) {
      this.checkBookingStatus()
    }
  },

  /**
   * 获取课程详情
   */
  async getCourseDetail() {
    app.showLoading('加载中...')
    
    try {
      const res = await app.request({
        url: `/courses/${this.data.courseId}/detail`,
        method: 'GET'
      })

      const courseInfo = {
        ...res,
        categoryName: res.category_name || '其他',
        bookedCount: res.booked_count || 0,
        status: res.booked_count >= res.capacity ? 'full' : 'available'
      }

      this.formatDateTime(courseInfo.start_time, courseInfo.end_time)
      
      this.setData({ courseInfo })
      
    } catch (error) {
      console.error('获取课程详情失败:', error)
      
      // 加载模拟数据用于演示
      this.loadMockData()
    } finally {
      app.hideLoading()
    }
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(startTimeStr, endTimeStr) {
    const parseTime = (str) => {
      const date = str.split(' ')[0]
      const time = str.split(' ')[1].substring(0, 5)
      return { date, time }
    }

    const startObj = parseTime(startTimeStr)
    const endObj = parseTime(endTimeStr)

    // 解析日期
    const dateParts = startObj.date.split('-')
    const year = dateParts[0]
    const month = dateParts[1]
    const day = dateParts[2]

    // 计算星期几
    const weekdayArr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const targetDate = new Date(year, month - 1, day)
    const weekDay = weekdayArr[targetDate.getDay()]

    // 计算时长
    const startMinutes = parseInt(startObj.time.substring(0, 2)) * 60 + parseInt(startObj.time.substring(3))
    const endMinutes = parseInt(endObj.time.substring(0, 2)) * 60 + parseInt(endObj.time.substring(3))
    const totalMinutes = endMinutes - startMinutes
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const duration = hours > 0 ? `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}` : `${minutes}分钟`

    this.setData({
      startDate: {
        day: day,
        monthYear: `${year}.${month}`
      },
      startTime: startObj.time,
      endTime: endObj.time,
      weekDay: weekDay,
      duration: duration
    })
  },

  /**
   * 检查预约状态
   */
  async checkBookingStatus() {
    try {
      const userInfo = app.globalData.userInfo
      
      if (!userInfo || !userInfo.id) {
        console.warn('[检查预约状态] 用户未登录或缺少用户ID')
        return
      }
      
      console.log('[检查预约状态] 用户ID:', userInfo.id, ', 课程ID:', this.data.courseId)
      
      const result = await app.request({
        url: '/user/bookings',
        method: 'GET',
        data: {
          userId: userInfo.id
        }
      })

      const isBooked = result.list && result.list.some(b => b.course_id === this.data.courseId)
      console.log('[检查预约状态] 结果:', isBooked ? '已预约' : '未预约')
      this.setData({ isBooked })
      
    } catch (error) {
      console.error('[检查预约状态失败]:', error)
      // 忽略错误，不影响正常流程
    }
  },

  /**
   * 处理预约
   */
  async handleBooking() {
    const { courseInfo, isBooked } = this.data

    // 检查是否已预约
    if (isBooked) {
      this.cancelBooking()
      return
    }

    // 检查是否已满员
    if (courseInfo.bookedCount >= courseInfo.capacity) {
      wx.showToast({
        title: '抱歉，该课程已满员',
        icon: 'none'
      })
      return
    }

    // 二次确认
    const confirmRes = await new Promise(resolve => {
      wx.showModal({
        title: '确认预约',
        content: `确定要预约「${courseInfo.title}」吗？`,
        cancelText: '再想想',
        confirmText: '立即预约',
        success: resolve
      })
    })

    if (!confirmRes.confirm) return

    // 提交预约
    this.setData({ bookingStatus: 'submitting' })
    app.showLoading('提交中...')

    try {
      const userInfo = app.globalData.userInfo
      
      if (!userInfo || !userInfo.id) {
        throw new Error('用户未登录，请先登录')
      }
      
      console.log('[发起预约] 用户ID:', userInfo.id, ', 课程ID:', this.data.courseId)
      
      await app.request({
        url: '/bookings/create',
        method: 'POST',
        data: {
          userId: userInfo.id,
          courseId: this.data.courseId
        }
      })

      this.setData({ 
        isBooked: true,
        bookingStatus: 'success'
      })

      wx.showToast({
        title: '预约成功！',
        icon: 'success'
      })

      // 更新课程的预约人数
      this.setData({
        'courseInfo.bookedCount': this.data.courseInfo.bookedCount + 1,
        'courseInfo.status': this.data.courseInfo.bookedCount + 1 >= this.data.courseInfo.capacity ? 'full' : 'available'
      })

    } catch (error) {
      console.error('预约失败:', error)
      wx.showToast({
        title: error.message || '预约失败，请重试',
        icon: 'none'
      })
    } finally {
      app.hideLoading()
      this.setData({ bookingStatus: 'idle' })
    }
  },

  /**
   * 取消预约
   */
  async cancelBooking() {
    const confirmRes = await new Promise(resolve => {
      wx.showModal({
        title: '取消预约',
        content: '确定要取消本次预约吗？',
        cancelText: '保留',
        confirmText: '取消预约',
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
      
      console.log('[取消预约] 用户ID:', userInfo.id, ', 课程ID:', this.data.courseId)
      
      await app.request({
        url: `/bookings/cancel/${this.data.courseId}`,
        method: 'DELETE',
        data: {
          userId: userInfo.id
        }
      })

      this.setData({ isBooked: false })

      wx.showToast({
        title: '已取消预约',
        icon: 'success'
      })

      // 更新课程的预约人数
      this.setData({
        'courseInfo.bookedCount': this.data.courseInfo.bookedCount - 1,
        'courseInfo.status': 'available'
      })

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
   * 联系老师
   */
  contactTeacher() {
    wx.makePhoneCall({
      phoneNumber: '13800138000', // 这里应该是实际的联系电话
      fail: () => {
        wx.showToast({
          title: '无法拨打电话',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 加载模拟数据
   */
  loadMockData() {
    const mockCourse = {
      id: this.data.courseId,
      title: 'Python零基础入门到精通',
      description: '本课程专为零基础学员设计，通过系统的理论讲解和丰富的实战练习，帮助您快速掌握Python编程的核心知识和实用技能。\n\n课程内容包括：\n✨ Python基础语法与环境搭建\n✨ 变量、数据类型与运算符\n✨ 流程控制语句详解\n✨ 函数的定义与应用\n✨ 面向对象编程思想\n✨ 常用标准库的使用\n✨ 实战项目演练',
      startTime: '2024-04-15 19:00',
      endTime: '2024-04-15 21:00',
      location: '线上直播间',
      capacity: 50,
      bookedCount: 35,
      categoryName: '编程技术',
      teacher: '张老师',
      price: 199,
      status: 'available'
    }

    this.formatDateTime(mockCourse.startTime, mockCourse.endTime)
    this.setData({ courseInfo: mockCourse })
  },

  computed: {
    bookingBtnText() {
      if (this.isBooked) return '取消预约'
      if (this.bookingStatus === 'submitting') return '提交中...'
      if (this.courseInfo.bookedCount >= this.courseInfo.capacity) return '已满员'
      return '立即预约'
    }
  }
})

// 为了让computed属性生效，需要在data中添加getter
Object.defineProperty(Page.prototype, 'bookingBtnText', {
  get() {
    if (this.data.isBooked) return '取消预约'
    if (this.data.bookingStatus === 'submitting') return '提交中...'
    if (this.data.courseInfo.bookedCount >= this.data.courseInfo.capacity) return '已满员'
    return '立即预约'
  }
})
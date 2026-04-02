// index.js
const app = getApp()

Page({
  data: {
    keyword: '', // 搜索关键词
    categories: [], // 分类列表
    currentCategory: { id: 0, name: '全部' }, // 当前选中的分类
    courses: [], // 课程列表
    loading: false, // 是否正在加载
    page: 1, // 当前页码
    pageSize: 10, // 每页数量
    hasMore: true // 是否还有更多数据
  },

  onLoad() {
    this.initCategories()
    this.getCourses()
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      courses: [],
      hasMore: true
    })
    this.getCourses().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadMore()
    }
  },

  /**
   * 初始化分类数据
   */
  initCategories() {
    const categories = [
      { id: 0, name: '全部' },
      { id: 1, name: '编程技术' },
      { id: 2, name: '设计创意' },
      { id: 3, name: '语言学习' },
      { id: 4, name: '职业技能' },
      { id: 5, name: '兴趣爱好' }
    ]
    this.setData({ categories })
  },

  /**
   * 选择分类
   */
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    const category = this.data.categories.find(item => item.id === categoryId)
    
    this.setData({
      currentCategory: category,
      page: 1,
      courses: [],
      hasMore: true
    })
    
    this.getCourses()
  },

  /**
   * 搜索确认事件
   */
  onSearchConfirm(e) {
    this.handleSearch()
  },

  /**
   * 执行搜索
   */
  handleSearch() {
    this.setData({
      page: 1,
      courses: [],
      hasMore: true
    })
    this.getCourses()
  },

  /**
   * 获取课程列表
   */
  async getCourses() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 构建干净的请求参数，避免undefined出现在URL中
      const params = {}
      params.page = this.data.page
      params.pageSize = this.data.pageSize
      
      if (this.data.currentCategory.id !== 0) {
        params.categoryId = this.data.currentCategory.id
      }
      
      const trimmedKeyword = this.data.keyword.trim()
      if (trimmedKeyword) {
        params.keyword = trimmedKeyword
      }

      const res = await app.request({
        url: '/courses/list',
        data: params,
        method: 'GET'
      })

      const newCourses = res.list.map(course => ({
        ...course,
        categoryName: course.category_name || '其他',
        bookedCount: course.booked_count || 0
      }))

      this.setData({
        courses: [...this.data.courses, ...newCourses],
        hasMore: newCourses.length >= this.data.pageSize,
        loading: false
      })
      
    } catch (error) {
      console.error('获取课程列表失败:', error)
      this.setData({ loading: false })
      
      // 如果是首次加载且没有数据，显示模拟数据供演示
      if (this.data.page === 1 && this.data.courses.length === 0) {
        this.loadMockData()
      }
    }
  },

  /**
   * 加载更多
   */
  loadMore() {
    this.setData({
      page: this.data.page + 1
    })
    this.getCourses()
  },

  /**
   * 跳转课程详情页
   */
  goToDetail(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${courseId}`
    })
  },

  /**
   * 加载模拟数据（仅用于演示）
   */
  loadMockData() {
    const mockCourses = [
      {
        id: 1,
        title: 'Python零基础入门到精通',
        description: '从零开始学Python，掌握核心语法与实战技能',
        startTime: '2024-04-15 19:00',
        endTime: '21:00',
        location: '线上直播',
        capacity: 50,
        bookedCount: 35,
        categoryName: '编程技术',
        teacher: '张老师',
        price: 199
      },
      {
        id: 2,
        title: 'UI设计实战训练营',
        description: '学习现代UI设计理念与实践技巧',
        startTime: '2024-04-16 14:00',
        endTime: '17:00',
        location: '教室201',
        capacity: 30,
        bookedCount: 25,
        categoryName: '设计创意',
        teacher: '李设计师',
        price: 299
      },
      {
        id: 3,
        title: '商务英语口语提升班',
        description: '快速提升职场英语沟通能力',
        startTime: '2024-04-17 10:00',
        endTime: '12:00',
        location: '语音室305',
        capacity: 20,
        bookedCount: 18,
        categoryName: '语言学习',
        teacher: '王教授',
        price: 350
      },
      {
        id: 4,
        title: '数据分析与可视化',
        description: 'Excel高级应用与Power BI实践',
        startTime: '2024-04-18 13:30',
        endTime: '16:30',
        location: '机房102',
        capacity: 40,
        bookedCount: 38,
        categoryName: '职业技能',
        teacher: '赵分析师',
        price: 250
      },
      {
        id: 5,
        title: '摄影艺术鉴赏与实践',
        description: '发现生活中的美，用镜头记录精彩瞬间',
        startTime: '2024-04-19 09:00',
        endTime: '11:30',
        location: '户外基地',
        capacity: 15,
        bookedCount: 12,
        categoryName: '兴趣爱好',
        teacher: '陈摄影师',
        price: 180
      }
    ]

    this.setData({
      courses: mockCourses.filter(course => {
        // 过滤条件
        if (this.data.currentCategory.id !== 0) {
          const categoryMap = {
            1: '编程技术',
            2: '设计创意',
            3: '语言学习',
            4: '职业技能',
            5: '兴趣爱好'
          }
          if (course.categoryName !== categoryMap[this.data.currentCategory.id]) {
            return false
          }
        }
        if (this.data.keyword && !course.title.includes(this.data.keyword)) {
          return false
        }
        return true
      }),
      hasMore: false,
      loading: false
    })
  }
})
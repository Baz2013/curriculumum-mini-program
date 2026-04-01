// register.js
const app = getApp()

Page({
  data: {
    formData: {
      nickname: '',
      phone: '',
      email: '',
      reason: ''
    },
    submitting: false
  },

  onLoad(options) {
    // 如果是从分享链接进来，可能有referral信息
    if (options.scene) {
      console.log('Scene:', options.scene)
    }
  },

  onNicknameInput(e) {
    this.setData({
      'formData.nickname': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    })
  },

  onEmailInput(e) {
    this.setData({
      'formData.email': e.detail.value
    })
  },

  onReasonInput(e) {
    this.setData({
      'formData.reason': e.detail.value
    })
  },

  validateForm() {
    const { nickname, phone, email } = this.data.formData

    // 昵称必填
    if (!nickname || nickname.trim().length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return false
    }

    // 手机号格式验证（如果填写的话）
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      })
      return false
    }

    // 邮箱格式验证（如果填写的话）
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) === false) {
      wx.showToast({
        title: '邮箱格式不正确',
        icon: 'none'
      })
      return false
    }

    return true
  },

  async handleRegister() {
    if (!this.validateForm()) {
      return
    }

    if (this.data.submitting) {
      return
    }

    this.setData({ submitting: true })

    try {
      const res = await app.request({
        url: '/register',
        method: 'POST',
        data: {
          nickname: this.data.formData.nickname.trim(),
          phone: this.data.formData.phone.trim() || null,
          email: this.data.formData.email.trim() || null,
          reason: this.data.formData.reason.trim()
        }
      })

      wx.showModal({
        title: '申请已提交',
        content: '您的注册申请已成功提交，我们会尽快审核并通过微信通知您。',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 跳转到登录页
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      })

    } catch (error) {
      console.error('注册失败:', error)
      wx.showToast({
        title: error.message || '注册失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  goToLogin() {
    wx.redirectTo({
      url: '/pages/login/login'
    })
  }
})
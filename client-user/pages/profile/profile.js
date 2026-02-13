// pages/profile/profile.js
Page({
  data: {
    avatarUrl: '',
    nickName: '',
    balance: 0,
    totalRecharge: 0,
    totalGift: 0,
    isVip: false,
    loading: false
  },

  onLoad() {
    this.loadUserInfo()
    this.loadBalance()
  },

  onShow() {
    // 每次显示页面时刷新余额
    this.loadBalance()
  },

  // 加载用户信息
  loadUserInfo() {
    // 从本地存储获取头像和昵称
    const avatarUrl = wx.getStorageSync('avatarUrl')
    const nickName = wx.getStorageSync('nickName')

    if (avatarUrl) {
      this.setData({ avatarUrl })
    }
    if (nickName) {
      this.setData({ nickName })
    }
  },

  // 选择头像（新方案）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('🎭 用户选择头像:', avatarUrl)

    this.setData({
      avatarUrl,
      nickName: '微信用户' // 默认昵称，因为无法直接获取
    })

    // 保存到本地存储
    wx.setStorageSync('avatarUrl', avatarUrl)
    wx.setStorageSync('nickName', '微信用户')

    wx.showToast({
      title: '授权成功',
      icon: 'success'
    })
  },

  // 加载余额信息
  async loadBalance() {
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserBalance'
      })

      console.log('💰 getUserBalance 返回结果:', res.result)

      if (res.result.success) {
        // 强制转换为数字类型，防止 toFixed(2) 失败
        const balanceData = {
          balance: Number(res.result.balance) || 0,
          totalRecharge: Number(res.result.totalRecharge) || 0,
          totalGift: Number(res.result.totalGift) || 0,
          isVip: res.result.isVip || false
        }

        console.log('💰 准备更新余额数据:', balanceData)
        console.log('💰 balance 类型:', typeof balanceData.balance, '值:', balanceData.balance)

        this.setData(balanceData)

        console.log('💰 余额数据已更新到页面:', this.data)
        console.log('💰 页面 balance 类型:', typeof this.data.balance, '值:', this.data.balance)
      } else {
        console.error('❌ getUserBalance 返回失败:', res.result)
      }
    } catch (error) {
      console.error('❌ 获取余额失败:', error)
      wx.showToast({
        title: '获取余额失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 跳转到充值页面
  goToRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/recharge'
    })
  },

  // 跳转到我的订单
  goToOrderList() {
    wx.switchTab({
      url: '/pages/order-list/order-list'
    })
  },

  // 跳转到充值记录
  goToRechargeLogs() {
    wx.navigateTo({
      url: '/pages/recharge-logs/recharge-logs'
    })
  },

  // 跳转到员工登录
  goToStaffLogin() {
    wx.navigateTo({
      url: '/pages/staff/login/login'
    })
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '0571-88888888'
    })
  },

  // 关于景区
  showAbout() {
    wx.showModal({
      title: '关于景区',
      content: '云湖景区位于XX省XX市，湖面面积约500亩，湖水清澈，风景优美。景区提供多种游船服务，适合家庭出游、情侣约会、团队活动。\n\n营业时间：每日08:00-18:00\n地址：XX省XX市XX路123号\n客服电话：0571-88888888',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 退款说明
  showRefundRules() {
    wx.showModal({
      title: '退款说明',
      content: '1. 未核销的订单可全额退款；\n2. 已核销但未发船的订单可申请退款（扣除10%手续费）；\n3. 已发船的订单不支持退款，押金按实际使用情况结算；\n4. 退款将在3-7个工作日内原路返回。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})

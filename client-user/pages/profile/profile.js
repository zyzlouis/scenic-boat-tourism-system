// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    phone: '',
    balance: 0,
    totalRecharge: 0,
    totalGift: 0,
    isVip: false,
    loading: false,
    rechargeEnabled: false,  // 储值功能开关
    appSettings: null  // 景区配置信息
  },

  onLoad() {
    // 检查储值功能是否启用
    const appConfig = app.getAppConfig()
    this.setData({ rechargeEnabled: appConfig.rechargeEnabled === true })

    this.loadUserInfo()
    this.loadBalance()
    this.loadAppSettings()  // 加载景区配置
  },

  onShow() {
    // 每次显示页面时刷新余额和配置
    this.loadBalance()
    this.loadAppSettings()
  },

  // 加载景区配置信息
  async loadAppSettings() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAppConfig'
      })

      if (res.result.code === 200) {
        this.setData({
          appSettings: res.result.data
        })
        console.log('✅ 景区配置加载成功:', res.result.data)
      }
    } catch (error) {
      console.error('❌ 加载景区配置失败:', error)
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    // 从本地存储获取头像、昵称和手机号
    const avatarUrl = wx.getStorageSync('avatarUrl')
    const nickName = wx.getStorageSync('nickName')
    const phone = wx.getStorageSync('phone')

    if (avatarUrl) {
      this.setData({ avatarUrl })
    }
    if (nickName) {
      this.setData({ nickName })
    }
    if (phone) {
      this.setData({ phone })
    }

    // 从云端获取用户信息
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo'
      })
      if (res.result.success && res.result.data) {
        const userInfo = res.result.data
        if (userInfo.nickName) {
          this.setData({ nickName: userInfo.nickName })
          wx.setStorageSync('nickName', userInfo.nickName)
        }
        if (userInfo.phone) {
          this.setData({ phone: userInfo.phone })
          wx.setStorageSync('phone', userInfo.phone)
        }
        if (userInfo.avatarUrl) {
          this.setData({ avatarUrl: userInfo.avatarUrl })
          wx.setStorageSync('avatarUrl', userInfo.avatarUrl)
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 选择头像（新方案）
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('🎭 用户选择头像:', avatarUrl)

    this.setData({ avatarUrl })
    wx.setStorageSync('avatarUrl', avatarUrl)

    // 保存到云端
    try {
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { avatarUrl }
      })
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存头像失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 获取手机号
  async onGetPhoneNumber(e) {
    console.log('📱 获取手机号:', e.detail)

    if (e.detail.code) {
      try {
        wx.showLoading({ title: '获取中...', mask: true })

        const res = await wx.cloud.callFunction({
          name: 'getPhoneNumber',
          data: { code: e.detail.code }
        })

        wx.hideLoading()

        if (res.result.success) {
          const phone = res.result.phoneNumber
          this.setData({ phone })
          wx.setStorageSync('phone', phone)

          wx.showToast({
            title: '手机号绑定成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.result.message || '获取失败',
            icon: 'none'
          })
        }
      } catch (error) {
        wx.hideLoading()
        console.error('获取手机号失败:', error)
        wx.showToast({
          title: '获取失败',
          icon: 'none'
        })
      }
    } else {
      wx.showToast({
        title: '取消授权',
        icon: 'none'
      })
    }
  },

  // 设置昵称
  onEditNickname() {
    wx.showModal({
      title: '设置昵称',
      editable: true,
      placeholderText: '请输入昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          const nickName = res.content.trim()
          if (nickName) {
            try {
              await wx.cloud.callFunction({
                name: 'updateUserInfo',
                data: { nickName }
              })

              this.setData({ nickName })
              wx.setStorageSync('nickName', nickName)

              wx.showToast({
                title: '昵称设置成功',
                icon: 'success'
              })
            } catch (error) {
              console.error('保存昵称失败:', error)
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          }
        }
      }
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
    if (!this.data.rechargeEnabled) {
      wx.showToast({
        title: '该功能暂未开放',
        icon: 'none'
      })
      return
    }
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
    if (!this.data.rechargeEnabled) {
      wx.showToast({
        title: '该功能暂未开放',
        icon: 'none'
      })
      return
    }
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
    const phoneNumber = this.data.appSettings?.contactPhone || '0571-88888888'
    wx.makePhoneCall({
      phoneNumber: phoneNumber
    })
  },

  // 关于景区
  showAbout() {
    const settings = this.data.appSettings

    if (!settings) {
      wx.showToast({
        title: '加载中，请稍后重试',
        icon: 'none'
      })
      return
    }

    const content = `${settings.aboutUs || '暂无景区介绍'}\n\n营业时间：${settings.openTime || '08:00'} - ${settings.closeTime || '18:00'}\n联系电话：${settings.contactPhone || '暂无'}`

    wx.showModal({
      title: settings.scenicName || '关于景区',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 退款说明
  showRefundRules() {
    const settings = this.data.appSettings
    const content = settings?.refundRules || '1. 未核销的订单可全额退款；\n2. 已核销但未发船的订单可申请退款（扣除10%手续费）；\n3. 已发船的订单不支持退款，押金按实际使用情况结算；\n4. 退款将在3-7个工作日内原路返回。'

    wx.showModal({
      title: '退款说明',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    })
  }
})

// pages/boat-type/boat-type.js
const app = getApp()

Page({
  data: {
    boatTypeCode: '',
    boatType: null,
    pricing: null,
    loading: true,
    allPricingConfigs: [] // 所有价格方案
  },

  onLoad(options) {
    const { code } = options
    if (code) {
      this.setData({ boatTypeCode: code })
      this.loadBoatTypeDetails(code)
    }
  },

  /**
   * 加载船型详情
   */
  async loadBoatTypeDetails(code) {
    try {
      this.setData({ loading: true })

      // 获取所有船型
      const boatTypesRes = await wx.cloud.callFunction({
        name: 'getBoatTypes'
      })

      if (boatTypesRes.result.code !== 200) {
        throw new Error(boatTypesRes.result.message || '加载失败')
      }

      // 找到对应船型
      const boatType = boatTypesRes.result.data.find(bt => bt.code === code)

      if (!boatType) {
        wx.showToast({ title: '船型不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      this.setData({ boatType })

      // 获取价格配置
      const pricingRes = await wx.cloud.callFunction({
        name: 'adminApi',
        data: {
          action: 'query',
          collection: 'pricingConfigs',
          data: { where: { boatTypeCode: code, enabled: true } }
        }
      })

      if (pricingRes.result.code === 200 && pricingRes.result.data.length > 0) {
        // 找到默认价格方案
        const defaultPricing = pricingRes.result.data.find(p => p.isDefault) || pricingRes.result.data[0]
        this.setData({
          pricing: defaultPricing,
          allPricingConfigs: pricingRes.result.data
        })
      }

      this.setData({ loading: false })
    } catch (error) {
      console.error('加载船型详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  /**
   * 分享到微信好友
   */
  onShareAppMessage(res) {
    const boatType = this.data.boatType
    if (!boatType) return {}

    return {
      title: `${boatType.name} - 翠屏湖景区游船`,
      path: `/pages/boat-type/boat-type?code=${boatType.code}`,
      imageUrl: boatType.imageUrl || ''
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline(res) {
    const boatType = this.data.boatType
    if (!boatType) return {}

    return {
      title: `${boatType.name} - 翠屏湖景区游船`,
      query: `code=${boatType.code}`
    }
  },

  /**
   * 立即预订
   */
  goCreateOrder() {
    const boatType = this.data.boatType
    if (!boatType) return

    // 跳转到首页并传递船型code
    // 使用 switchTab 跳转到首页
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        // 通过事件或全局状态通知首页选择船型
        const eventChannel = this.getOpenerEventChannel()
        if (eventChannel) {
          eventChannel.emit('selectBoatType', { code: boatType.code })
        }
        // 存储到全局数据
        app.globalData.selectedBoatTypeCode = boatType.code
        wx.showToast({
          title: '已选择船型，请选择时间',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  /**
   * 切换价格方案
   */
  onPricingChange(e) {
    const index = e.detail.value
    const config = this.data.allPricingConfigs[index]
    if (config) {
      this.setData({ pricing: config })
    }
  }
})

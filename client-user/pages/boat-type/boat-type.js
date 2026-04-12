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
   * 立即预订 - 直接创建订单
   */
  async goCreateOrder() {
    const boatType = this.data.boatType
    const pricing = this.data.pricing

    if (!boatType) {
      wx.showToast({ title: '船型信息加载失败', icon: 'none' })
      return
    }

    if (!pricing) {
      wx.showToast({ title: '价格方案加载失败', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '创建订单中...' })

      // 直接调用创建订单，使用当前选中的价格方案
      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          boatTypeId: boatType.id,
          pricingConfigId: pricing._id  // 传入选中的价格方案
        }
      })

      wx.hideLoading()

      if (res.result.code === 200) {
        // 跳转到支付页面
        wx.navigateTo({
          url: `/pages/payment/payment?orderId=${res.result.data.orderId}`
        })
      } else {
        wx.showToast({
          title: res.result.message || '创建订单失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('创建订单失败:', error)
      wx.showToast({
        title: '创建订单失败，请重试',
        icon: 'none'
      })
    }
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
  },

  /**
   * 生成分享二维码
   */
  async generateQrCode() {
    const boatType = this.data.boatType
    if (!boatType) return

    try {
      wx.showLoading({ title: '生成中...' })

      const res = await wx.cloud.callFunction({
        name: 'generateShareCode',
        data: {
          type: 'boat',
          code: boatType.code
        }
      })

      wx.hideLoading()

      if (res.result.code === 200) {
        // 显示二维码
        wx.previewImage({
          urls: [res.result.data.qrCodeImage],
          fail: () => {
            wx.showToast({ title: '预览失败', icon: 'none' })
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '生成失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('生成分享码失败:', error)
      wx.showToast({
        title: '生成分享码失败',
        icon: 'none'
      })
    }
  }
})

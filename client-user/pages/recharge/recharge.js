// pages/recharge/recharge.js
const app = getApp()

Page({
  data: {
    plans: [],
    selectedPlanId: null,
    selectedPlan: null,
    loading: false
  },

  onLoad() {
    // 检查储值功能是否启用
    const appConfig = app.getAppConfig()
    if (!appConfig.rechargeEnabled) {
      wx.showModal({
        title: '提示',
        content: '储值功能暂未开放',
        showCancel: false,
        success: () => {
          wx.navigateBack({
            fail: () => {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
          })
        }
      })
      return
    }

    this.loadPlans()
  },

  // 加载充值方案
  async loadPlans() {
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getRecharePlans'
      })

      if (res.result.success) {
        const plans = res.result.plans || []
        this.setData({
          plans: plans,
          selectedPlanId: plans.length > 0 ? plans[0]._id : null,
          selectedPlan: plans.length > 0 ? plans[0] : null
        })
      } else {
        wx.showToast({
          title: '加载充值方案失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载充值方案失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 选择充值方案
  selectPlan(e) {
    const planId = e.currentTarget.dataset.id
    const plan = this.data.plans.find(p => p._id === planId)

    this.setData({
      selectedPlanId: planId,
      selectedPlan: plan
    })
  },

  // 立即充值
  async doRecharge() {
    if (!this.data.selectedPlan) {
      wx.showToast({
        title: '请选择充值方案',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在调起支付...',
      mask: true
    })

    try {
      // 1. 创建充值订单并获取支付参数
      const res = await wx.cloud.callFunction({
        name: 'createRechargeOrder',
        data: {
          planId: this.data.selectedPlanId
        }
      })

      wx.hideLoading()

      if (!res.result.success) {
        wx.showToast({
          title: res.result.message || '创建订单失败',
          icon: 'none'
        })
        return
      }

      // 2. 获取支付参数
      const payment = res.result.payment

      // 3. 调起微信支付
      wx.requestPayment({
        ...payment,
        success: (payRes) => {
          console.log('✅ 充值支付成功:', payRes)

          wx.showModal({
            title: '充值成功',
            content: `充值成功！余额稍后更新，请返回查看。`,
            showCancel: false,
            success: () => {
              wx.navigateBack()
            }
          })
        },
        fail: (payErr) => {
          console.error('❌ 充值支付失败:', payErr)

          if (payErr.errMsg.indexOf('cancel') !== -1) {
            wx.showToast({
              title: '已取消支付',
              icon: 'none'
            })
          } else {
            wx.showModal({
              title: '支付失败',
              content: payErr.errMsg || '支付过程中出现错误，请重试',
              showCancel: false
            })
          }
        }
      })

    } catch (error) {
      wx.hideLoading()
      console.error('充值失败:', error)
      wx.showToast({
        title: '充值失败',
        icon: 'none'
      })
    }
  },

  // 查看服务协议
  showAgreement() {
    wx.showModal({
      title: '储值服务协议',
      content: '1. 储值金额仅限在本景区使用；\n2. 储值金额不设使用期限；\n3. 储值金额可用于支付游船租赁费用；\n4. 储值金额不支持提现，如需退款请联系客服；\n5. 最终解释权归景区所有。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})

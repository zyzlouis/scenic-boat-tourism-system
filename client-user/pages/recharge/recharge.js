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
      title: '处理中...',
      mask: true
    })

    try {
      // 创建充值订单
      const res = await wx.cloud.callFunction({
        name: 'createRechargeOrder',
        data: {
          planId: this.data.selectedPlanId
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        // 模拟支付成功（实际项目需要调起微信支付）
        // TODO: 调起微信支付
        // wx.requestPayment({
        //   ...res.result.paymentParams,
        //   success: () => {
        //     this.handlePaymentSuccess(res.result.orderNo)
        //   }
        // })

        // 开发阶段直接模拟支付成功
        this.simulatePaymentSuccess(res.result.orderNo, res.result.orderId)
      } else {
        wx.showToast({
          title: res.result.message || '创建订单失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('充值失败:', error)
      wx.showToast({
        title: '充值失败',
        icon: 'none'
      })
    }
  },

  // 模拟支付成功（开发阶段使用）
  async simulatePaymentSuccess(orderNo, orderId) {
    wx.showLoading({
      title: '处理支付结果...',
      mask: true
    })

    try {
      // 调用支付回调云函数
      const res = await wx.cloud.callFunction({
        name: 'rechargeCallback',
        data: {
          orderNo: orderNo,
          transactionId: `MOCK_${orderId}`
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showModal({
          title: '充值成功',
          content: `恭喜您！充值成功，当前余额：¥${res.result.balance.toFixed(2)}`,
          showCancel: false,
          success: () => {
            // 返回个人中心
            wx.navigateBack()
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '充值失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('支付回调失败:', error)
      wx.showToast({
        title: '处理失败',
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

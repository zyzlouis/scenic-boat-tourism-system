// pages/payment/payment.js
const app = getApp()

Page({
  data: {
    order: null,
    balance: 0,
    paymentMethod: 'wechat', // wechat 或 balance
    loading: false,
    rechargeEnabled: false  // 储值功能开关
  },

  onLoad(options) {
    const { orderId } = options

    // 检查储值功能是否启用
    const appConfig = app.getAppConfig()
    this.setData({ rechargeEnabled: appConfig.rechargeEnabled === true })

    if (orderId) {
      this.loadOrderDetail(orderId)
      this.loadBalance()
    }
  },

  // 加载订单详情
  async loadOrderDetail(orderId) {
    wx.showLoading({ title: '加载中...' })

    try {
      const { data: order } = await wx.cloud.database()
        .collection('orders')
        .doc(orderId)
        .get()

      this.setData({ order })
    } catch (error) {
      console.error('加载订单失败:', error)
      wx.showToast({
        title: '加载订单失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载余额
  async loadBalance() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserBalance'
      })

      console.log('💰 [支付页面] getUserBalance 返回结果:', res.result)

      if (res.result.success) {
        // 强制转换为数字类型
        this.setData({
          balance: Number(res.result.balance) || 0
        })

        console.log('💰 [支付页面] 余额已更新:', this.data.balance)
        console.log('💰 [支付页面] balance 类型:', typeof this.data.balance)
      }
    } catch (error) {
      console.error('❌ [支付页面] 获取余额失败:', error)
    }
  },

  // 选择支付方式
  selectPaymentMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ paymentMethod: method })
  },

  // 立即支付
  async doPay() {
    if (!this.data.order) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      })
      return
    }

    if (this.data.paymentMethod === 'balance') {
      this.payWithBalance()
    } else {
      this.payWithWechat()
    }
  },

  // 余额支付
  async payWithBalance() {
    // 检查余额是否充足
    if (this.data.balance < this.data.order.totalAmount) {
      wx.showModal({
        title: '余额不足',
        content: `当前余额：¥${this.data.balance.toFixed(2)}\n需要支付：¥${this.data.order.totalAmount.toFixed(2)}\n是否前往充值？`,
        confirmText: '去充值',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/recharge/recharge'
            })
          }
        }
      })
      return
    }

    wx.showLoading({
      title: '支付中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'payWithBalance',
        data: {
          orderId: this.data.order._id
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showModal({
          title: '支付成功',
          content: `核销码：${res.result.verificationCode}\n剩余余额：¥${res.result.balance.toFixed(2)}\n\n请前往码头出示核销码发船`,
          showCancel: false,
          success: () => {
            // 跳转到订单详情
            wx.redirectTo({
              url: `/pages/order-detail/order-detail?orderId=${this.data.order._id}`
            })
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '支付失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('余额支付失败:', error)
      wx.showToast({
        title: '支付失败',
        icon: 'none'
      })
    }
  },

  // 微信支付
  async payWithWechat() {
    if (!this.data.order) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在调起支付...',
      mask: true
    })

    try {
      // 1. 调用云函数创建支付订单
      const res = await wx.cloud.callFunction({
        name: 'wechatPay',
        data: {
          orderId: this.data.order._id
        }
      })

      wx.hideLoading()

      console.log('💳 微信支付统一下单结果:', res.result)

      if (res.result.code !== 200) {
        wx.showToast({
          title: res.result.message || '创建支付订单失败',
          icon: 'none'
        })
        return
      }

      // 2. 获取支付参数
      const payment = res.result.data.payment

      // 3. 调起微信支付
      wx.requestPayment({
        ...payment,
        success: (payRes) => {
          console.log('✅ 支付成功:', payRes)

          // 显示支付成功提示
          wx.showModal({
            title: '支付成功',
            content: '订单支付成功！请稍等片刻，正在生成核销码...',
            showCancel: false,
            success: () => {
              // 延迟跳转，等待支付回调处理完成
              setTimeout(() => {
                wx.redirectTo({
                  url: `/pages/order-detail/order-detail?orderId=${this.data.order._id}`
                })
              }, 1500)
            }
          })
        },
        fail: (payErr) => {
          console.error('❌ 支付失败:', payErr)

          if (payErr.errMsg.indexOf('cancel') !== -1) {
            // 用户取消支付
            wx.showToast({
              title: '已取消支付',
              icon: 'none'
            })
          } else {
            // 支付失败
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
      console.error('❌ 调起支付失败:', error)
      wx.showToast({
        title: '调起支付失败，请重试',
        icon: 'none'
      })
    }
  },

  // 取消订单
  async cancelOrder() {
    const result = await wx.showModal({
      title: '确认取消订单？',
      content: '取消后此订单将无法恢复',
      confirmText: '确认取消',
      cancelText: '我再想想',
      confirmColor: '#f44336'
    })

    if (!result.confirm) {
      return
    }

    wx.showLoading({
      title: '取消中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'cancelOrder',
        data: {
          orderId: this.data.order._id
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '订单已取消',
          icon: 'success',
          duration: 2000
        })

        // 延迟返回订单列表
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/order-list/order-list'
          })
        }, 2000)
      } else {
        wx.showToast({
          title: res.result.message || '取消失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 取消订单失败:', error)
      wx.showToast({
        title: '取消失败，请重试',
        icon: 'none'
      })
    }
  }
})

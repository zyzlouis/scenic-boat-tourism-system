// pages/payment/payment.js
const app = getApp()

Page({
  data: {
    order: null,
    balance: 0,
    paymentMethod: 'wechat', // wechat 或 balance
    loading: false,
    rechargeEnabled: false,  // 储值功能开关
    // 支付流程进行中：既是按钮的重入锁，也驱动按钮的 loading 态。
    // 2026-07-28 掉单事故里，两次支付请求各申请了一个商户单号、
    // 后者覆盖前者，导致回调按单号查不到订单。
    // 事故的触发路径（手机号授权后自动重入）已在 2026-08-05 移除，
    // 这把锁保留，用于挡住其余任何重复触发。
    paying: false
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

  // 立即支付（按钮点击）
  //
  // 只是转发到统一入口，任何触发路径都必须走 _enterPayFlow。
  async doPay() {
    await this._enterPayFlow()
  },

  // 支付流程的唯一入口，所有触发路径都必须走这里
  //
  // 锁用实例属性 _payFlowRunning 而非 data.paying：
  // setData 是异步的，两次触发若挨得很近，第二次读到的 data.paying 可能还是旧值，
  // 锁会失效。实例属性赋值是同步的，JS 单线程下 check-and-set 之间不会被打断。
  // data.paying 只负责驱动按钮的 loading 态，不承担互斥职责。
  async _enterPayFlow() {
    if (this._payFlowRunning) {
      console.log('⏳ 支付流程进行中，忽略重复触发')
      return
    }
    this._payFlowRunning = true
    this.setData({ paying: true })

    try {
      await this._runPayFlow()
    } finally {
      this._payFlowRunning = false
      this.setData({ paying: false })
    }
  },

  // 支付主流程（不要直接调用，一律经 _enterPayFlow 进入以确保持锁）
  //
  // 2026-08-05 起这里不再检查手机号。
  // 原实现会在此处中断支付、弹窗要授权、授权完再用 setTimeout(1500)
  // 自动续上——那 1.5 秒的无反馈窗口正是 2026-07-28 掉单事故的根因。
  // 现在支付一条直路走完，手机号改到订单详情页引导绑定。
  async _runPayFlow() {
    if (!this.data.order) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      })
      return
    }

    if (this.data.paymentMethod === 'balance') {
      await this.payWithBalance()
    } else {
      await this.payWithWechat()
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
        const hasCode = !!res.result.verificationCode
        const contentText = hasCode
          ? `核销码：${res.result.verificationCode}\n剩余余额：¥${Number(res.result.balance || 0).toFixed(2)}\n\n请出示核销码给工作人员`
          : `支付完成\n剩余余额：¥${Number(res.result.balance || 0).toFixed(2)}`

        wx.showModal({
          title: '支付成功',
          content: contentText,
          showCancel: false,
          success: () => {
            const detailPage = this.data.order.orderType === 'product'
              ? '/pages/product-order/product-order'
              : '/pages/order-detail/order-detail'
            wx.redirectTo({
              url: `${detailPage}?orderId=${this.data.order._id}`
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

      // 微信返回该单号已支付：说明钱已收到，只是回调没落到订单上。
      // 不能让用户再付一次，直接引导去订单页，由对账补单在 10 分钟内修复状态。
      if (res.result.code === 409) {
        // 主动触发一次对账补单，把状态修复从「等定时任务最多 10 分钟」压到秒级。
        // 放在前端而非 wechatPay 云函数里，是因为后者默认超时仅 3 秒，
        // 对账要跑多次查单会把它拖超时。失败也不要紧，定时对账仍会兜住。
        wx.showLoading({ title: '正在确认支付结果...', mask: true })
        try {
          await wx.cloud.callFunction({
            name: 'reconcilePayment',
            data: { orderId: this.data.order._id }
          })
        } catch (e) {
          console.error('触发对账补单失败，将由定时任务处理:', e)
        } finally {
          wx.hideLoading()
        }

        wx.showModal({
          title: '该订单已支付',
          content: '您已完成支付，正在为您生成核销码。',
          showCancel: false,
          success: () => {
            const detailPage = this.data.order.orderType === 'product'
              ? '/pages/product-order/product-order'
              : '/pages/order-detail/order-detail'
            wx.redirectTo({
              url: `${detailPage}?orderId=${this.data.order._id}`
            })
          }
        })
        return
      }

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
      //    包成 Promise 并 await，让 doPay 的重入锁一直持有到支付面板关闭，
      //    否则锁会在面板还开着时就释放。
      await new Promise((resolve) => {
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            resolve()
            console.log('✅ 支付成功:', payRes)
            this._afterPaySuccess()
          },
          fail: (payErr) => {
            resolve()
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
          },
          // 防御性兜底：success/fail 必有其一，但万一都没触发，
          // Promise 永不 resolve 会导致 paying 锁永久卡死、用户再也付不了款。
          // resolve 是幂等的，重复调用无副作用。
          complete: () => resolve()
        })
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

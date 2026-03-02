// 云函数：订单退款
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId, reason } = event

  // 验证参数
  if (!orderId) {
    return {
      code: 400,
      message: '订单ID不能为空',
      data: null
    }
  }

  try {
    // 1. 查询订单信息
    const { data: orderList } = await db.collection('orders')
      .where({
        _id: orderId,
        _openid: wxContext.OPENID
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 404,
        message: '订单不存在或无权限',
        data: null
      }
    }

    const order = orderList[0]

    // 2. 验证订单状态
    if (order.status !== 'paid') {
      return {
        code: 400,
        message: '只有已支付待核销的订单才能退款',
        data: null
      }
    }

    // 3. 检查是否已退款
    if (order.refundStatus && order.refundStatus !== 'none') {
      return {
        code: 400,
        message: '订单已申请退款，请勿重复操作',
        data: null
      }
    }

    // 4. 检查支付方式，区分余额支付和微信支付
    const paymentMethod = order.payment?.method || 'wechat'
    const _ = db.command

    // 5. 更新订单状态为"退款处理中"
    await db.collection('orders').doc(orderId).update({
      data: {
        refundStatus: 'processing',
        refundReason: reason || '用户申请退款',
        updatedAt: new Date()
      }
    })

    if (paymentMethod === 'balance') {
      // ========== 余额支付订单退款 ==========
      console.log('💰 余额支付订单退款:', {
        orderId: orderId,
        totalAmount: order.totalAmount
      })

      try {
        // 查询用户
        const { data: users } = await db.collection('users')
          .where({ _openid: wxContext.OPENID })
          .limit(1)
          .get()

        if (users.length === 0) {
          throw new Error('用户不存在')
        }

        const user = users[0]

        // 退回余额（使用原子操作）
        await db.collection('users').doc(user._id).update({
          data: {
            balance: _.inc(order.totalAmount),
            updatedAt: new Date()
          }
        })

        // 查询更新后的余额
        const { data: updatedUser } = await db.collection('users').doc(user._id).get()

        // 写入余额流水记录
        await db.collection('balance_logs').add({
          data: {
            _openid: wxContext.OPENID,
            userId: user._id,
            type: 'refund',
            changeAmount: order.totalAmount,
            beforeBalance: (updatedUser.balance || 0) - order.totalAmount,
            afterBalance: updatedUser.balance || 0,
            relatedOrderNo: order.orderNo,
            description: `订单退款（${order.boatType.name}）`,
            sort: Date.now(),
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // 更新订单状态为退款成功
        await db.collection('orders').doc(orderId).update({
          data: {
            status: 'refunded',
            refundStatus: 'success',
            refundAmount: order.totalAmount,
            refundAt: new Date(),
            isAutoRefund: false,
            updatedAt: new Date()
          }
        })

        console.log('✅ 余额退款成功')

        return {
          code: 200,
          message: '退款成功',
          data: {
            orderId: orderId,
            refundAmount: order.totalAmount,
            notice: '退款已退回到您的账户余额'
          }
        }
      } catch (error) {
        console.error('❌ 余额退款失败:', error)

        await db.collection('orders').doc(orderId).update({
          data: {
            refundStatus: 'failed',
            refundFailReason: error.message || '退款失败',
            updatedAt: new Date()
          }
        })

        return {
          code: 500,
          message: error.message || '退款失败',
          data: null
        }
      }
    } else {
      // ========== 微信支付订单退款 ==========
      // 检查是否有支付信息
      if (!order.payment || !order.payment.outTradeNo) {
        return {
          code: 400,
          message: '订单缺少支付信息，无法退款',
          data: null
        }
      }

      const outRefundNo = `REFUND${Date.now()}${Math.floor(Math.random() * 1000)}`

      console.log('💰 微信支付订单退款:', {
        orderId: orderId,
        outTradeNo: order.payment.outTradeNo,
        outRefundNo: outRefundNo,
        totalAmount: order.totalAmount
      })

      // 调用微信退款 API
      const refundResult = await cloud.cloudPay.refund({
        outTradeNo: order.payment.outTradeNo,
        outRefundNo: outRefundNo,
        totalFee: Math.round(order.totalAmount * 100),
        refundFee: Math.round(order.totalAmount * 100),
        refundDesc: reason || '用户申请退款',
        subMchId: '1106454761',
        envId: 'cc-5gos3ctb46510316',
        functionName: 'refundCallback'
      })

      console.log('💰 微信退款结果:', refundResult)

      if (refundResult.returnCode === 'SUCCESS' && refundResult.resultCode === 'SUCCESS') {
        await db.collection('orders').doc(orderId).update({
          data: {
            status: 'refunded',
            refundStatus: 'success',
            refundAmount: order.totalAmount,
            refundAt: new Date(),
            refundId: refundResult.refundId || outRefundNo,
            isAutoRefund: false,
            updatedAt: new Date()
          }
        })

        return {
          code: 200,
          message: '退款成功',
          data: {
            orderId: orderId,
            refundAmount: order.totalAmount,
            refundId: refundResult.refundId || outRefundNo,
            notice: '退款将在1-3个工作日内原路返回您的支付账户'
          }
        }
      } else {
        const errorMsg = refundResult.returnMsg || refundResult.errCodeDes || '退款失败'

        await db.collection('orders').doc(orderId).update({
          data: {
            refundStatus: 'failed',
            refundFailReason: errorMsg,
            updatedAt: new Date()
          }
        })

        console.error('❌ 微信退款失败:', refundResult)

        return {
          code: 500,
          message: errorMsg,
          data: null
        }
      }
    }

  } catch (error) {
    console.error('❌ 退款异常:', error)

    // 更新订单状态为退款失败
    try {
      await db.collection('orders').doc(orderId).update({
        data: {
          refundStatus: 'failed',
          refundFailReason: error.message || '系统错误',
          updatedAt: new Date()
        }
      })
    } catch (updateError) {
      console.error('❌ 更新订单状态失败:', updateError)
    }

    return {
      code: 500,
      message: error.message || '退款失败，请稍后重试',
      data: null
    }
  }
}

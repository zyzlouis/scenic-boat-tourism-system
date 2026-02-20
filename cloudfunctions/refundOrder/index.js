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

    // 4. 检查是否有支付信息
    if (!order.payment || !order.payment.outTradeNo) {
      return {
        code: 400,
        message: '订单缺少支付信息，无法退款',
        data: null
      }
    }

    // 5. 生成退款单号（唯一）
    const outRefundNo = `REFUND${Date.now()}${Math.floor(Math.random() * 1000)}`

    // 6. 更新订单状态为"退款处理中"
    await db.collection('orders').doc(orderId).update({
      data: {
        refundStatus: 'processing',
        refundReason: reason || '用户申请退款',
        updatedAt: new Date()
      }
    })

    console.log('💰 开始退款:', {
      orderId: orderId,
      outTradeNo: order.payment.outTradeNo,
      outRefundNo: outRefundNo,
      totalAmount: order.totalAmount
    })

    // 7. 调用微信退款 API
    const refundResult = await cloud.cloudPay.refund({
      outTradeNo: order.payment.outTradeNo,       // 商户订单号
      outRefundNo: outRefundNo,                   // 退款单号
      totalFee: Math.round(order.totalAmount * 100),   // 订单总金额（分）
      refundFee: Math.round(order.totalAmount * 100),  // 退款金额（分，全额退款）
      refundDesc: reason || '用户申请退款',        // 退款原因
      subMchId: '1106454761',                     // 商户号（必须）
      envId: 'cc-5gos3ctb46510316',              // 云环境ID
      functionName: 'refundCallback'              // 退款回调函数
    })

    console.log('💰 退款结果:', refundResult)

    // 8. 检查退款结果
    if (refundResult.returnCode === 'SUCCESS' && refundResult.resultCode === 'SUCCESS') {
      // 退款成功，更新订单状态
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
      // 退款失败
      const errorMsg = refundResult.returnMsg || refundResult.errCodeDes || '退款失败'

      await db.collection('orders').doc(orderId).update({
        data: {
          refundStatus: 'failed',
          refundFailReason: errorMsg,
          updatedAt: new Date()
        }
      })

      console.error('❌ 退款失败:', refundResult)

      return {
        code: 500,
        message: errorMsg,
        data: null
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

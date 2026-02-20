// 云函数：退款回调处理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 微信退款结果回调
 *
 * 功能：
 * 1. 接收微信退款回调
 * 2. 更新订单退款状态
 * 3. 返回成功响应（必须返回 errcode: 0）
 */
exports.main = async (event, context) => {
  console.log('📞 收到微信退款回调:', event)

  // 兼容两种命名格式：下划线（微信文档）和驼峰（实际回调）
  const returnCode = event.return_code || event.returnCode
  const resultCode = event.result_code || event.resultCode
  const refundStatus = event.refund_status || event.refundStatus  // 退款状态字段
  const outTradeNo = event.out_trade_no || event.outTradeNo
  const outRefundNo = event.out_refund_no || event.outRefundNo
  const refundId = event.refund_id || event.refundId
  const refundFee = event.refund_fee || event.refundFee

  try {
    // 1. 验证回调结果
    // 优先检查 refundStatus，如果不存在则检查 resultCode
    const isSuccess = returnCode === 'SUCCESS' && (refundStatus === 'SUCCESS' || resultCode === 'SUCCESS')

    if (!isSuccess) {
      console.warn('⚠️ 退款未成功')
      console.warn('returnCode:', returnCode)
      console.warn('resultCode:', resultCode)
      console.warn('refundStatus:', refundStatus)
      return { errcode: 0, errmsg: 'ok' }
    }

    console.log('✅ 退款成功，开始更新订单状态')

    // 2. 查询订单（通过商户订单号）
    const orderRes = await db.collection('orders')
      .where({
        'payment.outTradeNo': outTradeNo
      })
      .get()

    if (orderRes.data.length === 0) {
      console.error('❌ 订单不存在，outTradeNo:', outTradeNo)
      return { errcode: 0, errmsg: 'ok' }
    }

    const order = orderRes.data[0]

    // 3. 检查订单状态，避免重复处理
    if (order.status === 'refunded' && order.refundStatus === 'success') {
      console.log('✅ 订单已处理过，无需重复处理')
      return { errcode: 0, errmsg: 'ok' }
    }

    // 4. 更新订单状态为退款成功
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'refunded',
        refundStatus: 'success',
        refundAmount: Number(refundFee) / 100 || order.totalAmount,
        refundAt: new Date(),
        refundId: refundId || outRefundNo,
        updatedAt: new Date()
      }
    })

    console.log('✅ 退款回调处理完成')
    console.log('📦 订单ID:', order._id)
    console.log('💰 退款金额:', Number(refundFee) / 100, '元')
    console.log('🆔 退款单号:', refundId || outRefundNo)

    // 5. 返回成功响应（微信要求必须返回 errcode: 0）
    return {
      errcode: 0,
      errmsg: 'ok'
    }

  } catch (error) {
    console.error('❌ 退款回调处理失败:', error)

    // 即使出错也要返回成功，避免微信重复回调
    return {
      errcode: 0,
      errmsg: 'ok'
    }
  }
}

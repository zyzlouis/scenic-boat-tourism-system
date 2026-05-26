// 云函数：微信支付回调处理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 生成核销码（6位大写字母+数字）
 */
function generateVerificationCode() {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'  // 移除容易混淆的字符 I、O
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 微信支付结果回调
 *
 * 功能：
 * 1. 接收微信支付回调
 * 2. 更新订单状态为已支付
 * 3. 生成核销码
 * 4. 返回成功响应（必须返回 errcode: 0）
 */
exports.main = async (event, context) => {
  console.log('📞 收到微信支付回调:', event)

  // 兼容两种命名格式：下划线（微信文档）和驼峰（实际回调）
  const returnCode = event.return_code || event.returnCode
  const resultCode = event.result_code || event.resultCode
  const outTradeNo = event.out_trade_no || event.outTradeNo
  const transactionId = event.transaction_id || event.transactionId
  const totalFee = event.total_fee || event.totalFee
  const cashFee = event.cash_fee || event.cashFee
  const timeEnd = event.time_end || event.timeEnd

  try {
    // 1. 验证回调结果
    if (returnCode !== 'SUCCESS' || resultCode !== 'SUCCESS') {
      console.warn('⚠️ 支付未成功，returnCode:', returnCode, 'resultCode:', resultCode)
      return { errcode: 0, errmsg: 'ok' }
    }

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
    if (order.status === 'paid') {
      console.log('✅ 订单已处理过，无需重复处理')
      return { errcode: 0, errmsg: 'ok' }
    }

    // 4. 解析支付完成时间（格式：YYYYMMDDHHmmss）
    let paidAtDate = new Date()
    if (timeEnd && timeEnd.length === 14) {
      try {
        const year = timeEnd.substring(0, 4)
        const month = timeEnd.substring(4, 6)
        const day = timeEnd.substring(6, 8)
        const hour = timeEnd.substring(8, 10)
        const min = timeEnd.substring(10, 12)
        const sec = timeEnd.substring(12, 14)
        paidAtDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+08:00`)
      } catch (e) {
        console.error('❌ 解析支付时间失败:', e)
        paidAtDate = new Date()
      }
    }

    // 5. 根据订单类型处理
    const isProductOrder = order.orderNo && order.orderNo.startsWith('PROD')

    let updateData = {
      'payment.transactionId': transactionId || 'CALLBACK',
      'payment.paidAmount': Number(cashFee || totalFee) / 100 || 0,
      'payment.paidAt': paidAtDate,
      updatedAt: new Date()
    }

    if (isProductOrder && !order.needVerification) {
      updateData.status = 'completed'
      updateData.completedAt = new Date()
    } else {
      const verificationCode = generateVerificationCode()
      updateData.status = 'paid'
      updateData.verificationCode = verificationCode
      console.log('🔑 核销码:', verificationCode)
    }

    if (isProductOrder && order.needVerification && !order.verificationDeadline) {
      const days = order.verificationDays || 15
      updateData.verificationDeadline = new Date(paidAtDate.getTime() + days * 24 * 60 * 60 * 1000)
    }

    // 6. 更新订单状态
    await db.collection('orders').doc(order._id).update({
      data: updateData
    })

    console.log('✅ 支付回调处理完成')
    console.log('📦 订单ID:', order._id)
    console.log('💰 支付金额:', Number(cashFee || totalFee) / 100, '元')

    // 7. 返回成功响应（微信要求必须返回 errcode: 0）
    return {
      errcode: 0,
      errmsg: 'ok'
    }

  } catch (error) {
    console.error('❌ 支付回调处理失败:', error)

    // 即使出错也要返回成功，避免微信重复回调
    return {
      errcode: 0,
      errmsg: 'ok'
    }
  }
}

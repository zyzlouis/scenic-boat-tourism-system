// 云函数：充值微信支付回调
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 充值微信支付回调
 *
 * 由微信支付系统在用户支付成功后自动调用（与 wechatPayCallback 同理）
 * 功能：
 * 1. 验证支付结果
 * 2. 更新充值订单状态
 * 3. 更新用户余额（充值金额 + 赠送金额）
 * 4. 写入余额变动日志
 */
exports.main = async (event, context) => {
  console.log('📞 收到充值支付回调:', event)

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
      console.warn('⚠️ 充值支付未成功，returnCode:', returnCode, 'resultCode:', resultCode)
      return { errcode: 0, errmsg: 'ok' }
    }

    // 2. 通过商户订单号查询充值订单
    const { data: orders } = await db.collection('recharge_orders')
      .where({ outTradeNo: outTradeNo })
      .limit(1)
      .get()

    if (orders.length === 0) {
      console.error('❌ 充值订单不存在，outTradeNo:', outTradeNo)
      return { errcode: 0, errmsg: 'ok' }
    }

    const order = orders[0]

    // 3. 防止重复处理
    if (order.status === 'success') {
      console.log('✅ 充值订单已处理过，跳过重复回调')
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

    const now = new Date()

    // 5. 更新充值订单状态为 success
    await db.collection('recharge_orders').doc(order._id).update({
      data: {
        status: 'success',
        transactionId: transactionId || 'CALLBACK',
        paidAt: paidAtDate,
        updatedAt: now
      }
    })

    // 6. 更新用户余额（使用原子操作，防止并发问题）
    const { data: users } = await db.collection('users')
      .where({ _openid: order._openid })
      .limit(1)
      .get()

    let userId = order.userId

    if (users.length === 0) {
      // 用户不存在，创建用户记录
      const newUser = {
        _openid: order._openid,
        balance: order.totalAmount,
        totalRecharge: order.amount,
        totalGift: order.giftAmount,
        isVip: true,
        createdAt: now,
        updatedAt: now
      }
      const { _id } = await db.collection('users').add({ data: newUser })
      userId = _id
    } else {
      // 用户存在，更新余额
      const user = users[0]
      userId = user._id

      await db.collection('users').doc(userId).update({
        data: {
          balance: _.inc(order.totalAmount),
          totalRecharge: _.inc(order.amount),
          totalGift: _.inc(order.giftAmount),
          isVip: true,
          updatedAt: now
        }
      })
    }

    // 7. 写入 balance_logs 流水记录
    const { data: updatedUser } = await db.collection('users').doc(userId).get()

    await db.collection('balance_logs').add({
      data: {
        _openid: order._openid,
        userId: userId,
        type: 'recharge',
        changeAmount: order.totalAmount,
        beforeBalance: (updatedUser.balance || 0) - order.totalAmount,
        afterBalance: updatedUser.balance || 0,
        relatedOrderNo: order.orderNo,
        description: `充值${order.amount}元,赠送${order.giftAmount}元`,
        sort: Date.now(),
        enabled: true,
        createdAt: now,
        updatedAt: now
      }
    })

    console.log('✅ 充值回调处理完成')
    console.log('📦 充值订单ID:', order._id)
    console.log('💰 充值金额:', order.amount, '元，赠送:', order.giftAmount, '元')
    console.log('💰 用户当前余额:', updatedUser.balance, '元')

    // 8. 返回成功响应（微信要求必须返回 errcode: 0）
    return {
      errcode: 0,
      errmsg: 'ok'
    }

  } catch (error) {
    console.error('❌ 充值回调处理失败:', error)

    // 即使出错也要返回成功，避免微信重复回调
    return {
      errcode: 0,
      errmsg: 'ok'
    }
  }
}

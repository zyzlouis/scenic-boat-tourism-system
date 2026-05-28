// 云函数：使用余额支付订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成核销码
function generateVerificationCode() {
  const timestamp = Date.now().toString().slice(-6)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `VF${timestamp}${random}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId } = event

  try {
    // 1. 查询订单
    const { data: order } = await db.collection('orders').doc(orderId).get()

    if (!order) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    if (order._openid !== openid) {
      return {
        success: false,
        message: '无权操作此订单'
      }
    }

    if (order.status !== 'pending') {
      return {
        success: false,
        message: '订单状态不正确'
      }
    }

    // 2. 查询用户余额
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (users.length === 0 || !users[0].balance || users[0].balance < order.totalAmount) {
      return {
        success: false,
        message: '余额不足',
        balance: users.length > 0 ? users[0].balance || 0 : 0,
        requiredAmount: order.totalAmount
      }
    }

    const user = users[0]
    const now = new Date()

    // 3. 扣减用户余额（使用原子操作）
    await db.collection('users').doc(user._id).update({
      data: {
        balance: _.inc(-order.totalAmount),
        updatedAt: now
      }
    })

    // 4. 更新订单状态（如果失败则回滚余额）
    const isProductOrder = order.orderType === 'product'
    let updateData = {
      'payment.method': 'balance',
      'payment.paidAt': now,
      'payment.transactionId': `BAL_${order.orderNo}`,
      updatedAt: now
    }

    let verificationCode = null
    if (isProductOrder && !order.needVerification) {
      updateData.status = 'completed'
      updateData.completedAt = now
    } else {
      verificationCode = generateVerificationCode()
      updateData.status = 'paid'
      updateData.verificationCode = verificationCode
    }

    if (isProductOrder && order.needVerification && !order.verificationDeadline) {
      const days = order.verificationDays || 15
      updateData.verificationDeadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    }

    try {
      await db.collection('orders').doc(orderId).update({ data: updateData })
    } catch (orderUpdateError) {
      console.error('订单更新失败，回滚余额:', orderUpdateError)
      await db.collection('users').doc(user._id).update({
        data: { balance: _.inc(order.totalAmount), updatedAt: new Date() }
      })
      return { success: false, message: '支付失败，余额已退回' }
    }

    // 5. 写入 balance_logs 流水记录
    const { data: updatedUser } = await db.collection('users').doc(user._id).get()

    const orderName = isProductOrder
      ? (order.productName || '商品')
      : (order.boatType ? order.boatType.name : '游船')

    await db.collection('balance_logs').add({
      data: {
        _openid: openid,
        userId: user._id,
        type: 'consume',
        changeAmount: -order.totalAmount,
        beforeBalance: user.balance,
        afterBalance: updatedUser.balance,
        relatedOrderNo: order.orderNo,
        description: `支付订单（${orderName}）`,
        sort: Date.now(),
        enabled: true,
        createdAt: now,
        updatedAt: now
      }
    })

    return {
      success: true,
      message: '支付成功',
      verificationCode: verificationCode,
      balance: updatedUser.balance
    }
  } catch (error) {
    console.error('余额支付失败:', error)
    return {
      success: false,
      message: '余额支付失败',
      error: error.message
    }
  }
}

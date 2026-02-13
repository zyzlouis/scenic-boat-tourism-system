// 云函数：充值支付回调
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderNo, transactionId } = event

  try {
    // 1. 查询充值订单
    const { data: orders } = await db.collection('recharge_orders')
      .where({ orderNo: orderNo })
      .limit(1)
      .get()

    if (orders.length === 0) {
      return {
        success: false,
        message: '充值订单不存在'
      }
    }

    const order = orders[0]

    // 防止重复回调
    if (order.status === 'success') {
      return {
        success: true,
        message: '订单已处理，跳过重复回调'
      }
    }

    const now = new Date()

    // 2. 更新充值订单状态为 success
    await db.collection('recharge_orders').doc(order._id).update({
      data: {
        status: 'success',
        transactionId: transactionId,
        paidAt: now,
        updatedAt: now
      }
    })

    // 3. 更新用户余额（使用原子操作，防止并发问题）
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

    // 4. 写入 balance_logs 流水记录
    const { data: updatedUser } = await db.collection('users').doc(userId).get()

    await db.collection('balance_logs').add({
      data: {
        _openid: order._openid,
        userId: userId,
        type: 'recharge',
        changeAmount: order.totalAmount,
        beforeBalance: (updatedUser.balance || 0) - order.totalAmount,
        afterBalance: updatedUser.balance || 0,
        relatedOrderNo: orderNo,
        description: `充值${order.amount}元,赠送${order.giftAmount}元`,
        sort: Date.now(),
        enabled: true,
        createdAt: now,
        updatedAt: now
      }
    })

    return {
      success: true,
      message: '充值成功',
      balance: updatedUser.balance || 0
    }
  } catch (error) {
    console.error('充值回调处理失败:', error)
    return {
      success: false,
      message: '充值回调处理失败',
      error: error.message
    }
  }
}

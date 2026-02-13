// 云函数：取消订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId } = event

  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }

  try {
    // 1. 查询订单
    const { data: order } = await db.collection('orders').doc(orderId).get()

    if (!order) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    // 2. 验证是否是订单所有者
    if (order._openid !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权操作此订单'
      }
    }

    // 3. 验证订单状态（只有待支付状态可以取消）
    if (order.status !== 'pending') {
      return {
        success: false,
        message: '只有待支付的订单可以取消'
      }
    }

    // 4. 更新订单状态为 cancelled
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      message: '订单已取消'
    }
  } catch (error) {
    console.error('取消订单失败:', error)
    return {
      success: false,
      message: '取消订单失败',
      error: error.message
    }
  }
}

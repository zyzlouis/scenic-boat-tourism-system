// 云函数：船号反查订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { boatNumber } = event

  if (!boatNumber) {
    return {
      code: 400,
      message: '船号不能为空',
      data: null
    }
  }

  try {
    // 通过船号查找计时中的订单
    const { data: orderList } = await db.collection('orders')
      .where({
        'boat.number': boatNumber.toUpperCase(),
        status: 'timing'
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 404,
        message: '该船号当前无使用中的订单',
        data: null
      }
    }

    const order = orderList[0]

    // 查询用户信息
    const { data: userList } = await db.collection('users')
      .where({
        _openid: order._openid
      })
      .get()

    const user = userList[0] || { nickname: '游客' }

    // 计算当前使用时长
    const now = new Date()
    const startTime = new Date(order.timing.startTime)
    const usedSeconds = Math.floor((now - startTime) / 1000)
    const usedMinutes = Math.ceil(usedSeconds / 60)

    return {
      code: 200,
      message: '成功',
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        boatNumber: order.boat.number,
        boatTypeName: order.boatType.name,
        userNickname: user.nickname,
        status: order.status,
        startTime: order.timing.startTime,
        usedMinutes: usedMinutes
      }
    }
  } catch (error) {
    console.error('船号反查失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

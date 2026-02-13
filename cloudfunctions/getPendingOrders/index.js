// 云函数：获取待处理订单列表（计时中的订单）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 查询所有计时中的订单
    const { data: orderList } = await db.collection('orders')
      .where({
        status: 'timing'
      })
      .orderBy('timing.startTime', 'asc')
      .get()

    // 获取所有用户信息
    const userOpenids = [...new Set(orderList.map(order => order._openid))]
    const { data: userList } = await db.collection('users')
      .where({
        _openid: db.command.in(userOpenids)
      })
      .get()

    // 构建用户映射
    const userMap = {}
    userList.forEach(user => {
      userMap[user._openid] = user
    })

    // 计算每个订单的实时数据
    const now = new Date()
    const result = orderList.map(order => {
      const startTime = new Date(order.timing.startTime)
      const usedSeconds = Math.floor((now - startTime) / 1000)
      const usedMinutes = Math.ceil(usedSeconds / 60)

      let isOvertime = false
      let overtimeMinutes = 0

      if (usedMinutes > order.pricing.includedMinutes) {
        isOvertime = true
        overtimeMinutes = usedMinutes - order.pricing.includedMinutes
      }

      const user = userMap[order._openid] || { nickname: '游客' }

      return {
        orderId: order._id,
        orderNo: order.orderNo,
        boatNumber: order.boat.number,
        boatTypeName: order.boatType.name,
        userNickname: user.nickname,
        startTime: order.timing.startTime,
        usedMinutes: usedMinutes,
        isOvertime: isOvertime,
        overtimeMinutes: overtimeMinutes
      }
    })

    return {
      code: 200,
      message: '成功',
      data: result
    }
  } catch (error) {
    console.error('获取待处理订单失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

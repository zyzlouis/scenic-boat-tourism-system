// 云函数：获取订单详情
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
      code: 400,
      message: '订单ID不能为空',
      data: null
    }
  }

  try {
    // 查询订单
    const { data: orderList } = await db.collection('orders')
      .where({
        _id: orderId,
        _openid: wxContext.OPENID  // 只能查看自己的订单
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      }
    }

    const order = orderList[0]

    // 如果订单正在计时中，计算实时数据
    let usedMinutes = order.timing.usedMinutes
    let overtimeMinutes = order.timing.overtimeMinutes
    let overtimeFee = order.timing.overtimeFee
    let estimatedTotalFee = order.pricing.basePrice

    if (order.status === 'timing' && order.timing.startTime) {
      const now = new Date()
      const startTime = new Date(order.timing.startTime)
      const usedSeconds = Math.floor((now - startTime) / 1000)
      usedMinutes = Math.ceil(usedSeconds / 60)

      // 计算超时费用
      if (usedMinutes > order.pricing.includedMinutes) {
        overtimeMinutes = usedMinutes - order.pricing.includedMinutes
        overtimeFee = Math.min(
          overtimeMinutes * order.pricing.overtimeRate,
          order.pricing.capAmount || Infinity
        )
      } else {
        overtimeMinutes = 0
        overtimeFee = 0
      }

      estimatedTotalFee = order.pricing.basePrice + overtimeFee
    }

    return {
      code: 200,
      message: '成功',
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        boatTypeId: order.boatType.id,
        boatTypeName: order.boatType.name,
        boatNumber: order.boat.number,
        basePrice: order.pricing.basePrice,
        depositAmount: order.pricing.depositAmount,
        totalAmount: order.totalAmount,
        includedMinutes: order.pricing.includedMinutes,
        overtimeRate: order.pricing.overtimeRate,
        verificationCode: order.verificationCode,
        status: order.status,
        startTime: order.timing.startTime,
        endTime: order.timing.endTime,
        usedMinutes: usedMinutes,
        overtimeMinutes: overtimeMinutes,
        overtimeFee: overtimeFee,
        estimatedTotalFee: estimatedTotalFee,
        refundAmount: order.settlement.refundAmount,
        finalAmount: order.settlement.finalAmount,
        createdAt: order.createdAt,
        completedAt: order.completedAt
      }
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

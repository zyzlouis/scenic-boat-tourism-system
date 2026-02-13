// 云函数：扫码核销（员工端）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { verificationCode, staffId } = event

  if (!verificationCode) {
    return {
      code: 400,
      message: '核销码不能为空',
      data: null
    }
  }

  try {
    // 查找订单
    const { data: orderList } = await db.collection('orders')
      .where({
        verificationCode: verificationCode,
        isDeleted: false  // orders集合保持原结构
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 10003,
        message: '核销码无效',
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

    // 判断是发船还是收船
    if (order.status === 'paid') {
      // 待发船 - 检查订单是否超时
      const now = new Date()
      const createdAt = new Date(order.createdAt)
      const hoursSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60))

      // 支付后超过24小时未核销，订单失效
      if (hoursSinceCreated > 24) {
        return {
          code: 10004,
          message: `订单已超时${hoursSinceCreated}小时，无法核销。请联系管理员处理。`,
          data: null
        }
      }

      // 支付后超过2小时，给出警告但允许核销
      if (hoursSinceCreated > 2) {
        console.warn(`⚠️ 订单 ${order.orderNo} 已创建 ${hoursSinceCreated} 小时`);
      }

      return {
        code: 200,
        message: '扫码成功，请绑定船号',
        data: {
          orderId: order._id,
          orderNo: order.orderNo,
          boatTypeName: order.boatType.name,  // 嵌套字段
          action: 'start',
          userNickname: user.nickname,
          basePrice: order.pricing.basePrice,  // 嵌套字段
          depositAmount: order.pricing.depositAmount,  // 嵌套字段
          includedMinutes: order.pricing.includedMinutes  // 嵌套字段
        }
      }
    } else if (order.status === 'timing') {
      // 待收船 - 计算当前费用

      // 验证 startTime 有效性
      if (!order.timing.startTime) {  // 嵌套字段
        return {
          code: 10005,
          message: '订单数据异常：缺少开始时间。请联系管理员处理。',
          data: null
        }
      }

      const now = new Date()
      const startTime = new Date(order.timing.startTime)  // 嵌套字段

      // 验证 startTime 是否为有效日期
      if (isNaN(startTime.getTime())) {
        return {
          code: 10006,
          message: '订单数据异常：开始时间无效。请联系管理员处理。',
          data: null
        }
      }

      // 检查时间是否合理（不能是1970年）
      if (startTime.getFullYear() < 2024) {
        return {
          code: 10007,
          message: '订单数据异常：开始时间错误。请联系管理员处理。',
          data: null
        }
      }

      const usedSeconds = Math.floor((now - startTime) / 1000)
      const usedMinutes = Math.ceil(usedSeconds / 60)

      // 检查使用时长是否合理（不能超过48小时）
      if (usedMinutes > 48 * 60) {
        return {
          code: 10008,
          message: `使用时长异常（${Math.floor(usedMinutes / 60)}小时），请联系管理员处理。`,
          data: null
        }
      }

      let overtimeMinutes = 0
      let overtimeFee = 0

      if (usedMinutes > order.pricing.includedMinutes) {  // 嵌套字段
        overtimeMinutes = usedMinutes - order.pricing.includedMinutes
        overtimeFee = Math.min(
          overtimeMinutes * order.pricing.overtimeRate,  // 嵌套字段
          order.pricing.capAmount || Infinity  // 嵌套字段
        )
      }

      const refundAmount = order.pricing.depositAmount - overtimeFee  // 嵌套字段
      const finalAmount = order.pricing.basePrice + overtimeFee  // 嵌套字段

      return {
        code: 200,
        message: '扫码成功，请确认结束',
        data: {
          orderId: order._id,
          orderNo: order.orderNo,
          boatTypeName: order.boatType.name,  // 嵌套字段
          boatNumber: order.boat.number,  // 嵌套字段
          action: 'end',
          startTime: order.timing.startTime,  // 嵌套字段
          usedMinutes: usedMinutes,
          includedMinutes: order.pricing.includedMinutes,  // 嵌套字段
          overtimeMinutes: overtimeMinutes,
          overtimeFee: overtimeFee.toFixed(2),
          refundAmount: refundAmount.toFixed(2),
          finalAmount: finalAmount.toFixed(2)
        }
      }
    } else {
      return {
        code: 10002,
        message: '订单状态不正确',
        data: null
      }
    }
  } catch (error) {
    console.error('扫码核销失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

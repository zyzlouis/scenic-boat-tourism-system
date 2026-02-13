// 云函数：收船（结束计时）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderId, staffId } = event

  if (!orderId) {
    return {
      code: 400,
      message: '订单ID不能为空',
      data: null
    }
  }

  try {
    // 查找订单
    const { data: orderList } = await db.collection('orders')
      .where({
        _id: orderId
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 10001,
        message: '订单不存在',
        data: null
      }
    }

    const order = orderList[0]

    if (order.status !== 'timing') {
      return {
        code: 10002,
        message: '订单状态不正确，无法收船',
        data: null
      }
    }

    const endTime = new Date()
    const startTime = new Date(order.timing.startTime)  // 嵌套字段

    // 计算使用时长
    const usedSeconds = Math.floor((endTime - startTime) / 1000)
    const usedMinutes = Math.ceil(usedSeconds / 60)

    // 计算超时费用
    let overtimeMinutes = 0
    let overtimeFee = 0

    if (usedMinutes > order.pricing.includedMinutes) {  // 嵌套字段
      overtimeMinutes = usedMinutes - order.pricing.includedMinutes
      overtimeFee = Math.min(
        overtimeMinutes * order.pricing.overtimeRate,  // 嵌套字段
        order.pricing.capAmount || Infinity  // 嵌套字段
      )
    }

    // 计算最终费用和退款金额
    const finalAmount = order.pricing.basePrice + overtimeFee  // 嵌套字段
    const refundAmount = order.pricing.depositAmount - overtimeFee  // 嵌套字段

    // 1. 更新订单 - 保持嵌套结构（orders不需要CMS编辑）
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        'timing.endTime': endTime,  // 嵌套字段
        'timing.usedSeconds': usedSeconds,  // 嵌套字段
        'timing.usedMinutes': usedMinutes,  // 嵌套字段
        'timing.overtimeMinutes': overtimeMinutes,  // 嵌套字段
        'timing.overtimeFee': overtimeFee,  // 嵌套字段
        'settlement.finalAmount': finalAmount,  // 嵌套字段
        'settlement.refundAmount': refundAmount,  // 嵌套字段
        'settlement.refundedAt': endTime,  // 嵌套字段 TODO: 实际应该在退款成功后设置
        updatedAt: endTime,
        completedAt: endTime
      }
    })

    // 2. 更新船只状态为空闲
    if (order.boat.id) {  // 嵌套字段
      await db.collection('boats').doc(order.boat.id).update({
        data: {
          status: 'idle',
          updatedAt: endTime
        }
      })
    }

    // 3. 记录核销日志 - 扁平化结构（verificationLogs需要CMS友好）
    await db.collection('verificationLogs').add({
      data: {
        orderId: orderId,
        orderNo: order.orderNo,  // 冗余字段
        staffId: staffId || 'unknown',
        staffName: '员工',
        boatId: order.boat.id,  // 嵌套字段
        boatNumber: order.boat.number,  // 嵌套字段
        actionType: 'end',
        scanTime: endTime,
        remark: '',
        sort: Date.now(),  // CMS通用字段
        enabled: true,  // CMS通用字段
        createdAt: endTime,
        updatedAt: endTime
      }
    })

    // 4. 处理退款（根据原支付方式）
    if (refundAmount > 0) {
      if (order.payment.method === 'balance') {
        // 余额支付的订单，退款退回余额
        try {
          // 查询用户
          const { data: users } = await db.collection('users')
            .where({ _openid: order._openid })
            .limit(1)
            .get()

          if (users.length > 0) {
            const user = users[0]

            // 退回余额（使用原子操作）
            await db.collection('users').doc(user._id).update({
              data: {
                balance: _.inc(refundAmount),
                updatedAt: endTime
              }
            })

            // 写入余额流水记录
            const { data: updatedUser } = await db.collection('users').doc(user._id).get()

            await db.collection('balance_logs').add({
              data: {
                _openid: order._openid,
                userId: user._id,
                type: 'refund',
                changeAmount: refundAmount,
                beforeBalance: (updatedUser.balance || 0) - refundAmount,
                afterBalance: updatedUser.balance || 0,
                relatedOrderNo: order.orderNo,
                description: `退还押金（${order.boatType.name}）`,
                sort: Date.now(),
                enabled: true,
                createdAt: endTime,
                updatedAt: endTime
              }
            })

            console.log(`余额退款成功：订单${order.orderNo}，退款金额：${refundAmount}元`)
          }
        } catch (error) {
          console.error('余额退款失败:', error)
        }
      } else {
        // 微信支付的订单，调用微信退款API
        // TODO: 调用微信支付退款API
        console.log(`微信退款待处理：订单${order.orderNo}，退款金额：${refundAmount}元`)
      }
    }

    return {
      code: 200,
      message: '收船成功，已结算',
      data: {
        orderId: orderId,
        boatNumber: order.boat.number,  // 嵌套字段
        startTime: startTime,
        endTime: endTime,
        usedMinutes: usedMinutes,
        overtimeMinutes: overtimeMinutes,
        overtimeFee: overtimeFee.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        finalAmount: finalAmount.toFixed(2),
        status: 'completed'
      }
    }
  } catch (error) {
    console.error('收船失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

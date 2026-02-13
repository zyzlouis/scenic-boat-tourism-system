// 云函数：发船（开始计时）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderId, boatNumber, staffId } = event

  if (!orderId || !boatNumber) {
    return {
      code: 400,
      message: '订单ID和船号不能为空',
      data: null
    }
  }

  try {
    // 查找船只
    const { data: boatList } = await db.collection('boats')
      .where({
        boatNumber: boatNumber.toUpperCase(),
        enabled: true  // CMS规范
      })
      .get()

    if (boatList.length === 0) {
      return {
        code: 30001,
        message: '船只不存在',
        data: null
      }
    }

    const boat = boatList[0]

    if (boat.status !== 'idle') {
      return {
        code: 30002,
        message: '船只正在使用中',
        data: null
      }
    }

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

    if (order.status !== 'paid') {
      return {
        code: 10002,
        message: '订单状态不正确，无法发船',
        data: null
      }
    }

    const startTime = new Date()

    // 开始事务操作
    // 1. 更新订单 - 保持嵌套结构（orders不需要CMS编辑）
    await db.collection('orders').doc(orderId).update({
      data: {
        'boat.id': boat._id,  // 嵌套字段
        'boat.number': boat.boatNumber,  // 嵌套字段
        status: 'timing',
        'timing.startTime': startTime,  // 嵌套字段
        updatedAt: startTime
      }
    })

    // 2. 更新船只状态
    await db.collection('boats').doc(boat._id).update({
      data: {
        status: 'in_use',
        lastUsedAt: startTime,
        updatedAt: startTime
      }
    })

    // 3. 记录核销日志 - 扁平化结构（verificationLogs需要CMS友好）
    await db.collection('verificationLogs').add({
      data: {
        orderId: orderId,
        orderNo: order.orderNo,  // 冗余字段
        staffId: staffId || 'unknown',
        staffName: '员工',  // TODO: 查询员工姓名
        boatId: boat._id,
        boatNumber: boat.boatNumber,
        actionType: 'start',
        scanTime: startTime,
        remark: '',
        sort: Date.now(),  // CMS通用字段
        enabled: true,  // CMS通用字段
        createdAt: startTime,
        updatedAt: startTime
      }
    })

    return {
      code: 200,
      message: '发船成功，已开始计时',
      data: {
        orderId: orderId,
        boatNumber: boat.boatNumber,
        startTime: startTime,
        status: 'timing'
      }
    }
  } catch (error) {
    console.error('发船失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

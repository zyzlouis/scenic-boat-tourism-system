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
        enabled: true
      })
      .get()

    if (boatList.length === 0) {
      return { code: 30001, message: '船只不存在', data: null }
    }

    const boat = boatList[0]

    if (boat.status !== 'idle') {
      return { code: 30002, message: '船只正在使用中', data: null }
    }

    // 查找订单
    const { data: orderList } = await db.collection('orders')
      .where({ _id: orderId })
      .get()

    if (orderList.length === 0) {
      return { code: 10001, message: '订单不存在', data: null }
    }

    const order = orderList[0]

    if (order.status !== 'paid') {
      return { code: 10002, message: '订单状态不正确，无法发船', data: null }
    }

    // 船型校验：检查船只的船型是否与订单的船型一致
    const orderBoatTypeCode = order.boatType?.code || order.boatType?.id
    const boatTypeCode = boat.boatTypeCode || boat.boatTypeId
    if (orderBoatTypeCode && boatTypeCode && orderBoatTypeCode !== boatTypeCode) {
      return {
        code: 30003,
        message: `船型不匹配：订单要求「${order.boatType?.name || orderBoatTypeCode}」，但船号${boat.boatNumber}属于其他船型`,
        data: null
      }
    }

    // 查询核销员工真实姓名
    let staffName = '未知员工'
    if (staffId) {
      try {
        const { data: staffInfo } = await db.collection('staff').doc(staffId).get()
        staffName = staffInfo.realName || staffInfo.username || '未知员工'
      } catch (e) {
        console.warn('查询员工信息失败:', e.message)
      }
    }

    const startTime = new Date()

    // 1. 更新订单
    await db.collection('orders').doc(orderId).update({
      data: {
        'boat.id': boat._id,
        'boat.number': boat.boatNumber,
        status: 'timing',
        'timing.startTime': startTime,
        'verification.startStaffId': staffId || 'unknown',
        'verification.startStaffName': staffName,
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

    // 3. 记录核销日志
    await db.collection('verificationLogs').add({
      data: {
        orderId: orderId,
        orderNo: order.orderNo,
        staffId: staffId || 'unknown',
        staffName: staffName,
        boatId: boat._id,
        boatNumber: boat.boatNumber,
        actionType: 'start',
        scanTime: startTime,
        remark: '',
        sort: Date.now(),
        enabled: true,
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

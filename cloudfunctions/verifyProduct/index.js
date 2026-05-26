const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId, staffId } = event

  if (!orderId) {
    return { code: 400, message: '订单ID不能为空', data: null }
  }

  try {
    const { data: order } = await db.collection('orders').doc(orderId).get()

    if (!order) {
      return { code: 404, message: '订单不存在', data: null }
    }

    if (order.orderType !== 'product') {
      return { code: 400, message: '非商品订单，无法使用此方式核销', data: null }
    }

    if (order.status !== 'paid') {
      return { code: 400, message: '订单状态不正确，无法核销', data: null }
    }

    if (!order.needVerification) {
      return { code: 400, message: '该商品无需核销', data: null }
    }

    if (order.verificationDeadline && new Date() > new Date(order.verificationDeadline)) {
      return { code: 400, message: '核销码已过期，请联系管理员处理', data: null }
    }

    let staffName = ''
    if (staffId) {
      try {
        const { data: staff } = await db.collection('staff').doc(staffId).get()
        staffName = staff.realName || staff.username || ''
      } catch (e) {}
    }

    const now = new Date()
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        verifiedAt: now,
        verifiedStaffId: staffId || '',
        verifiedStaffName: staffName,
        completedAt: now,
        updatedAt: now
      }
    })

    return {
      code: 200,
      message: '核销成功',
      data: {
        orderId: orderId,
        orderNo: order.orderNo,
        productName: order.productName,
        quantity: order.quantity,
        verifiedAt: now,
        verifiedStaffName: staffName
      }
    }
  } catch (error) {
    console.error('商品核销失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}

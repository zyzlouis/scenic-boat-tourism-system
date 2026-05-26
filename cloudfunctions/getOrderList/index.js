// 云函数：获取用户订单列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10, orderType } = event

  try {
    // 查询用户的订单列表（按创建时间倒序）
    const skip = (page - 1) * pageSize

    const whereCondition = {
      _openid: wxContext.OPENID,
      isDeleted: false
    }

    if (orderType === 'product') {
      whereCondition.orderType = 'product'
    } else if (orderType === 'boat') {
      const _ = db.command
      whereCondition.orderType = _.neq('product')
    }

    const { total } = await db.collection('orders')
      .where(whereCondition)
      .count()

    const { data: orderList } = await db.collection('orders')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 格式化订单数据
    const result = orderList.map(order => ({
      orderId: order._id,
      orderNo: order.orderNo,
      orderType: order.orderType || 'boat',
      boatTypeName: order.boatType ? order.boatType.name : '',
      boatNumber: order.boat ? order.boat.number : '',
      productName: order.productName || '',
      projectName: order.projectName || '',
      quantity: order.quantity || 0,
      needVerification: order.needVerification || false,
      verificationDeadline: order.verificationDeadline || null,
      verifiedAt: order.verifiedAt || null,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      finalAmount: order.settlement ? order.settlement.finalAmount : null,
      refundAmount: order.settlement ? order.settlement.refundAmount : null
    }))

    return {
      code: 200,
      message: '成功',
      data: {
        list: result,
        total: total,
        page: page,
        pageSize: pageSize,
        hasMore: skip + result.length < total
      }
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

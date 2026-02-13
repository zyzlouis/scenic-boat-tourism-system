// 云函数：模拟支付（仅用于测试）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 生成核销码
function generateVerificationCode() {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'  // 移除容易混淆的字符
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

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
        _openid: wxContext.OPENID
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

    // 检查订单状态
    if (order.status !== 'pending') {
      return {
        code: 400,
        message: '订单状态不正确',
        data: null
      }
    }

    // 生成核销码
    const verificationCode = generateVerificationCode()

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        verificationCode: verificationCode,
        'payment.transactionId': `MOCK${Date.now()}`,  // 模拟交易号
        'payment.paidAt': new Date(),
        updatedAt: new Date()
      }
    })

    return {
      code: 200,
      message: '支付成功',
      data: {
        orderId: orderId,
        verificationCode: verificationCode
      }
    }
  } catch (error) {
    console.error('模拟支付失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

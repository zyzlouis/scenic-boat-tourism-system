// 云函数：创建充值订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 生成充值订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `RC${year}${month}${day}${hour}${minute}${second}${random}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { planId } = event

  try {
    // 1. 根据 planId 查询充值方案（验证有效性）
    const { data: plan } = await db.collection('recharge_plans').doc(planId).get()

    if (!plan || !plan.enabled) {
      return {
        success: false,
        message: '充值方案不存在或已停用'
      }
    }

    // 2. 查询用户信息
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    const userId = users.length > 0 ? users[0]._id : null

    // 3. 生成充值订单号
    const orderNo = generateOrderNo()

    // 4. 创建充值订单（status: pending）
    const now = new Date()
    const orderData = {
      _openid: openid,
      userId: userId,
      orderNo: orderNo,
      planName: plan.name,
      amount: plan.amount,
      giftAmount: plan.giftAmount,
      totalAmount: plan.totalAmount,
      status: 'pending',
      transactionId: '',
      paidAt: null,
      remark: '',
      sort: Date.now(),
      enabled: true,
      createdAt: now,
      updatedAt: now
    }

    const { _id: orderId } = await db.collection('recharge_orders').add({
      data: orderData
    })

    // 5. 调用微信支付统一下单
    // TODO: 实际生产环境需要调用微信支付API
    // 这里返回模拟的支付参数

    const paymentParams = {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).substring(2, 15),
      package: `prepay_id=mock_prepay_id_${orderId}`,
      signType: 'MD5',
      paySign: 'mock_pay_sign',
      orderId: orderId,
      orderNo: orderNo
    }

    return {
      success: true,
      message: '充值订单创建成功',
      orderId: orderId,
      orderNo: orderNo,
      paymentParams: paymentParams
    }
  } catch (error) {
    console.error('创建充值订单失败:', error)
    return {
      success: false,
      message: '创建充值订单失败',
      error: error.message
    }
  }
}

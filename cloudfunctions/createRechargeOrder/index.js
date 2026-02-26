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

    // 5. 生成商户订单号（用于微信支付）
    const outTradeNo = `RC${Date.now()}${Math.floor(Math.random() * 1000)}`

    // 6. 创建充值订单（status: pending），记录 outTradeNo
    const now = new Date()
    const orderData = {
      _openid: openid,
      userId: userId,
      orderNo: orderNo,
      outTradeNo: outTradeNo,
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

    // 7. 调用微信支付统一下单
    const body = `储值充值-${plan.name}`
    const paymentResult = await cloud.cloudPay.unifiedOrder({
      body: body,
      outTradeNo: outTradeNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: '1106454761',
      totalFee: Math.round(plan.amount * 100),  // 实际支付金额（分），只收充值金额，赠送部分不收费
      envId: 'cc-5gos3ctb46510316',
      functionName: 'rechargeCallback'           // 支付回调云函数
    })

    console.log('✅ 充值统一下单结果:', paymentResult)

    // 8. 检查统一下单结果
    if (paymentResult.returnCode === 'SUCCESS' && paymentResult.resultCode === 'SUCCESS') {
      // 更新充值订单，记录预支付ID
      await db.collection('recharge_orders').doc(orderId).update({
        data: {
          prepayId: paymentResult.prepayId,
          updatedAt: new Date()
        }
      })

      return {
        success: true,
        message: '充值订单创建成功',
        orderId: orderId,
        orderNo: orderNo,
        payment: paymentResult.payment  // 前端调起支付所需的参数
      }
    } else {
      // 统一下单失败，更新订单状态
      await db.collection('recharge_orders').doc(orderId).update({
        data: {
          status: 'fail',
          remark: paymentResult.returnMsg || paymentResult.errCodeDes || '统一下单失败',
          updatedAt: new Date()
        }
      })

      return {
        success: false,
        message: paymentResult.returnMsg || paymentResult.errCodeDes || '创建支付订单失败'
      }
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

// 云函数：微信支付统一下单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 微信支付统一下单
 *
 * 功能：
 * 1. 查询订单信息
 * 2. 调用微信支付统一下单 API
 * 3. 返回 payment 参数供前端调起支付
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { orderId } = event

  // 验证参数
  if (!orderId) {
    return {
      code: 400,
      message: '订单ID不能为空',
      data: null
    }
  }

  try {
    // 1. 查询订单信息
    const { data: orderList } = await db.collection('orders')
      .where({
        _id: orderId,
        _openid: openid
      })
      .get()

    if (orderList.length === 0) {
      return {
        code: 404,
        message: '订单不存在或无权限',
        data: null
      }
    }

    const order = orderList[0]

    // 2. 检查订单状态
    if (order.status !== 'pending') {
      return {
        code: 400,
        message: '订单状态不正确，无法支付',
        data: null
      }
    }

    // 3. 生成商户订单号（使用订单ID + 时间戳确保唯一性）
    const outTradeNo = `BOAT${Date.now()}${Math.floor(Math.random() * 1000)}`

    // 4. 构建商品描述
    const body = `${order.boatType.name}-${order.duration}小时`

    // 5. 调用微信支付统一下单
    const paymentResult = await cloud.cloudPay.unifiedOrder({
      body: body,                          // 商品描述
      outTradeNo: outTradeNo,              // 商户订单号
      spbillCreateIp: '127.0.0.1',         // 终端IP（小程序场景可用默认值）
      subMchId: '1106454761',              // 商户号（福建碧屏湖旅游发展有限公司）
      totalFee: Math.round(order.totalAmount * 100),  // 金额（转换为分）
      envId: 'cc-5gos3ctb46510316',       // 云环境ID
      functionName: 'wechatPayCallback'    // 支付回调云函数名
    })

    console.log('✅ 微信支付统一下单结果:', paymentResult)

    // 6. 检查统一下单结果
    if (paymentResult.returnCode === 'SUCCESS' && paymentResult.resultCode === 'SUCCESS') {
      // 更新订单，记录商户订单号和预支付交易会话标识
      await db.collection('orders').doc(orderId).update({
        data: {
          'payment.outTradeNo': outTradeNo,
          'payment.prepayId': paymentResult.prepayId,
          'payment.method': 'wechat',
          updatedAt: new Date()
        }
      })

      return {
        code: 200,
        message: '统一下单成功',
        data: {
          orderId: orderId,
          outTradeNo: outTradeNo,
          payment: paymentResult.payment  // 前端调起支付所需的参数
        }
      }
    } else {
      // 统一下单失败
      console.error('❌ 统一下单失败:', paymentResult)

      return {
        code: 500,
        message: paymentResult.returnMsg || paymentResult.errCodeDes || '统一下单失败',
        data: null
      }
    }

  } catch (error) {
    console.error('❌ 微信支付统一下单异常:', error)

    return {
      code: 500,
      message: error.message || '系统错误，请稍后重试',
      data: null
    }
  }
}

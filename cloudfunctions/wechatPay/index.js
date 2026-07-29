// 云函数：微信支付统一下单
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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

    // 3. 商户订单号：优先复用该订单已有的，没有才新生成
    //
    // 原实现每次调起支付都生成新单号并覆盖旧值。若用户在旧的支付面板完成付款，
    // 回调携带的是旧单号，而库里已被换成新的，回调按单号查不到订单 →
    // 钱已收、订单永久卡在待支付。2026-07-28 事故即此。
    //
    // 微信侧对同一个未支付的 out_trade_no 重复下单是允许的（参数需与原请求一致），
    // 会返回新的 prepayId。但若该单号已被微信关单，则必须换新单号重新下单——
    // 见下方 6.1 的重试逻辑，否则订单会永久无法支付。
    const isProductOrder = order.orderType === 'product'
    const existingOutTradeNo = order.payment && order.payment.outTradeNo

    const makeOutTradeNo = () => isProductOrder
      ? `PROD${Date.now()}${Math.floor(Math.random() * 1000)}`
      : `BOAT${Date.now()}${Math.floor(Math.random() * 1000)}`

    let outTradeNo = existingOutTradeNo || makeOutTradeNo()
    let isNewOutTradeNo = !existingOutTradeNo

    // 4. 构建商品描述
    const body = isProductOrder
      ? `${order.productName}x${order.quantity}`
      : `${order.boatType ? order.boatType.name : '游船'}-游船租赁`

    // 5. 调用微信支付统一下单
    const placeOrder = (tradeNo) => cloud.cloudPay.unifiedOrder({
      body: body,                          // 商品描述
      outTradeNo: tradeNo,                 // 商户订单号
      spbillCreateIp: '127.0.0.1',         // 终端IP（小程序场景可用默认值）
      subMchId: '1106454761',              // 商户号（福建碧屏湖旅游发展有限公司）
      totalFee: Math.round(order.totalAmount * 100),  // 金额（转换为分）
      envId: 'cc-5gos3ctb46510316',       // 云环境ID
      functionName: 'wechatPayCallback'    // 支付回调云函数名
    })

    const isSuccess = (r) => r && r.returnCode === 'SUCCESS' && r.resultCode === 'SUCCESS'
    // 微信错误码字段命名不统一，双写兼容
    const errCodeOf = (r) => (r && (r.errCode || r.err_code)) || ''

    let paymentResult = await placeOrder(outTradeNo)

    // 6.1 复用的旧单号可能已被微信关单/占用，此时换新单号重试一次。
    //     不重试的话订单会永久卡死无法支付（复用逻辑引入的风险，必须兜住）。
    const NEED_NEW_TRADE_NO = ['ORDERCLOSED', 'OUT_TRADE_NO_USED', 'INVALID_REQUEST']
    if (!isSuccess(paymentResult) && !isNewOutTradeNo &&
        NEED_NEW_TRADE_NO.includes(errCodeOf(paymentResult))) {
      console.warn(`⚠️ 旧单号 ${outTradeNo} 不可用(${errCodeOf(paymentResult)})，换新单号重试`)
      outTradeNo = makeOutTradeNo()
      isNewOutTradeNo = true
      paymentResult = await placeOrder(outTradeNo)
    }

    console.log('✅ 微信支付统一下单结果:', paymentResult)

    // 6. 检查统一下单结果
    if (isSuccess(paymentResult)) {
      // 更新订单，记录商户订单号和预支付交易会话标识
      const updateData = {
        'payment.outTradeNo': outTradeNo,
        'payment.prepayId': paymentResult.prepayId,
        'payment.method': 'wechat',
        updatedAt: new Date()
      }

      // 只有新生成的单号才入历史（复用时无需重复追加）。
      // 历史数组是回调和对账按旧单号反查订单的依据，
      // 用于兜住"用户在旧支付面板付款"这类场景。
      if (isNewOutTradeNo) {
        updateData['payment.outTradeNoHistory'] = _.push([outTradeNo])
      }

      await db.collection('orders').doc(orderId).update({ data: updateData })

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

      // 复用单号时，若微信返回 ORDERPAID，说明这笔其实已经付过了，
      // 只是回调没落到订单上。这不是错误，而是需要走对账补单。
      if (errCodeOf(paymentResult) === 'ORDERPAID') {
        console.warn('⚠️ 微信返回订单已支付，返回 409 由前端触发对账:', outTradeNo)

        // 不在这里调 reconcilePayment：本函数默认超时仅 3 秒，
        // 而对账要跑 1~5 次 queryOrder，很可能把本函数拖超时，
        // 用户反而会看到"调起支付失败"。改由前端在 409 分支触发。

        return {
          code: 409,
          message: '该订单已支付成功，请稍候刷新查看',
          data: { orderId, outTradeNo, alreadyPaid: true }
        }
      }

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

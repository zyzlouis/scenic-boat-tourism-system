// 云函数：支付对账补单
//
// 用途：兜住"用户已付款但回调没成功"导致订单卡在 pending 的情况。
// 微信官方对 queryOrder 的适用场景描述即为「商户系统最终未接收到支付通知」。
//
// 两种调用方式：
//   1. 定时触发（config.json 已配 10 分钟一次）—— 无参，扫描窗口内所有 pending 订单
//   2. 手动/前端触发 —— 传 { orderId } 只处理指定订单
//
// 本函数只做「补」不做「改坏」：仅当微信明确返回 trade_state=SUCCESS 时才把订单置为已支付。
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 商户号（与 wechatPay 保持一致）
const SUB_MCH_ID = '1106454761'

// 扫描窗口：默认只处理 3 分钟前 ~ 7 天内的 pending 订单
// 3 分钟是为了避开用户正在支付中的订单
const DEFAULT_MIN_AGE_MS = 3 * 60 * 1000
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_LIMIT = 100

/**
 * 生成核销码（与 wechatPayCallback 保持一致）
 */
function generateVerificationCode() {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'  // 移除容易混淆的字符 I、O
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateNonceStr() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * 微信返回的字段命名下划线/驼峰混用，统一取值
 */
function pick(obj, snakeKey, camelKey) {
  if (!obj) return undefined
  return obj[snakeKey] !== undefined ? obj[snakeKey] : obj[camelKey]
}

/**
 * 解析微信的支付完成时间（格式 YYYYMMDDHHmmss）
 */
function parseTimeEnd(timeEnd) {
  if (!timeEnd || String(timeEnd).length !== 14) return new Date()
  const s = String(timeEnd)
  try {
    return new Date(
      `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}` +
      `T${s.substring(8, 10)}:${s.substring(10, 12)}:${s.substring(12, 14)}+08:00`
    )
  } catch (e) {
    return new Date()
  }
}

/**
 * 收集一个订单所有用过的商户单号
 *
 * 之所以要查历史：wechatPay 每次调用都会生成新的 outTradeNo 并覆盖旧值，
 * 若用户在旧的支付面板上完成付款，库里存的就已经不是被扣款的那个单号了。
 */
function collectOutTradeNos(order) {
  const payment = order.payment || {}
  const list = []

  if (Array.isArray(payment.outTradeNoHistory)) {
    list.push(...payment.outTradeNoHistory)
  }
  if (payment.outTradeNo) {
    list.push(payment.outTradeNo)
  }

  return list.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i)
}

/**
 * 记录异常，供人工排查（日志只存 30 天且可能被关闭，关键留痕必须落库）
 */
async function logException(payload) {
  try {
    await db.collection('pay_exceptions').add({
      data: {
        source: 'reconcilePayment',
        ...payload,
        createdAt: new Date()
      }
    })
  } catch (e) {
    console.error('写入 pay_exceptions 失败:', e)
  }
}

/**
 * 把订单补成已支付
 *
 * 用带条件的 where().update() 而非 doc().update()，
 * 保证与真实回调并发时不会重复处理（status 已变则更新 0 条）。
 */
async function markPaid(order, queryResult, outTradeNo) {
  const transactionId = pick(queryResult, 'transaction_id', 'transactionId')
  const totalFee = pick(queryResult, 'total_fee', 'totalFee')
  const cashFee = pick(queryResult, 'cash_fee', 'cashFee')
  const timeEnd = pick(queryResult, 'time_end', 'timeEnd')
  const paidAtDate = parseTimeEnd(timeEnd)

  const isProductOrder = order.orderNo && order.orderNo.startsWith('PROD')

  const updateData = {
    'payment.outTradeNo': outTradeNo,
    'payment.transactionId': transactionId || 'RECONCILE',
    'payment.paidAmount': Number(cashFee || totalFee) / 100 || 0,
    'payment.paidAt': paidAtDate,
    'payment.repairedBy': 'reconcilePayment',
    'payment.repairedAt': new Date(),
    updatedAt: new Date()
  }

  // 与 wechatPayCallback 的分流逻辑保持一致
  if (isProductOrder && !order.needVerification) {
    updateData.status = 'completed'
    updateData.completedAt = new Date()
  } else {
    updateData.status = 'paid'
    updateData.verificationCode = generateVerificationCode()
  }

  if (isProductOrder && order.needVerification && !order.verificationDeadline) {
    const days = order.verificationDays || 15
    updateData.verificationDeadline = new Date(paidAtDate.getTime() + days * 24 * 60 * 60 * 1000)
  }

  const res = await db.collection('orders')
    .where({ _id: order._id, status: 'pending' })
    .update({ data: updateData })

  return res.stats && res.stats.updated > 0
}

/**
 * 处理单个订单
 */
async function reconcileOne(order) {
  const outTradeNos = collectOutTradeNos(order)

  if (outTradeNos.length === 0) {
    // 从未调起过支付，属于用户下单后直接放弃，正常情况
    return { orderId: order._id, orderNo: order.orderNo, result: 'never_prepaid' }
  }

  const states = []

  for (const outTradeNo of outTradeNos) {
    let queryResult
    try {
      queryResult = await cloud.cloudPay.queryOrder({
        subMchId: SUB_MCH_ID,
        nonceStr: generateNonceStr(),
        outTradeNo: outTradeNo
      })
    } catch (error) {
      console.error(`查单失败 outTradeNo=${outTradeNo}:`, error)
      states.push({ outTradeNo, tradeState: 'QUERY_ERROR', message: error.message })
      continue
    }

    const tradeState = pick(queryResult, 'trade_state', 'tradeState')
    states.push({ outTradeNo, tradeState })

    if (tradeState === 'SUCCESS') {
      const updated = await markPaid(order, queryResult, outTradeNo)

      await logException({
        type: updated ? 'order_repaired' : 'repair_raced',
        orderId: order._id,
        orderNo: order.orderNo,
        outTradeNo,
        transactionId: pick(queryResult, 'transaction_id', 'transactionId'),
        detail: updated
          ? '订单已支付但状态卡在 pending，已自动补单'
          : '查到已支付，但更新时订单状态已被回调改变，未重复处理'
      })

      console.log(`✅ 补单${updated ? '成功' : '跳过(并发)'}: ${order.orderNo} / ${outTradeNo}`)
      return {
        orderId: order._id,
        orderNo: order.orderNo,
        result: updated ? 'repaired' : 'raced',
        outTradeNo
      }
    }

    // 已退款 / 已关闭等状态：不动订单，只留痕供人工判断
    if (tradeState === 'REFUND' || tradeState === 'REVOKED') {
      await logException({
        type: 'unexpected_trade_state',
        orderId: order._id,
        orderNo: order.orderNo,
        outTradeNo,
        tradeState,
        detail: '微信侧显示已退款/已撤销，但订单仍为 pending，需人工确认'
      })
    }
  }

  return {
    orderId: order._id,
    orderNo: order.orderNo,
    result: 'not_paid',
    states
  }
}

exports.main = async (event, context) => {
  const { orderId, minAgeMs, maxAgeMs, limit } = event || {}

  try {
    let orders = []

    if (orderId) {
      // 手动模式：只处理指定订单
      const res = await db.collection('orders').doc(orderId).get()
      if (!res.data) {
        return { code: 404, message: '订单不存在' }
      }
      if (res.data.status !== 'pending') {
        return {
          code: 200,
          message: `订单当前状态为 ${res.data.status}，无需补单`,
          data: { orderId, status: res.data.status }
        }
      }
      orders = [res.data]
    } else {
      // 定时模式：扫描窗口内的 pending 订单
      const now = Date.now()
      const minAge = typeof minAgeMs === 'number' ? minAgeMs : DEFAULT_MIN_AGE_MS
      const maxAge = typeof maxAgeMs === 'number' ? maxAgeMs : DEFAULT_MAX_AGE_MS

      const res = await db.collection('orders')
        .where({
          status: 'pending',
          createdAt: _.gte(new Date(now - maxAge)).and(_.lte(new Date(now - minAge)))
        })
        .orderBy('createdAt', 'desc')
        .limit(limit || DEFAULT_LIMIT)
        .get()

      orders = res.data || []
    }

    console.log(`🔍 待对账订单 ${orders.length} 笔`)

    const results = []
    for (const order of orders) {
      try {
        results.push(await reconcileOne(order))
      } catch (error) {
        console.error(`对账失败 orderId=${order._id}:`, error)
        results.push({ orderId: order._id, result: 'error', message: error.message })
      }
    }

    const repaired = results.filter(r => r.result === 'repaired')

    console.log(`📊 对账完成：扫描 ${orders.length} 笔，补单 ${repaired.length} 笔`)

    return {
      code: 200,
      message: '对账完成',
      data: {
        scanned: orders.length,
        repaired: repaired.length,
        repairedOrders: repaired.map(r => ({ orderNo: r.orderNo, outTradeNo: r.outTradeNo })),
        results
      }
    }
  } catch (error) {
    console.error('❌ 对账任务失败:', error)
    return { code: 500, message: error.message || '对账任务失败' }
  }
}

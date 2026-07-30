// 云函数：支付对账补单
//
// 用途：兜住"用户已付款但回调没成功"导致订单卡在 pending 的情况。
// 微信官方对 queryOrder 的适用场景描述即为「商户系统最终未接收到支付通知」。
//
// 三种调用方式：
//   1. 定时触发（config.json 已配 10 分钟一次）—— 无参，扫描窗口内所有 pending 订单
//   2. 手动排查 —— 传 { orderNo } 按订单号处理单笔（不用先去数据库翻 _id）
//   3. 前端/程序调用 —— 传 { orderId } 按文档 ID 处理单笔
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

// ⚠️ 云函数默认超时仅 3 秒，且 config.json 不支持配置 timeout，
//    必须在云开发控制台把本函数超时手工改为 60 秒。
//    单笔可能要查多个商户单号，每次 queryOrder 约 0.2~0.5 秒，
//    因此单批上限压到 20 笔，并在循环里留时间护栏，
//    没跑完的留给下一个 10 分钟周期，不会漏。
const DEFAULT_LIMIT = 20
// 30 秒而非 45：护栏在循环开头检查，最坏情况还要再跑完一整笔；
// 且计时起点在扫描查询之后，未覆盖冷启动和 DB 查询耗时。
const TIME_BUDGET_MS = 30 * 1000
// 单笔最多回查几个历史单号（用户连点 N 次就会有 N 个，防止单笔拖垮整批）
const MAX_HISTORY_PER_ORDER = 5

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
function collectOutTradeNos(order, extraOutTradeNos) {
  const payment = order.payment || {}
  const list = []

  if (Array.isArray(payment.outTradeNoHistory)) {
    list.push(...payment.outTradeNoHistory)
  }
  if (payment.outTradeNo) {
    list.push(payment.outTradeNo)
  }

  const uniq = list.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i)

  // 只回查最近的若干个，越新的越可能是被支付的那个
  const recent = uniq.slice(-MAX_HISTORY_PER_ORDER)

  // 人工显式指定的单号排在最前，且不受上面的截断影响。
  // 场景：历史事故订单的真实单号只存在于微信账单上，库里已被覆盖。
  const extras = (Array.isArray(extraOutTradeNos) ? extraOutTradeNos : [])
    .filter(v => typeof v === 'string' && v)

  return [...extras, ...recent].filter((v, i, arr) => arr.indexOf(v) === i)
}

/**
 * 校验这个商户单号是否已经归属于另一笔订单
 *
 * 防止用已支付过的单号给另一笔订单"顶账"——
 * 例如拿自己上一单的单号来给新订单免费开票。
 */
async function isClaimedByAnotherOrder(outTradeNo, selfId) {
  const res = await db.collection('orders')
    .where(_.and([
      _.or([
        { 'payment.outTradeNo': outTradeNo },
        { 'payment.outTradeNoHistory': outTradeNo }
      ]),
      { _id: _.neq(selfId) }
    ]))
    .limit(1)
    .get()

  return (res.data || []).length > 0
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
async function reconcileOne(order, extraOutTradeNos) {
  const outTradeNos = collectOutTradeNos(order, extraOutTradeNos)

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
      // 补单前的两道资金校验，任一不通过都只留痕、不动订单。
      //
      // ① 金额必须与订单一致 —— 防止把别的订单的支付记在这一笔上
      const paidFen = Number(pick(queryResult, 'cash_fee', 'cashFee') ||
                             pick(queryResult, 'total_fee', 'totalFee') || 0)
      const expectFen = Math.round(Number(order.totalAmount || 0) * 100)
      if (paidFen !== expectFen) {
        await logException({
          type: 'amount_mismatch',
          orderId: order._id,
          orderNo: order.orderNo,
          outTradeNo,
          paidFen,
          expectFen,
          needsManualReview: true,
          detail: `查到已支付但金额不符（微信 ${paidFen} 分 / 订单 ${expectFen} 分），未补单`
        })
        states.push({ outTradeNo, tradeState: 'AMOUNT_MISMATCH' })
        continue
      }

      // ② 该单号不能已归属于另一笔订单 —— 防止用旧的已支付单号给新订单顶账
      if (await isClaimedByAnotherOrder(outTradeNo, order._id)) {
        await logException({
          type: 'trade_no_claimed',
          orderId: order._id,
          orderNo: order.orderNo,
          outTradeNo,
          needsManualReview: true,
          detail: '该商户单号已归属于另一笔订单，拒绝补单'
        })
        states.push({ outTradeNo, tradeState: 'CLAIMED_BY_OTHER' })
        continue
      }

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
  const { orderId, orderNo, extraOutTradeNos, operatorId, minAgeMs, maxAgeMs, limit } = event || {}

  try {
    // extraOutTradeNos 是资金敏感入参：它让调用方指定"拿哪个商户单号去问微信"。
    // 云函数默认任何人可调，若不设门槛，攻击者可拿一个已支付的单号给自己的订单顶账。
    // 因此必须管理员身份，另有金额一致 + 单号未被他单占用两道校验兜在后面。
    const hasExtras = Array.isArray(extraOutTradeNos) && extraOutTradeNos.length > 0
    if (hasExtras) {
      if (!operatorId) {
        return { code: 403, message: '指定商户单号需要管理员身份（缺少 operatorId）' }
      }
      try {
        const staffRes = await db.collection('staff').doc(operatorId).get()
        if (!staffRes.data || staffRes.data.role !== 'admin') {
          return { code: 403, message: '无管理员权限' }
        }
      } catch (e) {
        return { code: 403, message: '身份验证失败' }
      }
      if (!orderId && !orderNo) {
        return { code: 400, message: '指定商户单号时必须同时指定 orderNo 或 orderId' }
      }
    }

    let orders = []

    if (orderId || orderNo) {
      // 手动模式：只处理指定订单
      let target = null

      if (orderNo) {
        const res = await db.collection('orders').where({ orderNo }).limit(1).get()
        target = (res.data || [])[0] || null
      } else {
        const res = await db.collection('orders').doc(orderId).get()
        target = res.data || null
      }

      if (!target) {
        return { code: 404, message: '订单不存在', data: { orderId, orderNo } }
      }
      if (target.status !== 'pending') {
        return {
          code: 200,
          message: `订单当前状态为 ${target.status}，无需补单`,
          data: { orderId: target._id, orderNo: target.orderNo, status: target.status }
        }
      }
      orders = [target]
    } else {
      // 定时模式：扫描窗口内的 pending 订单
      const now = Date.now()
      const minAge = typeof minAgeMs === 'number' ? minAgeMs : DEFAULT_MIN_AGE_MS
      const maxAge = typeof maxAgeMs === 'number' ? maxAgeMs : DEFAULT_MAX_AGE_MS

      const res = await db.collection('orders')
        .where({
          status: 'pending',
          createdAt: _.gte(new Date(now - maxAge)).and(_.lte(new Date(now - minAge))),
          // 排除从未调起过支付的废单（用户下单即放弃）。
          // 它们不可能已支付，却会白白占满每批 20 个名额，
          // 高峰期会把真正卡住的订单挤出扫描窗口。
          'payment.outTradeNo': _.neq(null)
        })
        .orderBy('createdAt', 'desc')
        .limit(limit || DEFAULT_LIMIT)
        .get()

      orders = res.data || []
    }

    console.log(`🔍 待对账订单 ${orders.length} 笔`)

    const startedAt = Date.now()
    const results = []
    let skippedByBudget = 0

    for (const order of orders) {
      // 时间护栏：超预算就停，剩下的交给下一个周期，避免函数被强制中断
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        skippedByBudget = orders.length - results.length
        console.warn(`⏱ 超出时间预算，本轮剩余 ${skippedByBudget} 笔顺延至下一周期`)
        break
      }

      try {
        // 人工指定的单号只在单笔模式下生效，批量扫描不接受
        results.push(await reconcileOne(order, orders.length === 1 ? extraOutTradeNos : null))
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
        processed: results.length,
        skippedByBudget,
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

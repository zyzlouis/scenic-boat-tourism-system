// 云函数：自动退款定时任务
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  console.log('⏰ 自动退款定时任务开始执行...')

  try {
    // 1. 获取自动退款配置
    const { data: appConfig } = await db.collection('app_settings')
      .doc('global_settings')
      .get()

    // 检查是否启用自动退款
    if (!appConfig || !appConfig.autoRefundEnabled) {
      console.log('⚠️ 自动退款功能未启用')
      return {
        code: 200,
        message: '自动退款功能未启用',
        data: {
          total: 0,
          processed: 0,
          success: 0,
          failed: 0
        }
      }
    }

    const autoRefundDays = appConfig.autoRefundDays || 7

    console.log(`📅 自动退款天数：${autoRefundDays} 天`)

    // 2. 计算超期时间点（当前时间 - X天）
    const expireTime = new Date()
    expireTime.setDate(expireTime.getDate() - autoRefundDays)

    console.log(`⏰ 超期时间点：${expireTime.toISOString()}`)

    // 3. 查询超期未核销的订单
    const { data: expiredOrders } = await db.collection('orders')
      .where({
        status: 'paid',                                    // 已支付待核销
        refundStatus: _.in(['none', null, undefined]),   // 未退款
        createdAt: _.lte(expireTime)                     // 创建时间早于超期时间
      })
      .get()

    console.log(`📋 查询到 ${expiredOrders.length} 个超期订单`)

    const results = {
      total: expiredOrders.length,
      processed: 0,
      success: 0,
      failed: 0,
      details: []
    }

    // 4. 逐个处理退款
    for (const order of expiredOrders) {
      results.processed++

      console.log(`\n🔄 处理订单 ${results.processed}/${results.total}`)
      console.log(`订单ID: ${order._id}`)
      console.log(`订单号: ${order.orderNo}`)
      console.log(`金额: ¥${order.totalAmount}`)
      console.log(`创建时间: ${order.createdAt}`)

      try {
        // 检查是否有支付信息
        if (!order.payment || !order.payment.outTradeNo) {
          console.error('❌ 订单缺少支付信息，跳过')
          results.failed++
          results.details.push({
            orderId: order._id,
            orderNo: order.orderNo,
            status: 'failed',
            reason: '订单缺少支付信息'
          })
          continue
        }

        // 生成退款单号
        const outRefundNo = `AUTOREFUND${Date.now()}${Math.floor(Math.random() * 1000)}`

        // 更新订单状态为"退款处理中"
        await db.collection('orders').doc(order._id).update({
          data: {
            refundStatus: 'processing',
            refundReason: `超期${autoRefundDays}天未使用自动退款`,
            isAutoRefund: true,
            updatedAt: new Date()
          }
        })

        // 调用微信退款 API
        const refundResult = await cloud.cloudPay.refund({
          outTradeNo: order.payment.outTradeNo,
          outRefundNo: outRefundNo,
          totalFee: Math.round(order.totalAmount * 100),
          refundFee: Math.round(order.totalAmount * 100),
          refundDesc: `超期${autoRefundDays}天未使用自动退款`,
          subMchId: '1106454761',              // 商户号（必须）
          envId: 'cc-5gos3ctb46510316',
          functionName: 'refundCallback'
        })

        // 检查退款结果
        if (refundResult.returnCode === 'SUCCESS' && refundResult.resultCode === 'SUCCESS') {
          // 退款成功
          await db.collection('orders').doc(order._id).update({
            data: {
              status: 'refunded',
              refundStatus: 'success',
              refundAmount: order.totalAmount,
              refundAt: new Date(),
              refundId: refundResult.refundId || outRefundNo,
              updatedAt: new Date()
            }
          })

          results.success++
          results.details.push({
            orderId: order._id,
            orderNo: order.orderNo,
            amount: order.totalAmount,
            status: 'success',
            refundId: refundResult.refundId || outRefundNo
          })

          console.log(`✅ 退款成功`)
        } else {
          // 退款失败
          const errorMsg = refundResult.returnMsg || refundResult.errCodeDes || '退款失败'

          await db.collection('orders').doc(order._id).update({
            data: {
              refundStatus: 'failed',
              refundFailReason: errorMsg,
              updatedAt: new Date()
            }
          })

          results.failed++
          results.details.push({
            orderId: order._id,
            orderNo: order.orderNo,
            status: 'failed',
            reason: errorMsg
          })

          console.error(`❌ 退款失败: ${errorMsg}`)
        }

      } catch (error) {
        console.error(`❌ 处理订单异常:`, error)

        // 更新订单状态为退款失败
        try {
          await db.collection('orders').doc(order._id).update({
            data: {
              refundStatus: 'failed',
              refundFailReason: error.message || '系统错误',
              updatedAt: new Date()
            }
          })
        } catch (updateError) {
          console.error('❌ 更新订单状态失败:', updateError)
        }

        results.failed++
        results.details.push({
          orderId: order._id,
          orderNo: order.orderNo,
          status: 'failed',
          reason: error.message || '系统错误'
        })
      }

      // 延迟100ms，避免调用频率过高
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n🎉 自动退款任务执行完成')
    console.log(`📊 统计：总计 ${results.total}，成功 ${results.success}，失败 ${results.failed}`)

    return {
      code: 200,
      message: '自动退款任务执行完成',
      data: results
    }

  } catch (error) {
    console.error('❌ 自动退款任务执行失败:', error)
    return {
      code: 500,
      message: '自动退款任务执行失败: ' + error.message,
      data: null
    }
  }
}

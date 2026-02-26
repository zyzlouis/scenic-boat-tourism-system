// 云函数：后台管理统一API
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 后台管理统一API
 * 云函数拥有管理员权限，不受数据库安全规则限制
 *
 * 支持的操作：
 * - query: 查询集合数据
 * - add: 新增记录
 * - update: 更新记录
 * - remove: 删除记录
 * - queryOrders: 查询订单（支持日期范围和状态筛选）
 * - orderStats: 按月统计已完成订单数量
 */
exports.main = async (event, context) => {
  const { action, collection, data, docId, staffId } = event

  // 1. 验证管理员身份
  if (staffId) {
    try {
      const staffRes = await db.collection('staff').doc(staffId).get()
      if (!staffRes.data || staffRes.data.role !== 'admin') {
        return { code: 403, message: '无管理员权限' }
      }
    } catch (e) {
      return { code: 403, message: '身份验证失败' }
    }
  }

  // 2. 允许操作的集合白名单（queryOrders和orderStats不需要检查）
  const skipCollectionCheck = ['queryOrders', 'orderStats']
  if (!skipCollectionCheck.includes(action)) {
    const allowedCollections = [
      'boatTypes', 'boats', 'staff', 'banners',
      'announcements', 'pricingConfigs', 'app_settings',
      'orders', 'users', 'verificationLogs', 'recharge_plans'
    ]

    if (!allowedCollections.includes(collection)) {
      return { code: 400, message: '不允许操作该集合: ' + collection }
    }
  }

  try {
    switch (action) {
      case 'query': {
        // 查询数据（支持条件、排序、分页）
        const { where, orderBy, limit, skip } = data || {}
        let query = db.collection(collection)

        if (where) {
          query = query.where(where)
        }
        if (orderBy) {
          query = query.orderBy(orderBy.field, orderBy.direction || 'asc')
        }
        if (skip) {
          query = query.skip(skip)
        }
        query = query.limit(limit || 1000)

        const res = await query.get()
        const countRes = await db.collection(collection).count()

        return {
          code: 200,
          data: res.data,
          total: countRes.total
        }
      }

      case 'add': {
        // 新增记录
        const addData = { ...data, createdAt: new Date(), updatedAt: new Date() }
        const res = await db.collection(collection).add({ data: addData })
        return { code: 200, data: { _id: res._id }, message: '新增成功' }
      }

      case 'update': {
        // 更新记录
        if (!docId) {
          return { code: 400, message: '缺少文档ID' }
        }
        const updateData = { ...data, updatedAt: new Date() }
        delete updateData._id
        await db.collection(collection).doc(docId).update({ data: updateData })
        return { code: 200, message: '更新成功' }
      }

      case 'remove': {
        // 删除记录
        if (!docId) {
          return { code: 400, message: '缺少文档ID' }
        }
        await db.collection(collection).doc(docId).remove()
        return { code: 200, message: '删除成功' }
      }

      case 'queryOrders': {
        // 查询订单（支持日期范围、状态筛选、船型筛选、分页）
        const { startDate, endDate, status, boatTypeCode, limit, skip } = data || {}
        let whereCondition = {}

        if (startDate && endDate) {
          whereCondition.createdAt = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
        } else if (startDate) {
          whereCondition.createdAt = _.gte(new Date(startDate))
        } else if (endDate) {
          whereCondition.createdAt = _.lte(new Date(endDate))
        }

        if (status) {
          whereCondition.status = Array.isArray(status) ? _.in(status) : status
        }

        if (boatTypeCode) {
          whereCondition['boatType.code'] = boatTypeCode
        }

        let query = db.collection('orders')
          .where(whereCondition)
          .orderBy('createdAt', 'desc')

        if (skip) query = query.skip(skip)
        query = query.limit(limit || 100)

        const ordersRes = await query.get()
        const ordersCount = await db.collection('orders').where(whereCondition).count()

        // 关联查询核销人员信息（针对没有 verification 字段的历史订单）
        const orders = ordersRes.data
        const orderIdsNeedStaff = orders
          .filter(o => !o.verification?.startStaffName && ['timing', 'completed'].includes(o.status))
          .map(o => o._id)

        if (orderIdsNeedStaff.length > 0) {
          // 批量查询核销日志
          const { data: logs } = await db.collection('verificationLogs')
            .where({ orderId: _.in(orderIdsNeedStaff) })
            .orderBy('createdAt', 'asc')
            .limit(1000)
            .get()

          // 按 orderId 分组
          const logMap = {}
          logs.forEach(log => {
            if (!logMap[log.orderId]) logMap[log.orderId] = {}
            if (log.actionType === 'start') logMap[log.orderId].start = log
            if (log.actionType === 'end') logMap[log.orderId].end = log
          })

          // 补充到订单数据
          orders.forEach(o => {
            if (logMap[o._id]) {
              if (!o.verification) o.verification = {}
              const startLog = logMap[o._id].start
              const endLog = logMap[o._id].end
              if (startLog && !o.verification.startStaffName) {
                o.verification.startStaffId = startLog.staffId
                o.verification.startStaffName = startLog.staffName
              }
              if (endLog && !o.verification.endStaffName) {
                o.verification.endStaffId = endLog.staffId
                o.verification.endStaffName = endLog.staffName
              }
            }
          })
        }

        return { code: 200, data: orders, total: ordersCount.total }
      }

      case 'orderStats': {
        // 按月统计订单数量和金额
        const { year } = data || {}
        const targetYear = year || new Date().getFullYear()
        const yearStart = new Date(targetYear, 0, 1)
        const yearEnd = new Date(targetYear + 1, 0, 1)

        // 查询全年已完成订单（分批获取，防止超过1000条限制）
        let completedOrders = []
        let skip = 0
        let hasMore = true
        while (hasMore) {
          const batch = await db.collection('orders')
            .where({ status: 'completed', completedAt: _.gte(yearStart).and(_.lt(yearEnd)) })
            .skip(skip).limit(1000).get()
          completedOrders = completedOrders.concat(batch.data)
          hasMore = batch.data.length === 1000
          skip += 1000
        }

        // 查询全年退款订单
        let refundedOrders = []
        skip = 0
        hasMore = true
        while (hasMore) {
          const batch = await db.collection('orders')
            .where({ status: 'refunded', updatedAt: _.gte(yearStart).and(_.lt(yearEnd)) })
            .skip(skip).limit(1000).get()
          refundedOrders = refundedOrders.concat(batch.data)
          hasMore = batch.data.length === 1000
          skip += 1000
        }

        // 按月聚合
        const monthlyStats = []
        for (let month = 1; month <= 12; month++) {
          const mOrders = completedOrders.filter(o => new Date(o.completedAt).getMonth() + 1 === month)
          const mRefunds = refundedOrders.filter(o => new Date(o.updatedAt).getMonth() + 1 === month)

          const revenue = mOrders.reduce((s, o) => s + (o.settlement?.finalAmount || o.pricing?.basePrice || 0), 0)
          const refundAmount = mRefunds.reduce((s, o) => s + (o.totalAmount || 0), 0)

          monthlyStats.push({
            month,
            orderCount: mOrders.length,
            revenue: Math.round(revenue * 100) / 100,
            refundCount: mRefunds.length,
            refundAmount: Math.round(refundAmount * 100) / 100
          })
        }

        const annualRevenue = monthlyStats.reduce((s, m) => s + m.revenue, 0)
        const annualRefundAmount = monthlyStats.reduce((s, m) => s + m.refundAmount, 0)

        return {
          code: 200,
          data: {
            year: targetYear,
            annualTotal: completedOrders.length,
            annualRevenue: Math.round(annualRevenue * 100) / 100,
            annualRefundCount: refundedOrders.length,
            annualRefundAmount: Math.round(annualRefundAmount * 100) / 100,
            monthlyStats
          }
        }
      }

      default:
        return { code: 400, message: '不支持的操作: ' + action }
    }
  } catch (error) {
    console.error('adminApi 错误:', error)
    return { code: 500, message: error.message }
  }
}

// 云函数：清理测试数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 清理测试数据
 *
 * 用途：
 * - 正式上线前清理所有测试订单、用户等运行时数据
 * - 保留业务配置数据（船型、价格、船只、员工等）
 *
 * 调用方式：
 * 在云开发控制台调用该函数，传入参数：
 * { "action": "clear", "confirm": true }
 */
exports.main = async (event, context) => {
  const { action, confirm } = event

  // 安全检查：必须明确确认才能执行
  if (action !== 'clear' || confirm !== true) {
    return {
      success: false,
      message: '请传入正确的参数：{ "action": "clear", "confirm": true }'
    }
  }

  console.log('⚠️ 开始清理测试数据...')

  try {
    const results = {}

    // 需要清理的集合列表
    const collectionsToClean = [
      'orders',           // 订单
      'users',            // 用户
      'recharge_orders',  // 充值订单
      'balance_logs',     // 余额日志
      'verificationLogs'  // 核销日志
    ]

    // 逐个清理集合
    for (const collectionName of collectionsToClean) {
      console.log(`\n🗑️ 正在清理集合：${collectionName}`)

      try {
        // 获取所有数据
        const { data } = await db.collection(collectionName)
          .limit(1000)  // 一次最多1000条
          .get()

        if (data.length === 0) {
          results[collectionName] = {
            status: 'skipped',
            message: '集合为空，无需清理',
            count: 0
          }
          console.log(`✅ ${collectionName} 集合为空`)
          continue
        }

        // 批量删除
        const deleteTasks = data.map(item =>
          db.collection(collectionName).doc(item._id).remove()
        )

        await Promise.all(deleteTasks)

        results[collectionName] = {
          status: 'success',
          message: `成功清理 ${data.length} 条记录`,
          count: data.length
        }

        console.log(`✅ ${collectionName} 清理成功，删除 ${data.length} 条记录`)

      } catch (error) {
        results[collectionName] = {
          status: 'error',
          message: error.message,
          count: 0
        }
        console.error(`❌ ${collectionName} 清理失败:`, error)
      }
    }

    console.log('\n🎉 测试数据清理完成！')

    return {
      success: true,
      message: '测试数据清理完成',
      results: results,
      summary: {
        total: Object.keys(results).length,
        success: Object.values(results).filter(r => r.status === 'success').length,
        failed: Object.values(results).filter(r => r.status === 'error').length,
        skipped: Object.values(results).filter(r => r.status === 'skipped').length
      }
    }

  } catch (error) {
    console.error('❌ 清理测试数据失败:', error)
    return {
      success: false,
      message: '清理失败: ' + error.message
    }
  }
}

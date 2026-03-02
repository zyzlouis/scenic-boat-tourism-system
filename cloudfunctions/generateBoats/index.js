// 云函数：批量生成船只
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 批量生成船只
 *
 * 调用方式：
 * 在云开发控制台调用该函数，传入参数：
 * { "action": "generate" }
 */
exports.main = async (event, context) => {
  const { action } = event

  if (action !== 'generate') {
    return {
      success: false,
      message: '请传入正确的参数：{ "action": "generate" }'
    }
  }

  console.log('🚤 开始批量生成船只...')

  try {
    // 船型配置：每个船型生成10艘船
    const boatConfigs = [
      { typeCode: '2plus1', prefix: 'A', name: '2+1座船' },
      { typeCode: 'THREE', prefix: 'B', name: '三人船' },
      { typeCode: 'Four_jiaota', prefix: 'C', name: '四人脚踏船' },
      { typeCode: 'FOUR_diandong', prefix: 'D', name: '四人电动船' },
      { typeCode: 'five_diandong', prefix: 'E', name: '五人电动船' }
    ]

    const boatsToCreate = []
    let sortIndex = 1

    // 为每个船型生成10艘船
    for (const config of boatConfigs) {
      console.log(`\n📋 生成船型 ${config.name} (${config.typeCode}) 的船只...`)

      for (let i = 1; i <= 10; i++) {
        const boatNumber = `${config.prefix}${i.toString().padStart(3, '0')}`  // A001-A010, B001-B010...

        const boat = {
          boatNumber: boatNumber,
          boatTypeCode: config.typeCode,
          status: 'idle',
          lastUsedAt: null,
          sort: sortIndex,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        boatsToCreate.push(boat)
        sortIndex++
        console.log(`  ✅ 生成船只：${boatNumber}`)
      }
    }

    console.log(`\n💾 准备插入 ${boatsToCreate.length} 艘船到数据库...`)

    // 批量插入数据库
    const insertTasks = boatsToCreate.map(boat =>
      db.collection('boats').add({ data: boat })
    )

    await Promise.all(insertTasks)

    console.log('🎉 船只生成完成！')

    // 统计结果
    const summary = {}
    for (const config of boatConfigs) {
      summary[config.name] = {
        typeCode: config.typeCode,
        prefix: config.prefix,
        count: 10,
        range: `${config.prefix}001 - ${config.prefix}010`
      }
    }

    return {
      success: true,
      message: '船只批量生成成功',
      total: boatsToCreate.length,
      summary: summary,
      details: boatsToCreate.map(b => ({
        boatNumber: b.boatNumber,
        boatTypeCode: b.boatTypeCode,
        status: b.status
      }))
    }

  } catch (error) {
    console.error('❌ 生成船只失败:', error)
    return {
      success: false,
      message: '生成失败: ' + error.message,
      error: error
    }
  }
}

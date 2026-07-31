// 云函数：获取指定船型的价格方案（公开只读）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { boatTypeCode } = event

  if (!boatTypeCode) {
    return {
      code: 400,
      message: '缺少船型编码',
      data: null
    }
  }

  try {
    // 查询该船型所有启用的价格方案
    const { data: pricingList } = await db.collection('pricingConfigs')
      .where({
        boatTypeCode: boatTypeCode,
        enabled: true
      })
      .limit(1000)
      .get()

    // 只返回前端渲染必需的字段，不整份文档透传
    const result = pricingList.map(pricing => ({
      _id: pricing._id,
      name: pricing.name,
      basePrice: pricing.basePrice,
      depositAmount: pricing.depositAmount,
      includedMinutes: pricing.includedMinutes,
      overtimeRate: pricing.overtimeRate,
      capAmount: pricing.capAmount,
      isDefault: pricing.isDefault
    }))

    return {
      code: 200,
      message: '成功',
      data: result
    }
  } catch (error) {
    console.error('获取价格方案失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

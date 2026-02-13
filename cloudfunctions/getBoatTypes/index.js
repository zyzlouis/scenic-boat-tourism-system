// 云函数：获取船型列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 查询所有启用的船型（CMS规范：使用enabled字段）
    const { data: boatTypes } = await db.collection('boatTypes')
      .where({
        enabled: true
      })
      .orderBy('sort', 'asc')
      .get()

    // 为每个船型查询价格配置
    const result = await Promise.all(boatTypes.map(async (boatType) => {
      const { data: pricingList } = await db.collection('pricingConfigs')
        .where({
          boatTypeCode: boatType.code,
          enabled: true,
          isDefault: true
        })
        .limit(1)
        .get()

      const pricing = pricingList[0] || null

      return {
        id: boatType._id,
        code: boatType.code,
        name: boatType.name,
        description: boatType.description,
        maxCapacity: boatType.maxCapacity,
        imageUrl: boatType.imageUrl,
        pricing: pricing ? {
          id: pricing._id,
          basePrice: pricing.basePrice,
          depositAmount: pricing.depositAmount,
          includedMinutes: pricing.includedMinutes,
          overtimeRate: pricing.overtimeRate
        } : null
      }
    }))

    return {
      code: 200,
      message: '成功',
      data: result
    }
  } catch (error) {
    console.error('获取船型列表失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

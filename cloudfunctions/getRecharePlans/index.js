// 云函数：获取充值方案列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 查询所有启用的充值方案
    const { data } = await db.collection('recharge_plans')
      .where({ enabled: true })
      .orderBy('sort', 'asc')
      .get()

    return {
      success: true,
      plans: data
    }
  } catch (error) {
    console.error('获取充值方案失败:', error)
    return {
      success: false,
      message: '获取充值方案失败',
      error: error.message
    }
  }
}

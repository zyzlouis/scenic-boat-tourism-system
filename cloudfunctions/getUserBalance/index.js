// 云函数：获取用户余额信息
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户信息
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (users.length === 0) {
      // 用户不存在，返回默认值
      return {
        success: true,
        balance: 0,
        totalRecharge: 0,
        totalGift: 0,
        isVip: false
      }
    }

    const user = users[0]

    return {
      success: true,
      balance: user.balance || 0,
      totalRecharge: user.totalRecharge || 0,
      totalGift: user.totalGift || 0,
      isVip: user.isVip || false
    }
  } catch (error) {
    console.error('获取用户余额失败:', error)
    return {
      success: false,
      message: '获取用户余额失败',
      error: error.message
    }
  }
}

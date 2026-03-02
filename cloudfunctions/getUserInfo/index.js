// 云函数：获取用户信息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    // 查询用户信息
    const { data: users } = await db.collection('users')
      .where({ _openid: wxContext.OPENID })
      .limit(1)
      .get()

    if (users.length > 0) {
      return {
        success: true,
        data: {
          nickName: users[0].nickName || '',
          avatarUrl: users[0].avatarUrl || '',
          phone: users[0].phone || '',
          balance: users[0].balance || 0
        }
      }
    } else {
      return {
        success: true,
        data: null
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      message: error.message || '获取失败'
    }
  }
}

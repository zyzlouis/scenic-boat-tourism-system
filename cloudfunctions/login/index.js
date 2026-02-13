// 云函数：用户登录（获取用户OpenID）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询或创建用户记录
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()

    if (users.length === 0) {
      // 用户不存在，创建新用户
      const now = new Date()
      const newUser = {
        _openid: openid,
        balance: 0,
        totalRecharge: 0,
        totalGift: 0,
        isVip: false,
        createdAt: now,
        updatedAt: now
      }

      const { _id } = await db.collection('users').add({
        data: newUser
      })

      return {
        success: true,
        message: '登录成功',
        userInfo: {
          _id: _id,
          _openid: openid,
          balance: 0,
          totalRecharge: 0,
          totalGift: 0,
          isVip: false
        }
      }
    } else {
      // 用户已存在，返回用户信息
      const user = users[0]

      return {
        success: true,
        message: '登录成功',
        userInfo: {
          _id: user._id,
          _openid: user._openid,
          balance: user.balance || 0,
          totalRecharge: user.totalRecharge || 0,
          totalGift: user.totalGift || 0,
          isVip: user.isVip || false
        }
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败',
      error: error.message
    }
  }
}

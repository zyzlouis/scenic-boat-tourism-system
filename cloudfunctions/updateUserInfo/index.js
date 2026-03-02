// 云函数：更新用户信息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { nickName, avatarUrl } = event

  try {
    // 查询用户
    const { data: users } = await db.collection('users')
      .where({ _openid: wxContext.OPENID })
      .limit(1)
      .get()

    const updateData = {
      updatedAt: new Date()
    }

    if (nickName !== undefined) {
      updateData.nickName = nickName
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl
    }

    if (users.length > 0) {
      // 用户已存在，更新信息
      await db.collection('users').doc(users[0]._id).update({
        data: updateData
      })
    } else {
      // 用户不存在，创建用户记录
      await db.collection('users').add({
        data: {
          _openid: wxContext.OPENID,
          ...updateData,
          balance: 0,
          createdAt: new Date()
        }
      })
    }

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      message: error.message || '更新失败'
    }
  }
}

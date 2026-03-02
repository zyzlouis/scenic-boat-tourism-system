// 云函数：获取用户手机号
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { code } = event

  try {
    // 调用微信接口获取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code
    })

    console.log('📱 获取手机号结果:', result)

    if (result.errcode === 0) {
      const phoneNumber = result.phoneInfo.phoneNumber

      // 更新用户信息到数据库
      const { data: users } = await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .limit(1)
        .get()

      if (users.length > 0) {
        // 用户已存在，更新手机号
        await db.collection('users').doc(users[0]._id).update({
          data: {
            phone: phoneNumber,
            updatedAt: new Date()
          }
        })
      } else {
        // 用户不存在，创建用户记录
        await db.collection('users').add({
          data: {
            _openid: wxContext.OPENID,
            phone: phoneNumber,
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      return {
        success: true,
        phoneNumber: phoneNumber
      }
    } else {
      return {
        success: false,
        message: '获取手机号失败'
      }
    }
  } catch (error) {
    console.error('获取手机号失败:', error)
    return {
      success: false,
      message: error.message || '获取手机号失败'
    }
  }
}

// cloudfunctions/createStaff/index.js（明文密码）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { username, password, realName, phone, role, enabled } = event

  try {
    // 检查用户名是否已存在
    const existingStaff = await db.collection('staff')
      .where({ username })
      .get()

    if (existingStaff.data.length > 0) {
      return {
        code: 400,
        message: '用户名已存在'
      }
    }

    // 创建员工（密码直接保存明文）
    const result = await db.collection('staff').add({
      data: {
        username,
        password: password,  // 明文密码
        realName,
        phone: phone || '',
        role: role || 'staff',
        enabled: enabled !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      code: 200,
      message: '创建成功',
      data: {
        staffId: result._id
      }
    }
  } catch (error) {
    console.error('创建员工失败:', error)
    return {
      code: 500,
      message: '创建失败: ' + error.message
    }
  }
}

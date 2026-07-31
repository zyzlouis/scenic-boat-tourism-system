// cloudfunctions/createStaff/index.js（明文密码）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 校验调用者是否为管理员（与 adminApi 一致）
// operatorId = 调用者自己的员工ID
async function requireAdmin(operatorId) {
  if (!operatorId) {
    return { code: 403, message: '无管理员权限' }
  }
  try {
    const res = await db.collection('staff').doc(operatorId).get()
    if (!res.data || res.data.role !== 'admin') {
      return { code: 403, message: '无管理员权限' }
    }
  } catch (e) {
    return { code: 403, message: '身份验证失败' }
  }
  return null
}

exports.main = async (event, context) => {
  const { username, password, realName, phone, role, enabled, operatorId } = event

  // 权限验证：仅管理员可创建员工
  const denied = await requireAdmin(operatorId)
  if (denied) return denied

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

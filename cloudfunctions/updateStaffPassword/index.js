// cloudfunctions/updateStaffPassword/index.js
const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 校验调用者是否为管理员（与 adminApi 一致）
// 注意：operatorId = 调用者自己的员工ID；staffId 是被改密码的目标员工，二者不可混用
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
  const { staffId, newPassword, operatorId } = event

  // 权限验证：仅管理员可重置密码
  const denied = await requireAdmin(operatorId)
  if (denied) return denied

  try {
    // 检查员工是否存在
    const staff = await db.collection('staff')
      .doc(staffId)
      .get()

    if (!staff.data) {
      return {
        code: 404,
        message: '员工不存在'
      }
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await db.collection('staff').doc(staffId).update({
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    return {
      code: 200,
      message: '密码修改成功'
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    return {
      code: 500,
      message: '修改密码失败: ' + error.message
    }
  }
}

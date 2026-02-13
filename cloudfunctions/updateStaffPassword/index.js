// cloudfunctions/updateStaffPassword/index.js
const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { staffId, newPassword } = event

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

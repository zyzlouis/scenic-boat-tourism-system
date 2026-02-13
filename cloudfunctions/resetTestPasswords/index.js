// 云函数：重置测试员工密码（仅用于开发测试）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const bcrypt = require('bcryptjs')

exports.main = async (event, context) => {
  try {
    // 设置统一的测试密码：admin123
    const testPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(testPassword, 10)

    console.log('生成的密码哈希:', hashedPassword)

    // 更新所有测试员工的密码
    const staffIds = ['staff_admin', 'staff_001', 'staff_002']
    const results = {}

    for (const staffId of staffIds) {
      try {
        // 先查询员工是否存在
        const { data: staff } = await db.collection('staff').doc(staffId).get()

        if (staff) {
          // 更新密码
          await db.collection('staff').doc(staffId).update({
            data: {
              password: hashedPassword,
              updatedAt: new Date()
            }
          })

          results[staffId] = {
            success: true,
            username: staff.username,
            phone: staff.phone,
            message: '密码已重置为 admin123'
          }
        }
      } catch (error) {
        results[staffId] = {
          success: false,
          message: error.message
        }
      }
    }

    return {
      success: true,
      message: '测试员工密码已全部重置为: admin123',
      hashedPassword: hashedPassword,
      results: results
    }
  } catch (error) {
    console.error('重置密码失败:', error)
    return {
      success: false,
      message: '重置密码失败',
      error: error.message
    }
  }
}

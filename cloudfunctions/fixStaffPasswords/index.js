// 云函数：将加密密码改回明文（一次性工具）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 检查密码是否是 bcrypt 加密格式
 * bcrypt 格式：$2a$10$... 或 $2b$10$...（60个字符）
 */
function isBcryptHash(password) {
  if (!password) return false
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(password)
}

exports.main = async (event, context) => {
  const { action, defaultPassword } = event

  try {
    // 获取所有员工
    const { data: staffList } = await db.collection('staff').get()

    console.log(`📋 总共 ${staffList.length} 个员工`)

    const results = {
      total: staffList.length,
      alreadyPlainText: 0,
      needFix: 0,
      fixed: [],
      errors: []
    }

    for (const staff of staffList) {
      // 检查密码是否已经是明文
      if (!isBcryptHash(staff.password)) {
        results.alreadyPlainText++
        console.log(`✅ ${staff.username} 密码已是明文: ${staff.password}`)
        continue
      }

      // 密码是加密的，需要改回明文
      results.needFix++

      if (action === 'check') {
        // 仅检查模式
        results.fixed.push({
          username: staff.username,
          realName: staff.realName,
          currentPassword: '(加密)',
          status: 'need_fix'
        })
      } else if (action === 'fix') {
        // 修复模式：改为明文密码
        try {
          // 使用默认密码（因为加密后无法还原）
          const newPassword = defaultPassword || '123456'

          await db.collection('staff').doc(staff._id).update({
            data: {
              password: newPassword,
              updatedAt: new Date()
            }
          })

          results.fixed.push({
            username: staff.username,
            realName: staff.realName,
            oldPassword: '(加密)',
            newPassword: newPassword,
            status: 'fixed'
          })

          console.log(`🔧 已修复 ${staff.username}，新密码：${newPassword}`)
        } catch (error) {
          results.errors.push({
            username: staff.username,
            error: error.message
          })
          console.error(`❌ 修复 ${staff.username} 失败:`, error)
        }
      }
    }

    return {
      code: 200,
      message: action === 'check' ? '检查完成' : '修复完成',
      data: results
    }
  } catch (error) {
    console.error('❌ 执行失败:', error)
    return {
      code: 500,
      message: '执行失败: ' + error.message,
      data: null
    }
  }
}

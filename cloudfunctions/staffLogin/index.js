// 云函数：员工登录（明文密码）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { username, password } = event

  if (!username || !password) {
    return {
      code: 400,
      message: '用户名和密码不能为空',
      data: null
    }
  }

  try {
    // 查询员工信息（使用用户名或手机号登录）
    const { data: staffList } = await db.collection('staff')
      .where(db.command.or([
        {
          username: username,
          enabled: true
        },
        {
          phone: username,
          enabled: true
        }
      ]))
      .get()

    if (staffList.length === 0) {
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null
      }
    }

    const staff = staffList[0]

    // 验证密码（明文对比）
    if (staff.password !== password) {
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null
      }
    }

    // 更新最后登录时间
    await db.collection('staff').doc(staff._id).update({
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      code: 200,
      message: '登录成功',
      data: {
        staffInfo: {
          _id: staff._id,
          username: staff.username,
          realName: staff.realName,
          phone: staff.phone,
          role: staff.role
        }
      }
    }
  } catch (error) {
    console.error('员工登录失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

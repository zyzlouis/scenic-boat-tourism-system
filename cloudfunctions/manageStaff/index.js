// 云函数：员工管理（新增/修改员工，自动处理密码加密）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const bcrypt = require('bcryptjs')

exports.main = async (event, context) => {
  const { action, staffData, staffId } = event

  // 权限验证：仅管理员可操作（可选，根据需求添加）
  // const wxContext = cloud.getWXContext()
  // TODO: 验证调用者是否为管理员

  try {
    if (action === 'create') {
      // 新增员工
      return await createStaff(staffData)
    } else if (action === 'resetPassword') {
      // 重置密码
      return await resetPassword(staffId, staffData.password)
    } else if (action === 'update') {
      // 更新员工信息（不包括密码）
      return await updateStaff(staffId, staffData)
    } else if (action === 'disable') {
      // 禁用员工
      return await disableStaff(staffId)
    } else {
      return {
        code: 400,
        message: '无效的操作类型',
        data: null
      }
    }
  } catch (error) {
    console.error('员工管理操作失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

// 新增员工
async function createStaff(staffData) {
  const { username, password, realName, phone, role } = staffData

  // 验证必填字段
  if (!username || !password || !realName) {
    return {
      code: 400,
      message: '用户名、密码和真实姓名不能为空',
      data: null
    }
  }

  // 检查用户名是否已存在
  const { data: existingStaff } = await db.collection('staff')
    .where({ username: username })
    .get()

  if (existingStaff.length > 0) {
    return {
      code: 40001,
      message: '用户名已存在',
      data: null
    }
  }

  // 自动加密密码
  const hashedPassword = await bcrypt.hash(password, 10)

  const now = new Date()
  const newStaff = {
    username: username,
    password: hashedPassword,  // 加密后的密码
    realName: realName,
    phone: phone || null,
    role: role || 'staff',  // 默认为普通员工
    lastLoginAt: null,
    sort: Date.now(),  // 使用时间戳作为排序
    enabled: true,  // CMS规范字段
    createdAt: now,
    updatedAt: now
  }

  const { _id } = await db.collection('staff').add({
    data: newStaff
  })

  return {
    code: 200,
    message: '员工创建成功',
    data: {
      staffId: _id,
      username: username,
      realName: realName,
      role: role || 'staff'
    }
  }
}

// 重置密码
async function resetPassword(staffId, newPassword) {
  if (!staffId || !newPassword) {
    return {
      code: 400,
      message: '员工ID和新密码不能为空',
      data: null
    }
  }

  // 验证员工是否存在
  const { data: staff } = await db.collection('staff').doc(staffId).get()
  if (!staff) {
    return {
      code: 404,
      message: '员工不存在',
      data: null
    }
  }

  // 自动加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await db.collection('staff').doc(staffId).update({
    data: {
      password: hashedPassword,
      updatedAt: new Date()
    }
  })

  return {
    code: 200,
    message: '密码重置成功',
    data: {
      staffId: staffId,
      username: staff.username
    }
  }
}

// 更新员工信息（不包括密码）
async function updateStaff(staffId, staffData) {
  if (!staffId) {
    return {
      code: 400,
      message: '员工ID不能为空',
      data: null
    }
  }

  // 验证员工是否存在
  const { data: staff } = await db.collection('staff').doc(staffId).get()
  if (!staff) {
    return {
      code: 404,
      message: '员工不存在',
      data: null
    }
  }

  // 准备更新数据（排除敏感字段）
  const updateData = {
    updatedAt: new Date()
  }

  if (staffData.realName) updateData.realName = staffData.realName
  if (staffData.phone !== undefined) updateData.phone = staffData.phone
  if (staffData.role) updateData.role = staffData.role
  if (staffData.sort !== undefined) updateData.sort = staffData.sort

  await db.collection('staff').doc(staffId).update({
    data: updateData
  })

  return {
    code: 200,
    message: '员工信息更新成功',
    data: {
      staffId: staffId
    }
  }
}

// 禁用员工
async function disableStaff(staffId) {
  if (!staffId) {
    return {
      code: 400,
      message: '员工ID不能为空',
      data: null
    }
  }

  await db.collection('staff').doc(staffId).update({
    data: {
      enabled: false,  // CMS规范字段
      updatedAt: new Date()
    }
  })

  return {
    code: 200,
    message: '员工已禁用',
    data: {
      staffId: staffId
    }
  }
}

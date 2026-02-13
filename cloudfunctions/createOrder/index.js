// 云函数：创建订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')

  return `ORD${year}${month}${day}${hour}${minute}${second}${random}`
}

// 生成核销码
function generateVerificationCode() {
  const timestamp = Date.now().toString().slice(-6)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `VF${timestamp}${random}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { boatTypeId } = event

  if (!boatTypeId) {
    return {
      code: 400,
      message: '船型ID不能为空',
      data: null
    }
  }

  try {
    // 1. 查询船型信息
    const { data: boatTypeList } = await db.collection('boatTypes')
      .where({
        _id: boatTypeId,
        enabled: true  // CMS规范：使用enabled替代isActive
      })
      .get()

    if (boatTypeList.length === 0) {
      return {
        code: 404,
        message: '船型不存在',
        data: null
      }
    }

    const boatType = boatTypeList[0]

    // 2. 查询价格配置
    const { data: pricingList } = await db.collection('pricingConfigs')
      .where({
        boatTypeCode: boatType.code,
        enabled: true,  // CMS规范
        isDefault: true  // 使用默认价格
      })
      .limit(1)
      .get()

    if (pricingList.length === 0) {
      return {
        code: 404,
        message: '价格配置不存在',
        data: null
      }
    }

    const pricing = pricingList[0]

    // 3. 计算订单总额
    const totalAmount = pricing.basePrice + pricing.depositAmount
    const now = new Date()

    // 4. 创建订单 - 保持嵌套结构（orders不需要CMS编辑）
    const orderData = {
      _openid: wxContext.OPENID,
      orderNo: generateOrderNo(),
      userId: wxContext.OPENID,
      boatType: {
        id: boatType._id,
        code: boatType.code,
        name: boatType.name
      },
      boat: {
        id: null,
        number: null
      },
      pricing: {
        id: pricing._id,
        basePrice: pricing.basePrice,
        depositAmount: pricing.depositAmount,
        includedMinutes: pricing.includedMinutes,
        overtimeRate: pricing.overtimeRate,
        capAmount: pricing.capAmount
      },
      totalAmount: totalAmount,
      verificationCode: null,  // 支付成功后生成
      status: 'pending',
      timing: {
        startTime: null,
        endTime: null,
        usedSeconds: 0,
        usedMinutes: 0,
        overtimeMinutes: 0,
        overtimeFee: 0,
        isAbnormal: false
      },
      settlement: {
        finalAmount: null,
        refundAmount: null,
        refundedAt: null
      },
      payment: {
        transactionId: null,
        paidAt: null,
        method: 'wechat'
      },
      remark: '',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    }

    const { _id } = await db.collection('orders').add({
      data: orderData
    })

    return {
      code: 200,
      message: '订单创建成功',
      data: {
        orderId: _id,
        orderNo: orderData.orderNo,
        boatTypeId: boatType._id,
        boatTypeName: boatType.name,
        basePrice: pricing.basePrice,
        depositAmount: pricing.depositAmount,
        totalAmount: totalAmount,
        includedMinutes: pricing.includedMinutes,
        overtimeRate: pricing.overtimeRate,
        status: 'pending',
        createdAt: orderData.createdAt
      }
    }
  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      data: null
    }
  }
}

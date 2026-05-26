const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const r = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `PROD${y}${M}${d}${h}${m}${s}${r}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { productId, quantity = 1 } = event

  if (!productId) {
    return { code: 400, message: '商品ID不能为空', data: null }
  }

  if (quantity < 1 || quantity > 99) {
    return { code: 400, message: '购买数量不合法', data: null }
  }

  try {
    const { data: productList } = await db.collection('products')
      .where({ _id: productId, enabled: true })
      .get()

    if (productList.length === 0) {
      return { code: 404, message: '商品不存在或已下架', data: null }
    }

    const product = productList[0]

    if (product.stock > 0 && product.soldCount + quantity > product.stock) {
      return { code: 400, message: '库存不足', data: null }
    }

    const { data: projectList } = await db.collection('projects')
      .where({ _id: product.projectId })
      .get()

    const project = projectList[0] || {}

    const totalAmount = parseFloat((product.price * quantity).toFixed(2))
    const now = new Date()

    let verificationDeadline = null
    if (product.needVerification && product.verificationDays > 0) {
      verificationDeadline = new Date(now.getTime() + product.verificationDays * 24 * 60 * 60 * 1000)
    }

    const orderData = {
      _openid: wxContext.OPENID,
      orderNo: generateOrderNo(),
      userId: wxContext.OPENID,
      orderType: 'product',
      projectId: product.projectId,
      projectName: project.name || '',
      productId: product._id,
      productName: product.name,
      productPrice: product.price,
      quantity: quantity,
      needVerification: product.needVerification,
      verificationDeadline: verificationDeadline,
      verifiedAt: null,
      verifiedStaffId: null,
      verifiedStaffName: null,
      totalAmount: totalAmount,
      verificationCode: null,
      status: 'pending',
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

    const { _id } = await db.collection('orders').add({ data: orderData })

    if (product.stock > 0) {
      await db.collection('products').doc(productId).update({
        data: { soldCount: _.inc(quantity) }
      })
    }

    return {
      code: 200,
      message: '订单创建成功',
      data: {
        orderId: _id,
        orderNo: orderData.orderNo,
        productName: product.name,
        quantity: quantity,
        totalAmount: totalAmount,
        status: 'pending',
        createdAt: now
      }
    }
  } catch (error) {
    console.error('创建商品订单失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}

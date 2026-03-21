// 云函数：生成分享码
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const wxCloudBaseUrl = 'https://api.weixin.qq.com'

/**
 * 获取 access_token
 */
async function getAccessToken() {
  // 从配置获取 AppID 和 AppSecret
  const settings = await db.collection('app_settings').doc('global_settings').get()

  if (!settings.data) {
    throw new Error('未找到应用配置')
  }

  const { wechatAppId, wechatAppSecret } = settings.data

  if (!wechatAppId || !wechatAppSecret) {
    throw new Error('未配置微信AppID或AppSecret')
  }

  // 请求 access_token
  const url = `${wxCloudBaseUrl}/cgi-bin/token?grant_type=client_credential&appid=${wechatAppId}&secret=${wechatAppSecret}`

  const httpRes = await cloud.request({
    url: url,
    method: 'GET'
  })

  const data = httpRes.data

  if (data.errcode) {
    console.error('获取access_token失败:', data)
    throw new Error(`获取access_token失败: ${data.errmsg}`)
  }

  return data.access_token
}

/**
 * 生成小程序码（无限制）
 */
async function generateWxACode(accessToken, scene, page, width = 430) {
  const url = `${wxCloudBaseUrl}/wxa/getwxacodeunlimit?access_token=${accessToken}`

  const requestData = {
    scene: scene,  // 最大32个可见字符
    page: page,     // 小程序页面路径
    width: width,   // 二维码宽度
    env_version: 'release' // trial-体验版, develop-开发版, release-正式版
  }

  console.log('请求生成小程序码:', JSON.stringify(requestData))

  const httpRes = await cloud.request({
    url: url,
    method: 'POST',
    header: {
      'content-type': 'application/json'
    },
    data: requestData
  })

  // 如果返回的是buffer，说明成功
  if (httpRes.statusCode === 200 && !httpRes.data.errcode) {
    return {
      buffer: httpRes.buffer,
      contentType: 'image/png'
    }
  }

  // 如果返回的是JSON格式的错误
  if (httpRes.data && httpRes.data.errcode) {
    console.error('生成小程序码失败:', httpRes.data)
    throw new Error(`生成小程序码失败: ${httpRes.data.errmsg}`)
  }

  // 返回buffer
  return {
    buffer: httpRes.buffer,
    contentType: 'image/png'
  }
}

/**
 * 生成分享链接
 */
function generateShareLink(orderId) {
  // 微信小程序 URL Scheme（有效期最长1年）
  // 格式: weixin://dl/business/?t=xxxx
  // 这里返回的是页面路径，用户可以在小程序内打开
  return `/pages/order-detail/order-detail?orderId=${orderId}`
}

exports.main = async (event, context) => {
  const { orderId, type } = event

  if (!orderId) {
    return { code: 400, message: '缺少订单ID' }
  }

  try {
    // 1. 验证订单是否存在
    const orderRes = await db.collection('orders').doc(orderId).get()

    if (!orderRes.data) {
      return { code: 404, message: '订单不存在' }
    }

    const order = orderRes.data

    // 2. 生成分享链接
    const shareLink = generateShareLink(orderId)

    // 3. 如果只需要链接，直接返回
    if (type === 'link') {
      return {
        code: 200,
        data: {
          shareLink,
          orderNo: order.orderNo
        }
      }
    }

    // 4. 生成分享码
    // scene 参数最大32个可见字符，使用 orderId
    const scene = orderId.substring(0, 32)
    const page = 'pages/order-detail/order-detail'

    // 获取 access_token
    const accessToken = await getAccessToken()

    // 生成小程序码
    const result = await generateWxACode(accessToken, scene, page)

    // 将 buffer 转换为 base64
    const base64 = result.buffer.toString('base64')
    const dataUri = `data:${result.contentType};base64,${base64}`

    console.log('生成分享码成功, orderId:', orderId)

    return {
      code: 200,
      data: {
        shareLink,
        orderNo: order.orderNo,
        qrCodeImage: dataUri  // base64格式的图片
      }
    }

  } catch (error) {
    console.error('生成分享码失败:', error)
    return {
      code: 500,
      message: error.message || '生成分享码失败'
    }
  }
}

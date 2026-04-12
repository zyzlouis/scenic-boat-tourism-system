// 云函数：生成分享码（支持订单和船型）
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const wxCloudBaseUrl = 'https://api.weixin.qq.com'

/**
 * 发送 HTTP 请求（Node.js 原生 https）
 */
function httpRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: data ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      } : {}
    }

    const req = https.request(options, (res) => {
      let chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        // 如果是 JSON 响应
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            const json = JSON.parse(buffer.toString())
            resolve({ data: json, statusCode: res.statusCode })
          } catch (e) {
            resolve({ data: buffer.toString(), statusCode: res.statusCode })
          }
        } else {
          // 二进制响应（如图片）
          resolve({ buffer, statusCode: res.statusCode, contentType: res.headers['content-type'] })
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

/**
 * 获取 access_token
 */
async function getAccessToken() {
  // 从配置获取 AppID 和 AppSecret
  const settings = await db.collection('app_settings').doc('global_settings').get()

  if (!settings.data) {
    throw new Error('未找到应用配置')
  }

  const { AppID, AppSecret } = settings.data

  if (!AppID || !AppSecret) {
    throw new Error('未配置微信AppID或AppSecret')
  }

  // 请求 access_token
  const url = `${wxCloudBaseUrl}/cgi-bin/token?grant_type=client_credential&appid=${AppID}&secret=${AppSecret}`

  const httpRes = await httpRequest(url)

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
async function generateWxACode(accessToken, scene, page, width = 430, envVersion = 'release') {
  const url = `${wxCloudBaseUrl}/wxa/getwxacodeunlimit?access_token=${accessToken}`

  const requestData = {
    scene: scene,  // 最大32个可见字符
    page: page,     // 小程序页面路径（不带前导斜杠）
    width: width,   // 二维码宽度
    env_version: envVersion // trial-体验版, develop-开发版, release-正式版
  }

  console.log('请求生成小程序码:', JSON.stringify(requestData))

  const httpRes = await httpRequest(url, 'POST', requestData)

  // 如果返回的是buffer（二进制图片），说明成功
  if (httpRes.buffer && httpRes.statusCode === 200) {
    return {
      buffer: httpRes.buffer,
      contentType: 'image/png'
    }
  }

  // 如果返回的是JSON格式的错误
  if (httpRes.data && httpRes.data.errcode) {
    console.error('生成小程序码失败:', httpRes.data)
    throw new Error(`生成小程序码失败: errcode: ${httpRes.data.errcode}, ${httpRes.data.errmsg}`)
  }

  throw new Error('生成小程序码失败，未知错误')
}

/**
 * 根据类型生成分享链接
 */
function generateShareLink(type, code) {
  if (type === 'boat') {
    // 船型详情页
    return `/pages/boat-type/boat-type?code=${code}`
  } else {
    // 订单详情页
    return `/pages/order-detail/order-detail?orderId=${code}`
  }
}

exports.main = async (event, context) => {
  const { type, code, page: customPage, width } = event

  // type: 'boat' 或 'order'
  // code: 船型code 或 订单id
  // customPage: 可选，自定义页面路径
  // width: 二维码宽度，默认430

  if (!type || !code) {
    return { code: 400, message: '缺少类型或编码参数' }
  }

  if (!['boat', 'order'].includes(type)) {
    return { code: 400, message: '类型参数无效，仅支持 boat 或 order' }
  }

  try {
    let shareLink = ''
    let name = ''

    if (type === 'boat') {
      // 1. 验证船型是否存在
      const boatRes = await db.collection('boatTypes').where({ code: code, enabled: true }).get()

      if (!boatRes.data || boatRes.data.length === 0) {
        return { code: 404, message: '船型不存在' }
      }

      const boat = boatRes.data[0]
      name = boat.name
      shareLink = generateShareLink('boat', code)

    } else {
      // 1. 验证订单是否存在
      const orderRes = await db.collection('orders').doc(code).get()

      if (!orderRes.data) {
        return { code: 404, message: '订单不存在' }
      }

      const order = orderRes.data
      name = order.orderNo
      shareLink = generateShareLink('order', code)
    }

    // 2. 如果只需要链接，直接返回
    if (customPage === 'link') {
      return {
        code: 200,
        data: {
          shareLink,
          name: name
        }
      }
    }

    // 3. 生成分享码
    // scene 参数会传递给页面的 onLoad，作为 query 参数
    const scene = type === 'boat' ? `code=${code}` : `orderId=${code}`
    // 临时用首页测试，因为 getwxacodeunlimit 要求页面必须已发布
    const pagePath = 'pages/index/index'

    // 获取 access_token
    const accessToken = await getAccessToken()

    // 生成小程序码
    // env_version: release=正式版, trial=体验版, develop=开发版
    const result = await generateWxACode(accessToken, scene, pagePath, width || 430, 'release')

    // 将 buffer 转换为 base64
    const base64 = result.buffer.toString('base64')
    const dataUri = `data:${result.contentType};base64,${base64}`

    console.log('生成分享码成功, type:', type, 'code:', code)

    return {
      code: 200,
      data: {
        shareLink,
        name: name,
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
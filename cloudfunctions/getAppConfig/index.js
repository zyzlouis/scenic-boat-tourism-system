const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 获取小程序全局配置
 *
 * 返回配置项：
 * - rechargeEnabled: 是否启用储值功能（boolean）
 * - scenicName: 景区名称
 * - contactPhone: 联系电话
 * - openTime: 营业时间
 * - closeTime: 关闭时间
 * - refundRules: 退款规则
 * - safetyNotice: 安全须知
 * - aboutUs: 关于我们
 * - logoUrl: Logo地址
 * - autoRefundEnabled: 是否启用自动退款（boolean）
 * - autoRefundDays: 自动退款天数（number）
 * - promoBannerEnabled / promoBannerUrl / promoBannerLink: 首页推广横幅
 * - recommendEnabled / recommendTitle: 首页推荐位
 *
 * 注意：app_settings 集合内还存有 AppID / AppSecret 等密钥，
 * 必须按下方白名单挑字段返回，严禁整份文档透传给客户端。
 */
const PUBLIC_FIELDS = [
  'rechargeEnabled',
  'scenicName',
  'contactPhone',
  'openTime',
  'closeTime',
  'refundRules',
  'safetyNotice',
  'aboutUs',
  'logoUrl',
  'autoRefundEnabled',
  'autoRefundDays',
  'promoBannerEnabled',
  'promoBannerUrl',
  'promoBannerLink',
  'recommendEnabled',
  'recommendTitle'
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    // 获取全局配置
    const { data: appConfig } = await db.collection('app_settings')
      .doc('global_settings')
      .get()

    if (!appConfig) {
      return {
        code: 404,
        message: '配置不存在',
        data: null
      }
    }

    // 白名单过滤，剔除 AppID / AppSecret 等敏感字段
    const safeConfig = {}
    PUBLIC_FIELDS.forEach(key => {
      if (appConfig[key] !== undefined) safeConfig[key] = appConfig[key]
    })

    return {
      code: 200,
      message: '获取配置成功',
      data: safeConfig
    }
  } catch (error) {
    console.error('获取配置失败:', error)

    return {
      code: 500,
      message: '服务器错误',
      data: null,
      error: error.message
    }
  }
}

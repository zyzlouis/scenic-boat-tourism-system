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
 */
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

    return {
      code: 200,
      message: '获取配置成功',
      data: {
        rechargeEnabled: appConfig.rechargeEnabled || false, // 储值功能开关，默认为false
        scenicName: appConfig.scenicName || '',
        contactPhone: appConfig.contactPhone || '',
        openTime: appConfig.openTime || '',
        closeTime: appConfig.closeTime || '',
        refundRules: appConfig.refundRules || '',
        safetyNotice: appConfig.safetyNotice || '',
        aboutUs: appConfig.aboutUs || '',
        logoUrl: appConfig.logoUrl || '',
        autoRefundEnabled: appConfig.autoRefundEnabled !== false, // 自动退款开关，默认为true
        autoRefundDays: appConfig.autoRefundDays || 7  // 自动退款天数，默认7天
      }
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

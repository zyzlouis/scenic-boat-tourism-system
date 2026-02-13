// 云函数：获取轮播图和公告
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const now = new Date()

    // 1. 获取启用的轮播图
    const { data: banners } = await db.collection('banners')
      .where({ enabled: true })
      .orderBy('sort', 'asc')
      .get()

    // 2. 获取首页显示的公告（有效期内）
    const { data: announcements } = await db.collection('announcements')
      .where({
        enabled: true,
        showOnHome: true,
        startDate: _.lte(now),
        endDate: _.gte(now)
      })
      .orderBy('sort', 'asc')
      .get()

    return {
      success: true,
      banners: banners || [],
      announcements: announcements || []
    }
  } catch (error) {
    console.error('获取轮播图和公告失败:', error)
    return {
      success: false,
      message: '获取数据失败',
      error: error.message,
      banners: [],
      announcements: []
    }
  }
}

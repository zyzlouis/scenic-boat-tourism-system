const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { data: navItems } = await db.collection('navItems')
      .where({ enabled: true })
      .orderBy('sort', 'asc')
      .get()

    return { code: 200, message: '成功', data: navItems }
  } catch (error) {
    console.error('获取导航列表失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}

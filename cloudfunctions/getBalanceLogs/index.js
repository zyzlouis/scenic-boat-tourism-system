// 云函数：获取余额变动记录
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { page = 0, pageSize = 20 } = event

  try {
    // 分页查询用户的余额变动流水
    const { data } = await db.collection('balance_logs')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 查询总数
    const { total } = await db.collection('balance_logs')
      .where({ _openid: openid })
      .count()

    return {
      success: true,
      logs: data,
      total: total,
      page: page,
      pageSize: pageSize,
      hasMore: (page + 1) * pageSize < total
    }
  } catch (error) {
    console.error('获取余额变动记录失败:', error)
    return {
      success: false,
      message: '获取余额变动记录失败',
      error: error.message
    }
  }
}

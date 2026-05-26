const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { data: projects } = await db.collection('projects')
      .where({ enabled: true })
      .orderBy('sort', 'asc')
      .get()

    if (projects.length === 0) {
      return { code: 200, message: '成功', data: [] }
    }

    const projectIds = projects.map(p => p._id)
    const _ = db.command

    const { data: products } = await db.collection('products')
      .where({
        projectId: _.in(projectIds),
        enabled: true
      })
      .orderBy('sort', 'asc')
      .get()

    const result = projects.map(project => ({
      ...project,
      products: products.filter(p => p.projectId === project._id)
    }))

    return { code: 200, message: '成功', data: result }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}

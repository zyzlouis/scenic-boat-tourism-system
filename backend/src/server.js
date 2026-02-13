require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3000;

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await db.sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('=================================');
      console.log('🚀 服务器启动成功');
      console.log(`📡 监听端口: ${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API地址: http://localhost:${PORT}/api/v1`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n收到SIGINT信号，正在关闭服务器...');
  await db.sequelize.close();
  process.exit(0);
});

// 启动
startServer();

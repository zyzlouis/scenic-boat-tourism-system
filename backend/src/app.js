const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// 导入路由
const routes = require('./routes');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// 创建Express应用
const app = express();

// ==================== 中间件配置 ====================
// 安全头
app.use(helmet());

// 跨域
app.use(cors());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==================== 路由配置 ====================
// API路由（统一前缀 /api/v1）
app.use('/api/v1', routes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: '景区游船计时收费系统API',
    version: '1.0.0',
    status: 'running',
    timestamp: Date.now()
  });
});

// ==================== 错误处理 ====================
// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

module.exports = app;

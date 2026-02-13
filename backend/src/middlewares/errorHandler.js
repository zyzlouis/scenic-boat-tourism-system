const ResponseUtil = require('../utils/response');

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('❌ 错误:', err);

  // Sequelize 数据库错误
  if (err.name === 'SequelizeValidationError') {
    return ResponseUtil.badRequest(res, err.errors[0].message);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return ResponseUtil.badRequest(res, '数据已存在');
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return ResponseUtil.unauthorized(res, '无效的Token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseUtil.unauthorized(res, 'Token已过期');
  }

  // 默认服务器错误
  return ResponseUtil.serverError(res, err.message || '服务器内部错误');
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res) {
  return ResponseUtil.notFound(res, '接口不存在');
}

module.exports = {
  errorHandler,
  notFoundHandler
};

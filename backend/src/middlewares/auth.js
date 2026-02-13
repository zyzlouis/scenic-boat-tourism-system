const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const ResponseUtil = require('../utils/response');

/**
 * 用户认证中间件
 */
function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return ResponseUtil.unauthorized(res, '请先登录');
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 检查是否是用户token
    if (decoded.type !== 'user') {
      return ResponseUtil.forbidden(res, '无效的用户凭证');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, 'Token已过期，请重新登录');
    }
    return ResponseUtil.unauthorized(res, '无效的Token');
  }
}

/**
 * 员工认证中间件
 */
function authenticateStaff(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return ResponseUtil.unauthorized(res, '请先登录');
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 检查是否是员工token
    if (decoded.type !== 'staff') {
      return ResponseUtil.forbidden(res, '无效的员工凭证');
    }

    req.staff = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, 'Token已过期，请重新登录');
    }
    return ResponseUtil.unauthorized(res, '无效的Token');
  }
}

/**
 * 管理员认证中间件
 */
function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return ResponseUtil.unauthorized(res, '请先登录');
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 检查是否是管理员
    if (decoded.type !== 'staff' || decoded.role !== 'admin') {
      return ResponseUtil.forbidden(res, '需要管理员权限');
    }

    req.staff = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, 'Token已过期，请重新登录');
    }
    return ResponseUtil.unauthorized(res, '无效的Token');
  }
}

module.exports = {
  authenticateUser,
  authenticateStaff,
  authenticateAdmin
};

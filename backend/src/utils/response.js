/**
 * 统一响应格式工具类
 */
class ResponseUtil {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '成功', code = 200) {
    return res.status(200).json({
      code,
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 失败响应
   */
  static error(res, message = '请求失败', code = 400, data = null) {
    return res.status(200).json({
      code,
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 参数错误
   */
  static badRequest(res, message = '参数错误') {
    return this.error(res, message, 400);
  }

  /**
   * 未授权
   */
  static unauthorized(res, message = '未登录或Token失效') {
    return this.error(res, message, 401);
  }

  /**
   * 无权限
   */
  static forbidden(res, message = '无权限') {
    return this.error(res, message, 403);
  }

  /**
   * 资源不存在
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404);
  }

  /**
   * 服务器错误
   */
  static serverError(res, message = '服务器内部错误') {
    return this.error(res, message, 500);
  }

  /**
   * 业务错误（自定义错误码）
   */
  static businessError(res, message, code) {
    return this.error(res, message, code);
  }
}

module.exports = ResponseUtil;

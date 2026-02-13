const moment = require('moment');

/**
 * 生成订单号
 * 格式: ORD + YYYYMMDDHHmmss + 6位随机数
 * 示例: ORD20260204123456123456
 */
function generateOrderNo() {
  const dateStr = moment().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `ORD${dateStr}${random}`;
}

/**
 * 生成支付流水号
 */
function generatePaymentNo() {
  const dateStr = moment().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `PAY${dateStr}${random}`;
}

/**
 * 生成退款流水号
 */
function generateRefundNo() {
  const dateStr = moment().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `REF${dateStr}${random}`;
}

/**
 * 生成核销码
 * 格式: VF + 时间戳后6位 + 6位随机字母数字
 */
function generateVerificationCode() {
  const timestamp = Date.now().toString().slice(-6);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VF${timestamp}${random}`;
}

module.exports = {
  generateOrderNo,
  generatePaymentNo,
  generateRefundNo,
  generateVerificationCode
};

/**
 * 格式化时间
 */
function formatTime(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  const second = d.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 格式化时长（分钟转为时分格式）
 */
function formatDuration(minutes) {
  if (!minutes) return '0分钟';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}

/**
 * 格式化金额
 */
function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(2);
}

/**
 * 订单状态映射
 */
const ORDER_STATUS_MAP = {
  pending: { text: '待支付', color: '#ff9800' },
  paid: { text: '待核销', color: '#2196f3' },
  verified: { text: '待发船', color: '#2196f3' },
  timing: { text: '计时中', color: '#4caf50' },
  ended: { text: '结算中', color: '#9c27b0' },
  completed: { text: '已完成', color: '#9e9e9e' },
  refunded: { text: '已退款', color: '#ff5722' },
  cancelled: { text: '已取消', color: '#f44336' },
  timeout: { text: '超时异常', color: '#f44336' }
};

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
  return ORDER_STATUS_MAP[status]?.text || '未知状态';
}

/**
 * 获取订单状态颜色
 */
function getOrderStatusColor(status) {
  return ORDER_STATUS_MAP[status]?.color || '#999999';
}

/**
 * 防抖函数
 */
function debounce(func, wait = 500) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 节流函数
 */
function throttle(func, wait = 500) {
  let timeout;
  return function(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(this, args);
      }, wait);
    }
  };
}

module.exports = {
  formatTime,
  formatDate,
  formatDuration,
  formatMoney,
  getOrderStatusText,
  getOrderStatusColor,
  debounce,
  throttle
};

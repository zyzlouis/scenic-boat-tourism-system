// utils/cloud.js - 云函数调用封装（员工端）

/**
 * 调用云函数
 */
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      success: res => {
        console.log(`[云函数] ${name}`, res.result)

        const { code, message, data: resData } = res.result

        if (code === 200) {
          // 调用成功
          resolve(res.result)
        } else {
          // 业务错误
          wx.showToast({
            title: message || '请求失败',
            icon: 'none'
          })
          reject(res.result)
        }
      },
      fail: err => {
        console.error(`[云函数错误] ${name}`, err)
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

/**
 * 员工登录
 */
function staffLogin(username, password) {
  return callFunction('staffLogin', { username, password })
}

/**
 * 扫码核销
 */
function scanCode(verificationCode, staffId) {
  return callFunction('scanCode', { verificationCode, staffId })
}

/**
 * 发船（开始计时）
 */
function startTrip(orderId, boatNumber, staffId) {
  return callFunction('startTrip', { orderId, boatNumber, staffId })
}

/**
 * 收船（结束计时）
 */
function endTrip(orderId, staffId) {
  return callFunction('endTrip', { orderId, staffId })
}

/**
 * 船号反查订单
 */
function findByBoatNumber(boatNumber) {
  return callFunction('findByBoatNumber', { boatNumber })
}

/**
 * 获取待处理订单列表
 */
function getPendingOrders() {
  return callFunction('getPendingOrders', {})
}

module.exports = {
  callFunction,
  staffLogin,
  scanCode,
  startTrip,
  endTrip,
  findByBoatNumber,
  getPendingOrders
}

// utils/cloud.js - 云函数调用封装

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
 * 获取船型列表
 */
function getBoatTypes() {
  return callFunction('getBoatTypes', {})
}

/**
 * 创建订单
 */
function createOrder(boatTypeId) {
  return callFunction('createOrder', { boatTypeId })
}

/**
 * 获取订单详情
 */
function getOrderDetail(orderId) {
  return callFunction('getOrderDetail', { orderId })
}

/**
 * 获取订单列表
 */
function getOrderList(page = 1, pageSize = 10, status = null) {
  return callFunction('getOrderList', { page, pageSize, status })
}

module.exports = {
  callFunction,
  getBoatTypes,
  createOrder,
  getOrderDetail,
  getOrderList
}

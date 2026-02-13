// utils/api.js
const app = getApp();

/**
 * 封装的HTTP请求函数
 */
function request(url, method = 'GET', data = {}, needAuth = true) {
  return new Promise((resolve, reject) => {
    // 构建完整URL
    const fullUrl = app.globalData.baseUrl + url;

    // 构建请求头
    const header = {
      'Content-Type': 'application/json'
    };

    // 如果需要认证，添加token
    if (needAuth && app.globalData.token) {
      header.Authorization = `Bearer ${app.globalData.token}`;
    }

    // 发起请求
    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      success: (res) => {
        console.log(`[API] ${method} ${url}`, res.data);

        // 统一处理响应
        if (res.statusCode === 200) {
          const { code, message, data: resData } = res.data;

          if (code === 200) {
            // 请求成功
            resolve(res.data);
          } else if (code === 401) {
            // Token失效，需要重新登录
            wx.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none'
            });
            app.logout();
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }, 1500);
            reject(res.data);
          } else {
            // 业务错误
            wx.showToast({
              title: message || '请求失败',
              icon: 'none'
            });
            reject(res.data);
          }
        } else {
          // HTTP错误
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          });
          reject(res);
        }
      },
      fail: (err) => {
        console.error(`[API Error] ${method} ${url}`, err);
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

/**
 * GET请求
 */
function get(url, data = {}, needAuth = true) {
  return request(url, 'GET', data, needAuth);
}

/**
 * POST请求
 */
function post(url, data = {}, needAuth = true) {
  return request(url, 'POST', data, needAuth);
}

/**
 * PUT请求
 */
function put(url, data = {}, needAuth = true) {
  return request(url, 'PUT', data, needAuth);
}

/**
 * DELETE请求
 */
function del(url, data = {}, needAuth = true) {
  return request(url, 'DELETE', data, needAuth);
}

module.exports = {
  get,
  post,
  put,
  del
};

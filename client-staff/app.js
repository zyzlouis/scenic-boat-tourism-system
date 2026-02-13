// app.js
App({
  globalData: {
    staffInfo: null
  },

  onLaunch() {
    console.log('员工端小程序启动');

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cc-5gos3ctb46510316',  // 云开发环境ID，需要替换为真实的环境ID（与用户端相同）
        traceUser: true
      })
      console.log('✅ 云开发初始化成功')
    }

    this.checkLogin();
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const staffInfo = wx.getStorageSync('staff_info');
    if (staffInfo) {
      this.globalData.staffInfo = staffInfo;
      return true;
    }
    return false;
  },

  /**
   * 员工登录（调用云函数）
   */
  async login(username, password) {
    try {
      const cloud = require('./utils/cloud');
      const res = await cloud.staffLogin(username, password);

      // 保存员工信息
      this.globalData.staffInfo = res.data.staffInfo;
      wx.setStorageSync('staff_info', res.data.staffInfo);

      console.log('✅ 员工登录成功', res.data.staffInfo);
      return res.data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.staffInfo = null;
    wx.removeStorageSync('staff_info');

    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  /**
   * 获取员工信息
   */
  getStaffInfo() {
    return this.globalData.staffInfo;
  },

  /**
   * 检查是否是管理员
   */
  isAdmin() {
    return this.globalData.staffInfo?.role === 'admin';
  }
});

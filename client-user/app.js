// app.js
App({
  globalData: {
    userInfo: null,
    staffInfo: null  // 员工信息
  },

  onLaunch() {
    console.log('小程序启动');

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cc-5gos3ctb46510316',  // 替换为生产环境的云环境ID（在云开发控制台查看）
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
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      return true;
    }
    return false;
  },

  /**
   * 微信登录（云开发自动登录）
   */
  async login() {
    try {
      // 云开发会自动获取用户openid，无需手动调用login接口
      // 只需要获取用户信息授权
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善会员资料'
      })

      this.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)

      console.log('✅ 用户登录成功', userInfo)
      return userInfo
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
      throw error
    }
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
  },

  // ==================== 员工端方法 ====================

  /**
   * 检查员工登录状态
   */
  checkStaffLogin() {
    const staffInfo = wx.getStorageSync('staff_info');
    if (staffInfo) {
      this.globalData.staffInfo = staffInfo;
      return true;
    }
    return false;
  },

  /**
   * 员工登录
   */
  async staffLogin(username, password) {
    try {
      wx.showLoading({ title: '登录中...', mask: true });

      const res = await wx.cloud.callFunction({
        name: 'staffLogin',
        data: { username, password }
      });

      wx.hideLoading();

      console.log('📝 staffLogin 云函数返回:', res.result);

      // 云函数返回格式：{ code: 200, message: '登录成功', data: { staffInfo: {...} } }
      if (res.result.code === 200) {
        const staffInfo = res.result.data.staffInfo;
        this.globalData.staffInfo = staffInfo;
        wx.setStorageSync('staff_info', staffInfo);
        console.log('✅ 员工登录成功', staffInfo);
        return staffInfo;
      } else {
        wx.showToast({
          title: res.result.message || '登录失败',
          icon: 'none'
        });
        throw new Error(res.result.message || '登录失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('员工登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      throw error;
    }
  },

  /**
   * 员工退出登录
   */
  staffLogout() {
    this.globalData.staffInfo = null;
    wx.removeStorageSync('staff_info');
    console.log('✅ 员工已退出登录');
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

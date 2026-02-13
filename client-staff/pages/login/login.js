// pages/login/login.js
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onLoad() {
    // 检查是否已登录
    if (app.checkLogin()) {
      wx.reLaunch({
        url: '/pages/scan/scan'
      });
    }
  },

  /**
   * 输入用户名
   */
  onUsernameChange(e) {
    this.setData({
      username: e.detail
    });
  },

  /**
   * 输入密码
   */
  onPasswordChange(e) {
    this.setData({
      password: e.detail
    });
  },

  /**
   * 登录
   */
  async handleLogin() {
    const { username, password } = this.data;

    // 验证
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ loading: true });

      await app.login(username, password);

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });

      // 跳转到扫码页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/scan/scan'
        });
      }, 1500);
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({ loading: false });
    }
  }
});

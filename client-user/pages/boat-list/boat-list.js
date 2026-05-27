const cloud = require('../../utils/cloud');
const app = getApp();

Page({
  data: {
    boatTypes: [],
    loading: true
  },

  onLoad() {
    this.loadBoatTypes();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadBoatTypes();
    }
  },

  async loadBoatTypes() {
    try {
      this.setData({ loading: true });
      const res = await cloud.getBoatTypes();
      this.setData({ boatTypes: res.data || [], loading: false });
    } catch (error) {
      console.error('加载船型列表失败:', error);
      this.setData({ loading: false });
    }
  },

  goToBoatDetail(e) {
    const { code, id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/boat-type/boat-type?code=${code || id}`
    });
  },

  async onPullDownRefresh() {
    await this.loadBoatTypes();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '翠屏湖景区游船 - 在线预约',
      path: '/pages/index/index'
    };
  }
});

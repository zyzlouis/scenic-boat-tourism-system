// pages/index/index.js
const cloud = require('../../utils/cloud');

Page({
  data: {
    banners: [],
    announcements: [],
    navItems: [],
    appConfig: null,
    loading: true
  },

  onLoad() {
    this.loadBannersAndAnnouncements();
    this.loadNavItems();
    this.loadAppConfig();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadBannersAndAnnouncements();
      this.loadNavItems();
    }
  },

  async loadBannersAndAnnouncements() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getBannersAndAnnouncements' });
      if (res.result.success) {
        this.setData({
          banners: res.result.banners || [],
          announcements: res.result.announcements || []
        });
      }
    } catch (error) {
      console.error('加载轮播图和公告失败:', error);
    }
  },

  async loadNavItems() {
    try {
      const res = await cloud.getNavItems();
      this.setData({ navItems: res.data || [], loading: false });
    } catch (error) {
      console.error('加载导航失败:', error);
      this.setData({ loading: false });
    }
  },

  async loadAppConfig() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getAppConfig' });
      if (res.result.code === 200) {
        this.setData({ appConfig: res.result.data });
      }
    } catch (error) {
      console.error('加载景区信息失败:', error);
    }
  },

  onNavTap(e) {
    const { path } = e.currentTarget.dataset;
    if (path) {
      wx.navigateTo({
        url: path,
        fail: () => {
          wx.switchTab({ url: path });
        }
      });
    }
  },

  onBannerClick(e) {
    const item = e.currentTarget.dataset.item;
    if (item.linkType === 'page') {
      wx.navigateTo({ url: item.linkUrl });
    }
  },

  onAnnouncementClick(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({ url: `/pages/announcement-detail/announcement-detail?id=${item._id}` });
  },

  async onPullDownRefresh() {
    await Promise.all([
      this.loadBannersAndAnnouncements(),
      this.loadNavItems()
    ]);
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '翠屏湖景区 - 在线预约',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return { title: '翠屏湖景区 - 在线预约' };
  }
});

// pages/index/index.js
const cloud = require('../../utils/cloud');

Page({
  data: {
    banners: [],
    announcements: [],
    navItems: [],
    navClass: 'nav-cols-4',
    appConfig: null,
    recommendItems: [],
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
      const items = res.data || [];
      const n = items.length;
      // 按数量自适应：1~4 个用对应列数放大，5 个及以上每行 4 个换行
      const navClass = 'nav-cols-' + (n >= 4 ? 4 : (n || 4));
      this.setData({ navItems: items, navClass, loading: false });
    } catch (error) {
      console.error('加载导航失败:', error);
      this.setData({ loading: false });
    }
  },

  async loadAppConfig() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getAppConfig' });
      if (res.result.code === 200) {
        const config = res.result.data;
        this.setData({ appConfig: config });
        if (config.recommendEnabled) {
          this.loadRecommendItems();
        }
      }
    } catch (error) {
      console.error('加载景区信息失败:', error);
    }
  },

  async loadRecommendItems() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const { data } = await db.collection('recommendItems')
        .where({ enabled: true })
        .orderBy('sort', 'asc')
        .get();
      this.setData({ recommendItems: data || [] });
    } catch (error) {
      console.error('加载推荐数据失败:', error);
    }
  },

  onPromoBannerTap() {
    const link = this.data.appConfig && this.data.appConfig.promoBannerLink;
    if (link) {
      wx.navigateTo({
        url: link,
        fail: () => { wx.switchTab({ url: link }); }
      });
    }
  },

  onRecommendTap(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      if (url.startsWith('http')) {
        wx.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(url)}` });
      } else {
        wx.navigateTo({ url });
      }
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

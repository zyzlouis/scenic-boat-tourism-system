// pages/index/index.js
const cloud = require('../../utils/cloud');
const app = getApp();

Page({
  data: {
    banners: [],
    announcements: [],
    boatTypes: [],
    loading: true
  },

  onLoad() {
    this.loadBannersAndAnnouncements();
    this.loadBoatTypes();
  },

  onShow() {
    // 每次显示页面时，刷新数据
    if (!this.data.loading) {
      this.loadBannersAndAnnouncements();
      this.loadBoatTypes();
    }
  },

  /**
   * 加载轮播图和公告
   */
  async loadBannersAndAnnouncements() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getBannersAndAnnouncements'
      });

      console.log('📢 轮播图和公告:', res.result);

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

  /**
   * 加载船型列表
   */
  async loadBoatTypes() {
    try {
      this.setData({ loading: true });

      const res = await cloud.getBoatTypes();

      this.setData({
        boatTypes: res.data || [],
        loading: false
      });
    } catch (error) {
      console.error('加载船型列表失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 选择船型，创建订单
   */
  async selectBoatType(e) {
    const { id } = e.currentTarget.dataset;

    // 云开发会自动获取用户openid，无需手动登录
    // 直接创建订单
    this.createOrder(id);
  },

  /**
   * 创建订单
   */
  async createOrder(boatTypeId) {
    try {
      wx.showLoading({ title: '创建订单中...' });

      const res = await cloud.createOrder(boatTypeId);

      wx.hideLoading();

      if (res.code === 200) {
        // 跳转到支付页面
        wx.navigateTo({
          url: `/pages/payment/payment?orderId=${res.data.orderId}`
        });
      } else {
        wx.showToast({
          title: res.message || '创建订单失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建订单失败:', error);
      wx.showToast({
        title: '创建订单失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await Promise.all([
      this.loadBannersAndAnnouncements(),
      this.loadBoatTypes()
    ]);
    wx.stopPullDownRefresh();
  },

  /**
   * 轮播图点击
   */
  onBannerClick(e) {
    const item = e.currentTarget.dataset.item;

    console.log('🖱️ 点击轮播图:', item);

    if (item.linkType === 'page') {
      wx.navigateTo({
        url: item.linkUrl
      });
    }
    // linkType === 'none' 或 'web' 不处理
  },

  /**
   * 公告点击
   */
  onAnnouncementClick(e) {
    const item = e.currentTarget.dataset.item;

    console.log('🖱️ 点击公告:', item);

    wx.navigateTo({
      url: `/pages/announcement-detail/announcement-detail?id=${item._id}`
    });
  }
});

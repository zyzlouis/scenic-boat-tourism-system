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

    // 检查是否有从详情页返回的船型code
    const selectedCode = app.globalData.selectedBoatTypeCode
    if (selectedCode) {
      app.globalData.selectedBoatTypeCode = null // 清除标记
      // 找到对应的船型并创建订单
      const boatType = this.data.boatTypes.find(bt => bt.code === selectedCode || bt.id === selectedCode)
      if (boatType) {
        wx.showToast({ title: '正在创建订单...', icon: 'none', duration: 1500 })
        setTimeout(() => {
          this.createOrder(boatType.id)
        }, 1500)
      }
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
   * 跳转到船型详情页
   */
  goToBoatDetail(e) {
    const { code, id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/boat-type/boat-type?code=${code || id}`
    });
  },

  /**
   * 选择船型，创建订单（保留原有功能）
   */
  async selectBoatType(e) {
    const { id } = e.currentTarget.dataset;
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

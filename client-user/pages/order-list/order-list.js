// pages/order-list/order-list.js
const cloud = require('../../utils/cloud');
const util = require('../../utils/util');

Page({
  data: {
    orders: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: true,
    hasMore: true,
    formatTime: util.formatTime,
    formatMoney: util.formatMoney,
    getOrderStatusText: util.getOrderStatusText,
    getOrderStatusColor: util.getOrderStatusColor
  },

  onLoad() {
    this.loadOrderList();
  },

  onShow() {
    this.refreshOrderList();
  },

  async loadOrderList() {
    if (!this.data.hasMore) {
      return;
    }

    try {
      this.setData({ loading: true });

      const res = await cloud.getOrderList(this.data.page, this.data.pageSize);

      if (res.code === 200) {
        const { list, total, hasMore } = res.data;
        const newOrders = this.data.page === 1 ? list : [...this.data.orders, ...list];

        this.setData({
          orders: newOrders,
          total,
          loading: false,
          hasMore
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
      this.setData({ loading: false });
    }
  },

  async refreshOrderList() {
    this.setData({
      page: 1,
      hasMore: true
    });
    await this.loadOrderList();
  },

  gotoOrderDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'product') {
      wx.navigateTo({ url: `/pages/product-order/product-order?orderId=${id}` });
    } else {
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderId=${id}` });
    }
  },

  async onPullDownRefresh() {
    await this.refreshOrderList();
    wx.stopPullDownRefresh();
  },

  async onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      });
      await this.loadOrderList();
    }
  },

  onShareAppMessage() {
    return {
      title: '翠屏湖水上乐园',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '翠屏湖水上乐园'
    }
  }
});

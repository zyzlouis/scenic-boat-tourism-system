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
    // 每次显示页面时，刷新第一页数据
    this.refreshOrderList();
  },

  /**
   * 加载订单列表
   */
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

  /**
   * 刷新订单列表
   */
  async refreshOrderList() {
    this.setData({
      page: 1,
      hasMore: true
    });
    await this.loadOrderList();
  },

  /**
   * 查看订单详情
   */
  gotoOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${id}`
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.refreshOrderList();
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  async onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      });
      await this.loadOrderList();
    }
  }
});

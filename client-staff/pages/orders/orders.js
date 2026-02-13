// pages/orders/orders.js
const cloud = require('../../utils/cloud');
const util = require('../../utils/util');

Page({
  data: {
    orders: [],
    overtimeCount: 0,  // 超时订单数量
    loading: true,
    formatTime: util.formatTime,
    formatDuration: util.formatDuration
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadOrders();
  },

  /**
   * 加载待处理订单列表（计时中的订单）
   */
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const res = await cloud.getPendingOrders();

      const orders = res.data || [];
      // 计算超时订单数量
      const overtimeCount = orders.filter(item => item.isOvertime).length;

      this.setData({
        orders: orders,
        overtimeCount: overtimeCount,
        loading: false
      });
    } catch (error) {
      console.error('加载订单列表失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 处理订单（收船）
   */
  handleOrder(e) {
    const { order } = e.currentTarget.dataset;

    const content = `船号：${order.boatNumber}
船型：${order.boatTypeName}
游客：${order.userNickname}
开始时间：${util.formatTime(order.startTime)}
已用时长：${util.formatDuration(order.usedMinutes)}
${order.isOvertime ? `\n⚠️ 已超时：${util.formatDuration(order.overtimeMinutes)}` : ''}

确认收船并结算吗？`;

    wx.showModal({
      title: '收船确认',
      content: content,
      confirmText: '确认收船',
      confirmColor: '#07c160',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '结算中...' });

            const app = getApp();
            const staffInfo = app.getStaffInfo();
            await cloud.endTrip(order.orderId, staffInfo?._id || staffInfo?.id);

            wx.hideLoading();
            util.playSuccessSound();

            wx.showToast({
              title: '✅ 收船成功',
              icon: 'success',
              duration: 2000
            });

            // 刷新列表
            this.loadOrders();
          } catch (error) {
            wx.hideLoading();
            util.playErrorSound();
            console.error('收船失败:', error);
          }
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadOrders();
    wx.stopPullDownRefresh();
  }
});

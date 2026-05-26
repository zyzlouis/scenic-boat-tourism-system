Page({
  data: {
    order: null,
    loading: true,
    remainDays: 0
  },

  onLoad(options) {
    const { orderId } = options;
    if (orderId) {
      this.loadOrder(orderId);
    }
  },

  onShow() {
    if (this.data.order) {
      this.loadOrder(this.data.order._id);
    }
  },

  async loadOrder(orderId) {
    try {
      const { data: order } = await wx.cloud.database().collection('orders').doc(orderId).get();
      let remainDays = 0;
      if (order.verificationDeadline && order.status === 'paid') {
        const deadline = new Date(order.verificationDeadline);
        remainDays = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));
      }
      this.setData({ order, loading: false, remainDays });
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
    }
  },

  async handleRefund() {
    const result = await wx.showModal({
      title: '确认退款？',
      content: `将退还 ¥${this.data.order.totalAmount.toFixed(2)}`,
      confirmText: '确认退款',
      confirmColor: '#f44336'
    });
    if (!result.confirm) return;

    try {
      wx.showLoading({ title: '退款中...', mask: true });
      const res = await wx.cloud.callFunction({
        name: 'refundOrder',
        data: { orderId: this.data.order._id, reason: '用户申请退款' }
      });
      wx.hideLoading();
      if (res.result.code === 200) {
        wx.showToast({ title: '退款成功', icon: 'success' });
        setTimeout(() => this.loadOrder(this.data.order._id), 1500);
      } else {
        wx.showToast({ title: res.result.message || '退款失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '退款失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return { title: '景区商品订单', path: '/pages/index/index' };
  }
});

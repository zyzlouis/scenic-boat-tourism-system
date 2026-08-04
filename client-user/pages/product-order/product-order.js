const drawQrcode = require('weapp-qrcode');

// 二维码边长（px）。canvas 的 style 尺寸必须与此一致，否则会被拉伸变形
const QRCODE_SIZE = 200;

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
      // 二维码必须等 canvas 渲染出来才能画，所以放在 setData 回调里。
      // canvas 被 wx:if 包着，订单状态不满足时它根本不存在。
      this.setData({ order, loading: false, remainDays }, () => {
        this.drawVerifyQrcode();
      });
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
    }
  },

  // 把核销码画成二维码
  //
  // 本地计算，不依赖任何外部服务。原游船订单页用的是境外第三方接口
  // (api.qrserver.com) 生成图片，景区信号差时可能加载不出来——
  // 而 PRD 明确写了「考虑到景区湖面信号可能不稳定」。
  drawVerifyQrcode() {
    const order = this.data.order;
    if (!order || order.status !== 'paid' || !order.needVerification || !order.verificationCode) {
      return;
    }

    try {
      drawQrcode({
        width: QRCODE_SIZE,
        height: QRCODE_SIZE,
        canvasId: 'verifyQrcode',
        text: order.verificationCode
      });
    } catch (error) {
      // 画失败不影响页面：文字核销码仍然显示，工作人员可手工输入
      console.error('生成核销二维码失败:', error);
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

const drawQrcode = require('weapp-qrcode');
const phoneUtil = require('../../utils/phone');
const util = require('../../utils/util');

// 二维码边长（px）。canvas 的 style 尺寸必须与此一致，否则会被拉伸变形
const QRCODE_SIZE = 200;

Page({
  data: {
    order: null,
    loading: true,
    remainDays: 0,
    // 是否显示手机号绑定引导（已绑定或订单未支付时不显示）
    needBindPhone: false
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
      const { data: raw } = await wx.cloud.database().collection('orders').doc(orderId).get();

      // 时间必须在 js 层格式化后再传给 WXML。
      // 本页是客户端直读数据库，Date 字段回来是 JS Date 对象，
      // 而 WXS 的 getDate() 解析不了对象，会得到 Invalid Date，
      // 页面上就显示成 NaN-aN-aN aN:aN:aN。
      // （走云函数的页面没这个问题，因为 Date 被序列化成了 ISO 字符串。）
      const order = {
        ...raw,
        createdAtText: util.formatTime(raw.createdAt),
        verificationDeadlineText: raw.verificationDeadline ? util.formatTime(raw.verificationDeadline) : '',
        verifiedAtText: raw.verifiedAt ? util.formatTime(raw.verifiedAt) : ''
      };

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

      // 订单已付款才引导绑定手机号——支付前不打扰，避免重蹈
      // 2026-07-28 那次「支付流程中途插入授权」的覆辙
      this.checkNeedBindPhone(order);
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
    }
  },

  // 判断要不要显示手机号绑定引导
  async checkNeedBindPhone(order) {
    // 未支付 / 已取消的订单不打扰
    if (!order || order.status === 'pending' || order.status === 'cancelled') {
      return;
    }
    // 每个页面实例只查一次。order-detail 在计时中会每 5 秒重新加载订单，
    // 不加这个开关会跟着每 5 秒多调一次云函数。
    if (this._phoneChecked) return;
    this._phoneChecked = true;

    const bound = await phoneUtil.hasBoundPhone();
    this.setData({ needBindPhone: !bound });
  },

  // 授权绑定手机号
  async onGetPhoneNumber(e) {
    if (!e.detail.code) {
      wx.showToast({ title: '已取消', icon: 'none' });
      return;
    }
    // 绑定期间按钮会转圈，但云函数往返有一两秒，仍加锁防重复触发
    if (this._binding) return;
    this._binding = true;

    wx.showLoading({ title: '绑定中...', mask: true });
    try {
      const ok = await phoneUtil.bindPhone(e.detail.code);
      if (ok) {
        this.setData({ needBindPhone: false });
        wx.showToast({ title: '绑定成功', icon: 'success' });
      } else {
        wx.showToast({ title: '绑定失败，请稍后重试', icon: 'none' });
      }
    } catch (error) {
      console.error('绑定手机号失败:', error);
      wx.showToast({ title: '绑定失败，请稍后重试', icon: 'none' });
    } finally {
      this._binding = false;
      wx.hideLoading();
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

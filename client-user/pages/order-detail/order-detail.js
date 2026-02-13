// pages/order-detail/order-detail.js
const cloud = require('../../utils/cloud');
const util = require('../../utils/util');

Page({
  data: {
    orderId: null,
    order: null,
    loading: true,
    timer: null  // 计时器ID
  },

  onLoad(options) {
    const { orderId } = options;
    if (orderId) {
      this.setData({ orderId });
      this.loadOrderDetail();
    }
  },

  onShow() {
    // 页面显示时刷新订单数据
    if (this.data.orderId) {
      this.loadOrderDetail();
    }
  },

  onHide() {
    // 页面隐藏时清除定时器（节省资源）
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  onUnload() {
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });

      const res = await cloud.getOrderDetail(this.data.orderId);

      if (res.code === 200) {
        // 格式化数据
        const orderData = {
          ...res.data,
          // 格式化金额
          basePrice: res.data.basePrice || 0,
          depositAmount: res.data.depositAmount || 0,
          totalAmount: res.data.totalAmount || 0,
          overtimeFee: res.data.overtimeFee || 0,
          estimatedTotalFee: res.data.estimatedTotalFee || 0,
          refundAmount: res.data.refundAmount || 0,
          finalAmount: res.data.finalAmount || 0,
          // 格式化时间
          createdAtFormatted: util.formatTime(res.data.createdAt),
          completedAtFormatted: res.data.completedAt ? util.formatTime(res.data.completedAt) : '',
          startTimeFormatted: res.data.startTime ? util.formatTime(res.data.startTime) : ''
        };

        this.setData({
          order: orderData,
          loading: false
        });

        console.log('📦 订单数据已设置:', orderData);

        // 如果订单正在计时中，启动定时器实时更新
        if (res.data.status === 'timing') {
          this.startTimer();
        }
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载订单详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 启动定时器（每5秒刷新一次）
   */
  startTimer() {
    // 清除之前的定时器（避免重复启动）
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }

    console.log('🕐 启动定时器，每5秒刷新订单数据');

    // 每5秒刷新一次订单详情
    const timer = setInterval(() => {
      console.log('🔄 定时刷新订单数据...');
      this.loadOrderDetail();
    }, 5000);

    this.setData({ timer });
  },

  /**
   * 去支付
   */
  gotoPayment() {
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${this.data.orderId}`
    });
  },

  /**
   * 取消订单
   */
  async cancelOrder() {
    const result = await wx.showModal({
      title: '确认取消订单？',
      content: '取消后此订单将无法恢复',
      confirmText: '确认取消',
      cancelText: '我再想想',
      confirmColor: '#f44336'
    });

    if (!result.confirm) {
      return;
    }

    wx.showLoading({
      title: '取消中...',
      mask: true
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'cancelOrder',
        data: {
          orderId: this.data.orderId
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: '订单已取消',
          icon: 'success',
          duration: 2000
        });

        // 延迟返回订单列表
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        wx.showToast({
          title: res.result.message || '取消失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 取消订单失败:', error);
      wx.showToast({
        title: '取消失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadOrderDetail();
    wx.stopPullDownRefresh();
  }
});

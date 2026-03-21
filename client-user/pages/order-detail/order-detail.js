// pages/order-detail/order-detail.js
const cloud = require('../../utils/cloud');
const util = require('../../utils/util');

Page({
  data: {
    orderId: null,
    order: null,
    loading: true,
    timer: null,  // 计时器ID
    // 分享相关
    shareModalVisible: false,
    shareQrCodeImage: '',
    shareLink: '',
    shareOrderNo: ''
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
   * 申请退款
   */
  async applyRefund() {
    const result = await wx.showModal({
      title: '确认申请退款？',
      content: `退款金额：¥${this.data.order.totalAmount.toFixed(2)}\n退款将在1-3个工作日内原路返回您的支付账户`,
      confirmText: '确认退款',
      cancelText: '我再想想',
      confirmColor: '#1989fa'
    });

    if (!result.confirm) {
      return;
    }

    wx.showLoading({
      title: '退款处理中...',
      mask: true
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'refundOrder',
        data: {
          orderId: this.data.orderId,
          reason: '用户申请退款'
        }
      });

      wx.hideLoading();

      if (res.result.code === 200) {
        wx.showModal({
          title: '退款成功',
          content: res.result.data.notice || '退款将在1-3个工作日内原路返回您的支付账户',
          showCancel: false,
          success: () => {
            // 刷新订单详情
            this.loadOrderDetail();
          }
        });
      } else {
        wx.showModal({
          title: '退款失败',
          content: res.result.message || '退款失败，请稍后重试',
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 申请退款失败:', error);
      wx.showModal({
        title: '退款失败',
        content: '系统错误，请稍后重试',
        showCancel: false
      });
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadOrderDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 分享到微信好友
   */
  onShareAppMessage(res) {
    const order = this.data.order;
    if (!order) return {};

    return {
      title: `游船订单 ${order.orderNo}`,
      path: `/pages/order-detail/order-detail?orderId=${order._id}`,
      imageUrl: order.boatTypeImage || ''
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline(res) {
    const order = this.data.order;
    if (!order) return {};

    return {
      title: `游船订单 ${order.orderNo} - 翠屏湖景区`,
      query: `orderId=${order._id}`
    };
  },

  /**
   * 生成分享码
   */
  async generateShareCode() {
    if (!this.data.order) {
      wx.showToast({ title: '订单加载中...', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'generateShareCode',
        data: {
          orderId: this.data.orderId
        }
      });

      wx.hideLoading();

      if (res.result.code === 200) {
        this.showShareModal(res.result.data);
      } else {
        wx.showToast({
          title: res.result.message || '生成失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('生成分享码失败:', error);
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 显示分享弹窗
   */
  showShareModal(data) {
    this.setData({
      shareModalVisible: true,
      shareQrCodeImage: data.qrCodeImage,
      shareLink: data.shareLink,
      shareOrderNo: data.orderNo
    });
  },

  /**
   * 关闭分享弹窗
   */
  closeShareModal() {
    this.setData({
      shareModalVisible: false
    });
  },

  /**
   * 保存分享码到相册
   */
  async saveShareCode() {
    if (!this.data.shareQrCodeImage) {
      wx.showToast({ title: '分享码未生成', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    try {
      // 将 base64 图片转换为临时文件
      const base64Data = this.data.shareQrCodeImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = wx.base64ToArrayBuffer(base64Data);
      const filePath = `${wx.env.USER_DATA_PATH}/share_qrcode_${Date.now()}.png`;

      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'binary',
        success: () => {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: filePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '已保存到相册',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('保存到相册失败:', err);
              if (err.errMsg.includes('auth deny')) {
                wx.showToast({
                  title: '请授权保存到相册',
                  icon: 'none'
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
              }
            }
          });
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('写入文件失败:', err);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('保存分享码失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  /**
   * 复制分享链接
   */
  copyShareLink() {
    if (!this.data.shareLink) {
      wx.showToast({ title: '链接未生成', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: this.data.shareLink,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 预览分享码图片
   */
  previewShareCode() {
    if (!this.data.shareQrCodeImage) {
      wx.showToast({ title: '分享码未生成', icon: 'none' });
      return;
    }

    wx.previewImage({
      urls: [this.data.shareQrCodeImage],
      fail: () => {
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        });
      }
    });
  }
});

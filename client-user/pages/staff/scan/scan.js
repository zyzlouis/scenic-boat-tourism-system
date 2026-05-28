// pages/scan/scan.js
const cloud = require('../utils/cloud');
const util = require('../utils/util');
const app = getApp();

Page({
  data: {
    staffInfo: null,
    lastScanResult: null,  // 最后一次扫码结果
    formatTime: util.formatTime,
    formatDuration: util.formatDuration,
    formatMoney: util.formatMoney
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.setData({
      staffInfo: app.getStaffInfo()
    });
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    if (!app.checkStaffLogin()) {
      wx.reLaunch({
        url: '/pages/staff/login/login'
      });
    }
  },

  /**
   * 扫码
   */
  handleScan() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        util.vibrateShort();
        console.log('扫码结果:', res.result);
        this.processScan(res.result);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        if (err.errMsg.includes('cancel')) {
          // 用户取消扫码
          return;
        }
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 处理扫码结果
   */
  async processScan(code) {
    try {
      wx.showLoading({ title: '处理中...' });

      const staffInfo = app.getStaffInfo();
      const res = await cloud.scanCode(code, staffInfo?._id || staffInfo?.id);

      wx.hideLoading();
      util.playSuccessSound();

      const data = res.data;

      // 保存扫码结果
      this.setData({
        lastScanResult: data
      });

      // 判断操作类型
      if (data.action === 'verify_product') {
        // 商品核销
        this.showProductVerify(data);
      } else if (data.action === 'start') {
        // 发船 - 需要输入船号
        this.showInputBoatNumber(data);
      } else if (data.action === 'end') {
        // 收船 - 显示账单预览
        this.showBillPreview(data);
      }
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('处理扫码失败:', error);
    }
  },

  /**
   * 显示输入船号对话框（分两步：先确认信息，再输入船号）
   */
  showInputBoatNumber(data) {
    // 第1步：显示订单信息确认
    wx.showModal({
      title: '📋 发船确认',
      content: `游客：${data.userNickname}\n船型：${data.boatTypeName}\n包含时长：${data.includedMinutes}分钟`,
      confirmText: '下一步',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 第2步：输入船号
          this.showBoatNumberInput(data);
        }
      }
    });
  },

  /**
   * 显示船号输入框（纯输入，无其他信息）
   */
  showBoatNumberInput(data) {
    wx.showModal({
      title: '🚤 请输入船号',
      editable: true,
      placeholderText: '例如: E-001 或 P-005',
      content: '',  // 不显示任何内容，保持输入框干净
      confirmText: '确认发船',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          const boatNumber = (res.content || '').trim().toUpperCase();
          if (boatNumber) {
            this.startTrip(data.orderId, boatNumber);
          } else {
            wx.showToast({
              title: '船号不能为空',
              icon: 'none',
              duration: 2000
            });
            // 重新显示输入框
            setTimeout(() => {
              this.showBoatNumberInput(data);
            }, 2000);
          }
        } else if (res.cancel) {
          // 点击返回，回到第一步
          this.showInputBoatNumber(data);
        }
      }
    });
  },

  /**
   * 发船（开始计时）
   */
  async startTrip(orderId, boatNumber) {
    try {
      wx.showLoading({ title: '发船中...' });

      const staffInfo = app.getStaffInfo();
      await cloud.startTrip(orderId, boatNumber, staffInfo?._id || staffInfo?.id);

      wx.hideLoading();
      util.playSuccessSound();

      wx.showToast({
        title: '✅ 发船成功',
        icon: 'success',
        duration: 2000
      });

      // 清空扫码结果
      this.setData({
        lastScanResult: null
      });
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('发船失败:', error);
    }
  },

  /**
   * 显示账单预览对话框
   */
  showBillPreview(data) {
    const content = `船号：${data.boatNumber}
开始时间：${util.formatTime(data.startTime)}
使用时长：${util.formatDuration(data.usedMinutes)}
${data.overtimeMinutes > 0 ? `\n⚠️ 已超时：${util.formatDuration(data.overtimeMinutes)}` : ''}
${data.overtimeFee > 0 ? `超时费用：¥${data.overtimeFee}` : ''}
━━━━━━━━━━━━━━━━━━
退款金额：¥${data.refundAmount}
最终费用：¥${data.finalAmount}`;

    wx.showModal({
      title: '收船 - 账单预览',
      content: content,
      confirmText: '确认收船',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          this.endTrip(data.orderId);
        }
      }
    });
  },

  /**
   * 收船（结束计时）
   */
  async endTrip(orderId) {
    try {
      wx.showLoading({ title: '结算中...' });

      const staffInfo = app.getStaffInfo();
      await cloud.endTrip(orderId, staffInfo?._id || staffInfo?.id);

      wx.hideLoading();
      util.playSuccessSound();

      wx.showToast({
        title: '✅ 收船成功',
        icon: 'success',
        duration: 2000
      });

      // 清空扫码结果
      this.setData({
        lastScanResult: null
      });
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('收船失败:', error);
    }
  },

  showProductVerify(data) {
    const deadlineStr = data.verificationDeadline
      ? `\n有效期至：${util.formatTime(data.verificationDeadline)}`
      : '';

    wx.showModal({
      title: '🎫 商品核销确认',
      content: `商品：${data.productName}\n数量：${data.quantity}\n金额：¥${Number(data.totalAmount).toFixed(2)}${deadlineStr}`,
      confirmText: '确认核销',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          this.doVerifyProduct(data.orderId);
        }
      }
    });
  },

  async doVerifyProduct(orderId) {
    try {
      wx.showLoading({ title: '核销中...' });
      const staffInfo = app.getStaffInfo();
      const res = await wx.cloud.callFunction({
        name: 'verifyProduct',
        data: { orderId, staffId: staffInfo?._id || staffInfo?.id }
      });
      wx.hideLoading();

      if (res.result.code === 200) {
        util.playSuccessSound();
        wx.showToast({ title: '✅ 核销成功', icon: 'success', duration: 2000 });
        this.setData({ lastScanResult: null });
      } else {
        util.playErrorSound();
        wx.showToast({ title: res.result.message || '核销失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('商品核销失败:', error);
      wx.showToast({ title: '核销失败', icon: 'none' });
    }
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.staffLogout();
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  /**
   * 跳转到船号查询
   */
  goToSearch() {
    wx.navigateTo({
      url: '/pages/staff/search/search'
    });
  },

  /**
   * 跳转到待处理订单
   */
  goToOrders() {
    wx.navigateTo({
      url: '/pages/staff/orders/orders'
    });
  }
});

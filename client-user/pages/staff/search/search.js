// pages/search/search.js
const cloud = require('../utils/cloud');
const util = require('../utils/util');
const app = getApp();

Page({
  data: {
    searchValue: '',
    searchResult: null,
    searching: false,
    formatTime: util.formatTime,
    formatDuration: util.formatDuration
  },

  /**
   * 搜索值改变
   */
  onSearchChange(e) {
    this.setData({
      searchValue: e.detail
    });
  },

  /**
   * 搜索船号
   */
  async onSearch() {
    const { searchValue } = this.data;

    if (!searchValue.trim()) {
      wx.showToast({
        title: '请输入船号',
        icon: 'none'
      });
      return;
    }

    const boatNumber = searchValue.trim().toUpperCase();

    try {
      this.setData({ searching: true, searchResult: null });

      const res = await cloud.findByBoatNumber(boatNumber);

      util.vibrateShort();

      this.setData({
        searchResult: res.data,
        searching: false
      });
    } catch (error) {
      this.setData({ searching: false });

      if (error.code === 404) {
        wx.showToast({
          title: '该船号当前无使用中的订单',
          icon: 'none',
          duration: 2000
        });
      } else {
        console.error('查询失败:', error);
      }
    }
  },

  /**
   * 清空搜索
   */
  onClear() {
    this.setData({
      searchValue: '',
      searchResult: null
    });
  },

  /**
   * 收船（结束计时）
   */
  handleEndTrip() {
    const { searchResult } = this.data;

    if (!searchResult) return;

    // 显示账单预览
    const content = `船号：${searchResult.boatNumber}
船型：${searchResult.boatTypeName}
游客：${searchResult.userNickname}
开始时间：${util.formatTime(searchResult.startTime)}
已用时长：${util.formatDuration(searchResult.usedMinutes)}

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

            await api.post('/verification/end', {
              orderId: searchResult.orderId
            });

            wx.hideLoading();
            util.playSuccessSound();

            wx.showToast({
              title: '✅ 收船成功',
              icon: 'success',
              duration: 2000
            });

            // 清空搜索结果
            this.setData({
              searchValue: '',
              searchResult: null
            });
          } catch (error) {
            wx.hideLoading();
            util.playErrorSound();
            console.error('收船失败:', error);
          }
        }
      }
    });
  }
});

// pages/recharge-logs/recharge-logs.js
Page({
  data: {
    logs: [],
    loading: false,
    page: 0,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadLogs()
  },

  // 加载余额变动记录
  async loadLogs(isRefresh = false) {
    if (this.data.loading) return

    if (isRefresh) {
      this.setData({
        page: 0,
        logs: [],
        hasMore: true
      })
    }

    if (!this.data.hasMore && !isRefresh) return

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getBalanceLogs',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })

      if (res.result.success) {
        const newLogs = res.result.logs || []
        this.setData({
          logs: isRefresh ? newLogs : [...this.data.logs, ...newLogs],
          page: this.data.page + 1,
          hasMore: res.result.hasMore
        })
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载充值记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadLogs(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadLogs()
  },

  // 格式化类型
  formatType(type) {
    const typeMap = {
      'recharge': '充值',
      'consume': '消费',
      'refund': '退款'
    }
    return typeMap[type] || type
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }
})

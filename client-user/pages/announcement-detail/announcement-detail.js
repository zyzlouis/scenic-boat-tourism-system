// pages/announcement-detail/announcement-detail.js
Page({
  data: {
    announcement: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadAnnouncement(id)
    }
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return ''

    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  /**
   * 加载公告详情
   */
  async loadAnnouncement(id) {
    try {
      this.setData({ loading: true })

      const res = await wx.cloud.database()
        .collection('announcements')
        .doc(id)
        .get()

      if (res.data) {
        // 格式化时间
        const announcement = res.data
        announcement.formattedTime = this.formatTime(announcement.createdAt)

        this.setData({
          announcement: announcement,
          loading: false
        })
      } else {
        wx.showToast({
          title: '公告不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载公告失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  }
})

// pages/share-test/share-test.js
Page({
  data: {
    boatCode: '',
    result: null,
    qrCodeImage: ''
  },

  onLoad() {
    // 默认测试一个船型code，您可以根据实际情况修改
    this.setData({ boatCode: 'three_boat' })
  },

  async testGenerateCode() {
    const { boatCode } = this.data

    if (!boatCode) {
      wx.showToast({ title: '请输入船型code', icon: 'none' })
      return
    }

    wx.showLoading({ title: '测试中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'generateShareCode',
        data: {
          type: 'boat',
          code: boatCode
        }
      })

      wx.hideLoading()
      console.log('云函数返回:', res.result)

      if (res.result.code === 200) {
        this.setData({
          result: JSON.stringify(res.result.data, null, 2),
          qrCodeImage: res.result.data.qrCodeImage
        })
        wx.showToast({ title: '成功', icon: 'success' })
      } else {
        wx.showToast({
          title: res.result.message || '失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('测试失败:', error)
      wx.showToast({ title: '调用失败', icon: 'none' })
    }
  },

  previewQrCode() {
    const { qrCodeImage } = this.data
    if (qrCodeImage) {
      wx.previewImage({
        urls: [qrCodeImage]
      })
    }
  }
})

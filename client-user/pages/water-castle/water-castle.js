const cloud = require('../../utils/cloud');

Page({
  data: {
    project: null,
    products: [],
    loading: true
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadData();
    }
  },

  async loadData() {
    try {
      this.setData({ loading: true });
      const res = await cloud.getProjects();
      const projects = res.data || [];
      const project = projects[0] || null;

      this.setData({
        project,
        products: project ? project.products || [] : [],
        loading: false
      });
    } catch (error) {
      console.error('加载项目数据失败:', error);
      this.setData({ loading: false });
    }
  },

  goToProductDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?productId=${id}`
    });
  },

  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: this.data.project ? this.data.project.name : '水上城堡',
      path: '/pages/water-castle/water-castle'
    };
  }
});

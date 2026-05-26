const cloud = require('../../utils/cloud');

Page({
  data: {
    product: null,
    quantity: 1,
    totalPrice: '0.00',
    loading: true
  },

  onLoad(options) {
    const { productId } = options;
    if (productId) {
      this.loadProduct(productId);
    }
  },

  async loadProduct(productId) {
    try {
      const res = await cloud.getProjects();
      const projects = res.data || [];
      for (const project of projects) {
        const product = (project.products || []).find(p => p._id === productId);
        if (product) {
          product.projectName = project.name;
          this.setData({
            product,
            loading: false,
            totalPrice: (product.price * this.data.quantity).toFixed(2)
          });
          return;
        }
      }
      this.setData({ loading: false });
      wx.showToast({ title: '商品不存在', icon: 'none' });
    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({ loading: false });
    }
  },

  onQuantityChange(e) {
    const quantity = e.detail;
    this.setData({
      quantity,
      totalPrice: (this.data.product.price * quantity).toFixed(2)
    });
  },

  async handleBuy() {
    const { product, quantity } = this.data;
    if (!product) return;

    try {
      wx.showLoading({ title: '创建订单中...' });
      const res = await cloud.createProductOrder(product._id, quantity);
      wx.hideLoading();

      if (res.code === 200) {
        wx.navigateTo({
          url: `/pages/payment/payment?orderId=${res.data.orderId}`
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建商品订单失败:', error);
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.product ? this.data.product.name : '景区商品',
      path: `/pages/product-detail/product-detail?productId=${this.data.product ? this.data.product._id : ''}`
    };
  }
});

const express = require('express');
const router = express.Router();

// 导入控制器
const boatController = require('../controllers/boatController');
const orderController = require('../controllers/orderController');
const verificationController = require('../controllers/verificationController');

// 导入中间件
const { authenticateUser, authenticateStaff } = require('../middlewares/auth');

// ==================== 公开接口 ====================
// 认证相关接口（TODO: 需要实现）
// router.post('/auth/user/login', authController.userLogin);
// router.post('/auth/staff/login', authController.staffLogin);

// ==================== 用户端接口 ====================
// 获取船型列表（公开接口，无需认证）
router.get('/boats/types', boatController.getBoatTypes);

// 订单相关（需要用户认证）
router.post('/order/create', authenticateUser, orderController.createOrder);
router.get('/order/:id', authenticateUser, orderController.getOrderDetail);
router.get('/order/list', authenticateUser, orderController.getOrderList);

// 支付相关（TODO: 需要实现）
// router.post('/payment/prepay', authenticateUser, paymentController.prepay);
// router.post('/payment/callback', paymentController.callback);

// ==================== 员工端接口 ====================
// 核销相关（需要员工认证）
router.post('/verification/scan', authenticateStaff, verificationController.scanCode);
router.post('/verification/start', authenticateStaff, verificationController.startTrip);
router.post('/verification/end', authenticateStaff, verificationController.endTrip);
router.get('/verification/boat/:boatNumber', authenticateStaff, verificationController.findByBoatNumber);

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: 'Server is running',
    timestamp: Date.now()
  });
});

module.exports = router;

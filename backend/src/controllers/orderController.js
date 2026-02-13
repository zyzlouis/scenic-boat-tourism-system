const orderService = require('../services/orderService');
const ResponseUtil = require('../utils/response');

class OrderController {
  /**
   * 创建订单
   */
  async createOrder(req, res, next) {
    try {
      const { boatTypeId } = req.body;
      const userId = req.user.id;

      if (!boatTypeId) {
        return ResponseUtil.badRequest(res, '船型ID不能为空');
      }

      const order = await orderService.createOrder(userId, boatTypeId);

      return ResponseUtil.success(res, {
        orderId: order.id,
        orderNo: order.order_no,
        boatTypeId: order.boat_type_id,
        boatTypeName: order.boatType.type_name,
        basePrice: order.base_price,
        depositAmount: order.deposit_amount,
        totalAmount: order.total_amount,
        includedMinutes: order.included_minutes,
        overtimeRate: order.overtime_rate,
        status: order.status,
        createdAt: order.created_at
      }, '订单创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(req, res, next) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      const order = await orderService.getOrderDetail(orderId, userId);

      return ResponseUtil.success(res, {
        orderId: order.id,
        orderNo: order.order_no,
        boatTypeId: order.boat_type_id,
        boatTypeName: order.boatType?.type_name,
        boatNumber: order.boat?.boat_number,
        basePrice: order.base_price,
        depositAmount: order.deposit_amount,
        totalAmount: order.total_amount,
        includedMinutes: order.included_minutes,
        overtimeRate: order.overtime_rate,
        verificationCode: order.verification_code,
        status: order.status,
        startTime: order.start_time,
        endTime: order.end_time,
        usedMinutes: order.dataValues.usedMinutes || order.used_minutes,
        overtimeMinutes: order.dataValues.overtimeMinutes || order.overtime_minutes,
        overtimeFee: order.dataValues.overtimeFee || order.overtime_fee,
        estimatedTotalFee: order.dataValues.estimatedTotalFee,
        refundAmount: order.refund_amount,
        finalAmount: order.final_amount,
        createdAt: order.created_at,
        completedAt: order.completed_at
      });
    } catch (error) {
      if (error.message === '订单不存在') {
        return ResponseUtil.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * 获取订单列表
   */
  async getOrderList(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 10, status } = req.query;

      const result = await orderService.getUserOrders(
        userId,
        parseInt(page),
        parseInt(pageSize),
        status
      );

      const list = result.list.map(order => ({
        orderId: order.id,
        orderNo: order.order_no,
        boatTypeName: order.boatType?.type_name,
        boatNumber: order.boat?.boat_number,
        status: order.status,
        totalAmount: order.total_amount,
        finalAmount: order.final_amount,
        refundAmount: order.refund_amount,
        createdAt: order.created_at,
        completedAt: order.completed_at
      }));

      return ResponseUtil.success(res, {
        list,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

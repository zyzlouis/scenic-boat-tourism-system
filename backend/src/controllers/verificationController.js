const db = require('../models');
const timingService = require('../services/timingService');
const ResponseUtil = require('../utils/response');

class VerificationController {
  /**
   * 扫码核销
   */
  async scanCode(req, res, next) {
    try {
      const { verificationCode } = req.body;
      const staffId = req.staff.id;

      if (!verificationCode) {
        return ResponseUtil.badRequest(res, '核销码不能为空');
      }

      // 查找订单
      const order = await db.Order.findOne({
        where: {
          verification_code: verificationCode,
          is_deleted: 0
        },
        include: [
          {
            model: db.BoatType,
            as: 'boatType'
          },
          {
            model: db.Boat,
            as: 'boat',
            required: false
          },
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'nickname']
          }
        ]
      });

      if (!order) {
        return ResponseUtil.businessError(res, '核销码无效', 10003);
      }

      // 判断是发船还是收船
      if (order.status === 'paid') {
        // 待发船
        return ResponseUtil.success(res, {
          orderId: order.id,
          orderNo: order.order_no,
          boatTypeName: order.boatType.type_name,
          action: 'start',
          userNickname: order.user.nickname,
          basePrice: order.base_price,
          depositAmount: order.deposit_amount,
          includedMinutes: order.included_minutes
        }, '扫码成功，请绑定船号');
      } else if (order.status === 'timing') {
        // 待收船
        const currentTime = await timingService.getCurrentTime(order.id);

        // 计算超时费用
        let overtimeMinutes = 0;
        let overtimeFee = 0;
        if (currentTime.usedMinutes > order.included_minutes) {
          overtimeMinutes = currentTime.usedMinutes - order.included_minutes;
          overtimeFee = overtimeMinutes * parseFloat(order.overtime_rate);
        }

        const refundAmount = parseFloat(order.deposit_amount) - overtimeFee;
        const finalAmount = parseFloat(order.base_price) + overtimeFee;

        return ResponseUtil.success(res, {
          orderId: order.id,
          orderNo: order.order_no,
          boatTypeName: order.boatType.type_name,
          boatNumber: order.boat.boat_number,
          action: 'end',
          startTime: order.start_time,
          usedMinutes: currentTime.usedMinutes,
          includedMinutes: order.included_minutes,
          overtimeMinutes,
          overtimeFee: overtimeFee.toFixed(2),
          refundAmount: refundAmount.toFixed(2),
          finalAmount: finalAmount.toFixed(2)
        }, '扫码成功，请确认结束');
      } else {
        return ResponseUtil.businessError(res, '订单状态不正确', 10002);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * 发船（开始计时）
   */
  async startTrip(req, res, next) {
    try {
      const { orderId, boatNumber } = req.body;
      const staffId = req.staff.id;

      if (!orderId || !boatNumber) {
        return ResponseUtil.badRequest(res, '订单ID和船号不能为空');
      }

      // 查找船只
      const boat = await db.Boat.findOne({
        where: { boat_number: boatNumber, is_active: 1, is_deleted: 0 }
      });

      if (!boat) {
        return ResponseUtil.businessError(res, '船只不存在', 30001);
      }

      if (boat.status !== 'idle') {
        return ResponseUtil.businessError(res, '船只正在使用中', 30002);
      }

      // 开始计时
      const order = await timingService.startTiming(orderId, boat.id);

      // 记录核销日志
      await db.VerificationLog.create({
        order_id: orderId,
        staff_id: staffId,
        boat_id: boat.id,
        action_type: 'start',
        scan_time: new Date()
      });

      return ResponseUtil.success(res, {
        orderId: order.id,
        boatNumber: boat.boat_number,
        startTime: order.start_time,
        status: order.status
      }, '发船成功，已开始计时');
    } catch (error) {
      if (error.message.includes('订单') || error.message.includes('船只')) {
        return ResponseUtil.businessError(res, error.message, 10002);
      }
      next(error);
    }
  }

  /**
   * 收船（结束计时）
   */
  async endTrip(req, res, next) {
    try {
      const { orderId } = req.body;
      const staffId = req.staff.id;

      if (!orderId) {
        return ResponseUtil.badRequest(res, '订单ID不能为空');
      }

      // 结束计时
      const result = await timingService.stopTiming(orderId);

      // 记录核销日志
      await db.VerificationLog.create({
        order_id: orderId,
        staff_id: staffId,
        boat_id: result.boatId,
        action_type: 'end',
        scan_time: new Date()
      });

      // 这里应该调用退款服务（TODO）
      // 暂时直接更新订单状态为已完成
      await db.Order.update(
        { status: 'completed', completed_at: new Date() },
        { where: { id: orderId } }
      );

      return ResponseUtil.success(res, result, '收船成功，已结算');
    } catch (error) {
      if (error.message.includes('订单')) {
        return ResponseUtil.businessError(res, error.message, 10002);
      }
      next(error);
    }
  }

  /**
   * 船号反查订单
   */
  async findByBoatNumber(req, res, next) {
    try {
      const { boatNumber } = req.params;

      const boat = await db.Boat.findOne({
        where: { boat_number: boatNumber }
      });

      if (!boat) {
        return ResponseUtil.notFound(res, '船号不存在');
      }

      const order = await db.Order.findOne({
        where: {
          boat_id: boat.id,
          status: 'timing'
        },
        include: [
          {
            model: db.BoatType,
            as: 'boatType'
          },
          {
            model: db.User,
            as: 'user',
            attributes: ['nickname']
          }
        ]
      });

      if (!order) {
        return ResponseUtil.notFound(res, '该船号当前无使用中的订单');
      }

      const currentTime = await timingService.getCurrentTime(order.id);

      return ResponseUtil.success(res, {
        orderId: order.id,
        orderNo: order.order_no,
        boatNumber: boat.boat_number,
        boatTypeName: order.boatType.type_name,
        userNickname: order.user.nickname,
        status: order.status,
        startTime: order.start_time,
        usedMinutes: currentTime.usedMinutes
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VerificationController();

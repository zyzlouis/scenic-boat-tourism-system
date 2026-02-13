const db = require('../models');
const moment = require('moment');

class TimingService {
  /**
   * 开始计时（发船）
   */
  async startTiming(orderId, boatId) {
    const order = await db.Order.findByPk(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'paid') {
      throw new Error('订单状态不正确，无法发船');
    }

    // 更新船只状态为使用中
    const boat = await db.Boat.findByPk(boatId);
    if (!boat || boat.status !== 'idle') {
      throw new Error('船只不可用');
    }

    // 开启事务
    const t = await db.sequelize.transaction();

    try {
      // 更新订单
      const startTime = new Date();
      await order.update({
        boat_id: boatId,
        status: 'timing',
        start_time: startTime
      }, { transaction: t });

      // 更新船只状态
      await boat.update({
        status: 'in_use',
        last_used_at: startTime
      }, { transaction: t });

      // 创建计时记录
      await db.TimingRecord.create({
        order_id: orderId,
        boat_id: boatId,
        start_time: startTime
      }, { transaction: t });

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * 结束计时（收船）
   */
  async stopTiming(orderId) {
    const order = await db.Order.findByPk(orderId, {
      include: [{ model: db.TimingRecord, as: 'timingRecord' }]
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'timing') {
      throw new Error('订单状态不正确，无法收船');
    }

    const endTime = new Date();
    const startTime = new Date(order.start_time);

    // 计算使用时长
    const usedSeconds = Math.floor((endTime - startTime) / 1000);
    const usedMinutes = Math.ceil(usedSeconds / 60);

    // 计算超时费用
    let overtimeMinutes = 0;
    let overtimeFee = 0;

    if (usedMinutes > order.included_minutes) {
      overtimeMinutes = usedMinutes - order.included_minutes;
      overtimeFee = overtimeMinutes * parseFloat(order.overtime_rate);
    }

    // 计算最终费用和退款金额
    const finalAmount = parseFloat(order.base_price) + overtimeFee;
    const refundAmount = parseFloat(order.deposit_amount) - overtimeFee;

    // 开启事务
    const t = await db.sequelize.transaction();

    try {
      // 更新订单
      await order.update({
        end_time: endTime,
        used_minutes: usedMinutes,
        overtime_minutes: overtimeMinutes,
        overtime_fee: overtimeFee,
        final_amount: finalAmount,
        refund_amount: refundAmount,
        status: 'ended'
      }, { transaction: t });

      // 更新计时记录
      await db.TimingRecord.update({
        end_time: endTime,
        used_seconds: usedSeconds,
        used_minutes: usedMinutes,
        overtime_minutes: overtimeMinutes,
        overtime_fee: overtimeFee
      }, {
        where: { order_id: orderId },
        transaction: t
      });

      // 更新船只状态为空闲
      await db.Boat.update({
        status: 'idle'
      }, {
        where: { id: order.boat_id },
        transaction: t
      });

      await t.commit();

      // 这里应该调用退款服务（异步）
      // await refundService.processRefund(orderId, refundAmount);

      return {
        orderId: order.id,
        boatNumber: order.boat?.boat_number,
        startTime: order.start_time,
        endTime: endTime,
        usedMinutes,
        overtimeMinutes,
        overtimeFee,
        refundAmount,
        finalAmount
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * 获取当前使用时长
   */
  async getCurrentTime(orderId) {
    const order = await db.Order.findByPk(orderId);
    if (!order || order.status !== 'timing') {
      throw new Error('订单未在计时中');
    }

    const now = moment();
    const startTime = moment(order.start_time);
    const usedSeconds = now.diff(startTime, 'seconds');
    const usedMinutes = Math.ceil(usedSeconds / 60);

    return {
      usedMinutes,
      startTime: order.start_time,
      includedMinutes: order.included_minutes,
      overtimeRate: order.overtime_rate
    };
  }
}

module.exports = new TimingService();

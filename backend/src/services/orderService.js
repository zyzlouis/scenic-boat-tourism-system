const db = require('../models');
const moment = require('moment');
const {
  generateOrderNo,
  generateVerificationCode
} = require('../utils/orderNo');

class OrderService {
  /**
   * 创建订单
   */
  async createOrder(userId, boatTypeId) {
    // 1. 获取价格配置
    const pricingConfig = await db.PricingConfig.findOne({
      where: {
        boat_type_id: boatTypeId,
        is_default: 1,
        is_active: 1,
        is_deleted: 0
      }
    });

    if (!pricingConfig) {
      throw new Error('价格配置不存在');
    }

    // 2. 计算订单总额（基础票价 + 押金）
    const totalAmount = parseFloat(pricingConfig.base_price) + parseFloat(pricingConfig.deposit_amount);

    // 3. 创建订单
    const order = await db.Order.create({
      order_no: generateOrderNo(),
      user_id: userId,
      boat_type_id: boatTypeId,
      pricing_config_id: pricingConfig.id,
      base_price: pricingConfig.base_price,
      deposit_amount: pricingConfig.deposit_amount,
      included_minutes: pricingConfig.included_minutes,
      overtime_rate: pricingConfig.overtime_rate,
      total_amount: totalAmount,
      status: 'pending'
    });

    // 4. 关联查询船型信息
    const orderWithType = await db.Order.findByPk(order.id, {
      include: [
        {
          model: db.BoatType,
          as: 'boatType',
          attributes: ['id', 'type_name', 'type_code']
        }
      ]
    });

    return orderWithType;
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId, userId = null) {
    const where = { id: orderId, is_deleted: 0 };
    if (userId) {
      where.user_id = userId;
    }

    const order = await db.Order.findOne({
      where,
      include: [
        {
          model: db.BoatType,
          as: 'boatType',
          attributes: ['id', 'type_name', 'type_code']
        },
        {
          model: db.Boat,
          as: 'boat',
          attributes: ['id', 'boat_number'],
          required: false
        },
        {
          model: db.TimingRecord,
          as: 'timingRecord',
          required: false
        }
      ]
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 如果订单正在计时中，计算实时数据
    if (order.status === 'timing' && order.start_time) {
      const now = moment();
      const startTime = moment(order.start_time);
      const usedSeconds = now.diff(startTime, 'seconds');
      const usedMinutes = Math.ceil(usedSeconds / 60);

      order.dataValues.usedMinutes = usedMinutes;

      // 计算超时费用
      if (usedMinutes > order.included_minutes) {
        const overtimeMinutes = usedMinutes - order.included_minutes;
        const overtimeFee = overtimeMinutes * parseFloat(order.overtime_rate);
        order.dataValues.overtimeMinutes = overtimeMinutes;
        order.dataValues.overtimeFee = overtimeFee.toFixed(2);
        order.dataValues.estimatedTotalFee = (parseFloat(order.base_price) + overtimeFee).toFixed(2);
      } else {
        order.dataValues.overtimeMinutes = 0;
        order.dataValues.overtimeFee = 0;
        order.dataValues.estimatedTotalFee = order.base_price;
      }
    }

    return order;
  }

  /**
   * 支付成功后更新订单
   */
  async paymentSuccess(orderId, transactionId) {
    const order = await db.Order.findByPk(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new Error('订单状态不正确');
    }

    // 生成核销码
    const verificationCode = generateVerificationCode();

    await order.update({
      status: 'paid',
      verification_code: verificationCode
    });

    return order;
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userId, page = 1, pageSize = 10, status = null) {
    const where = { user_id: userId, is_deleted: 0 };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await db.Order.findAndCountAll({
      where,
      include: [
        {
          model: db.BoatType,
          as: 'boatType',
          attributes: ['type_name']
        },
        {
          model: db.Boat,
          as: 'boat',
          attributes: ['boat_number'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    return {
      list: rows,
      total: count,
      page,
      pageSize
    };
  }
}

module.exports = new OrderService();

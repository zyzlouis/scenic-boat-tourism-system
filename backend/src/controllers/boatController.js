const db = require('../models');
const ResponseUtil = require('../utils/response');

class BoatController {
  /**
   * 获取船型列表（含价格）
   */
  async getBoatTypes(req, res, next) {
    try {
      const boatTypes = await db.BoatType.findAll({
        where: {
          is_active: 1,
          is_deleted: 0
        },
        order: [['sort_order', 'ASC']],
        include: [
          {
            model: db.PricingConfig,
            as: 'pricingConfigs',
            where: {
              is_default: 1,
              is_active: 1,
              is_deleted: 0
            },
            required: false
          }
        ]
      });

      // 格式化响应数据
      const formattedData = await Promise.all(boatTypes.map(async (type) => {
        const pricing = await db.PricingConfig.findOne({
          where: {
            boat_type_id: type.id,
            is_default: 1,
            is_active: 1,
            is_deleted: 0
          }
        });

        return {
          id: type.id,
          typeCode: type.type_code,
          typeName: type.type_name,
          description: type.description,
          maxCapacity: type.max_capacity,
          imageUrl: type.image_url,
          pricing: pricing ? {
            id: pricing.id,
            priceName: pricing.price_name,
            basePrice: pricing.base_price,
            depositAmount: pricing.deposit_amount,
            includedMinutes: pricing.included_minutes,
            overtimeRate: pricing.overtime_rate,
            capAmount: pricing.cap_amount
          } : null
        };
      }));

      return ResponseUtil.success(res, formattedData);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BoatController();

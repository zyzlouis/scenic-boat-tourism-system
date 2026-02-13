module.exports = (sequelize, DataTypes) => {
  const PricingConfig = sequelize.define('PricingConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    boat_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_name: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deposit_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    included_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    overtime_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cap_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    effective_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_default: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.TINYINT,
      defaultValue: 1
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    }
  }, {
    tableName: 'pricing_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return PricingConfig;
};

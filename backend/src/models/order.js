module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_no: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    boat_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    boat_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pricing_config_id: {
      type: DataTypes.INTEGER,
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
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    verification_code: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    used_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    overtime_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    overtime_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    final_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    remark: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return Order;
};

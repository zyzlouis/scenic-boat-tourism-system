module.exports = (sequelize, DataTypes) => {
  const Refund = sequelize.define('Refund', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    payment_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    refund_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    refund_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    refund_reason: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    callback_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remark: {
      type: DataTypes.STRING(512),
      allowNull: true
    }
  }, {
    tableName: 'refunds',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return Refund;
};

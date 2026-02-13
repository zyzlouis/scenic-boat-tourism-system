module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    payment_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    transaction_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'wechat'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    paid_at: {
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
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return Payment;
};

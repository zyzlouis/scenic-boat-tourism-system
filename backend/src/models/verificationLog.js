module.exports = (sequelize, DataTypes) => {
  const VerificationLog = sequelize.define('VerificationLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    boat_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    scan_time: {
      type: DataTypes.DATE,
      allowNull: false
    },
    remark: {
      type: DataTypes.STRING(512),
      allowNull: true
    }
  }, {
    tableName: 'verification_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });

  return VerificationLog;
};

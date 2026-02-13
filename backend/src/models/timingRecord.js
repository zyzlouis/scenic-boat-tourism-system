module.exports = (sequelize, DataTypes) => {
  const TimingRecord = sequelize.define('TimingRecord', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    boat_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    used_seconds: {
      type: DataTypes.INTEGER,
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
    is_abnormal: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    }
  }, {
    tableName: 'timing_records',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return TimingRecord;
};

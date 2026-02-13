module.exports = (sequelize, DataTypes) => {
  const BoatType = sequelize.define('BoatType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true
    },
    type_name: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    max_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
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
    tableName: 'boat_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return BoatType;
};

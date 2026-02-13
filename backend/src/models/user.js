module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    open_id: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true
    },
    union_id: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    nickname: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_vip: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return User;
};

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// 初始化Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    pool: dbConfig.pool,
    logging: dbConfig.logging
  }
);

// 测试连接
sequelize.authenticate()
  .then(() => {
    console.log('✅ 数据库连接成功');
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err);
  });

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 导入模型
db.User = require('./user')(sequelize, Sequelize);
db.BoatType = require('./boatType')(sequelize, Sequelize);
db.PricingConfig = require('./pricingConfig')(sequelize, Sequelize);
db.Boat = require('./boat')(sequelize, Sequelize);
db.Order = require('./order')(sequelize, Sequelize);
db.Payment = require('./payment')(sequelize, Sequelize);
db.Refund = require('./refund')(sequelize, Sequelize);
db.Staff = require('./staff')(sequelize, Sequelize);
db.VerificationLog = require('./verificationLog')(sequelize, Sequelize);
db.TimingRecord = require('./timingRecord')(sequelize, Sequelize);

// 定义关联关系
// User - Order (1:N)
db.User.hasMany(db.Order, { foreignKey: 'user_id', as: 'orders' });
db.Order.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// BoatType - Order (1:N)
db.BoatType.hasMany(db.Order, { foreignKey: 'boat_type_id', as: 'orders' });
db.Order.belongsTo(db.BoatType, { foreignKey: 'boat_type_id', as: 'boatType' });

// Boat - Order (1:N)
db.Boat.hasMany(db.Order, { foreignKey: 'boat_id', as: 'orders' });
db.Order.belongsTo(db.Boat, { foreignKey: 'boat_id', as: 'boat' });

// Order - Payment (1:N)
db.Order.hasMany(db.Payment, { foreignKey: 'order_id', as: 'payments' });
db.Payment.belongsTo(db.Order, { foreignKey: 'order_id', as: 'order' });

// Order - Refund (1:N)
db.Order.hasMany(db.Refund, { foreignKey: 'order_id', as: 'refunds' });
db.Refund.belongsTo(db.Order, { foreignKey: 'order_id', as: 'order' });

// Order - TimingRecord (1:1)
db.Order.hasOne(db.TimingRecord, { foreignKey: 'order_id', as: 'timingRecord' });
db.TimingRecord.belongsTo(db.Order, { foreignKey: 'order_id', as: 'order' });

module.exports = db;

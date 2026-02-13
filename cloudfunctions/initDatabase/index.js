// 云函数：一键初始化数据库（按照CMS规范）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const bcrypt = require('bcryptjs')

// ===== 测试数据 =====

// 1. 船型配置（3种）
const boatTypesData = [
  {
    _id: "boat_type_double",
    code: "DOUBLE",
    name: "双人船",
    description: "适合情侣、朋友2人乘坐",
    maxCapacity: 2,
    imageUrl: "cloud://your-env-id.xxx/boat-images/double.jpg",
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_type_four",
    code: "FOUR",
    name: "四人船",
    description: "适合家庭、小团队4人乘坐",
    maxCapacity: 4,
    imageUrl: "cloud://your-env-id.xxx/boat-images/four.jpg",
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_type_six",
    code: "SIX",
    name: "六人船",
    description: "适合大家庭、团队6人乘坐",
    maxCapacity: 6,
    imageUrl: "cloud://your-env-id.xxx/boat-images/six.jpg",
    sort: 3,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 2. 价格配置（3个）
const pricingConfigsData = [
  {
    _id: "pricing_double_weekday",
    boatTypeCode: "DOUBLE",
    name: "双人船-平日价",
    basePrice: 50,
    depositAmount: 100,
    includedMinutes: 60,
    overtimeRate: 1.0,
    capAmount: 200,
    effectiveDate: null,
    expiryDate: null,
    isDefault: true,
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "pricing_four_weekday",
    boatTypeCode: "FOUR",
    name: "四人船-平日价",
    basePrice: 80,
    depositAmount: 150,
    includedMinutes: 60,
    overtimeRate: 1.5,
    capAmount: 300,
    effectiveDate: null,
    expiryDate: null,
    isDefault: true,
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "pricing_six_weekday",
    boatTypeCode: "SIX",
    name: "六人船-平日价",
    basePrice: 120,
    depositAmount: 200,
    includedMinutes: 60,
    overtimeRate: 2.0,
    capAmount: 400,
    effectiveDate: null,
    expiryDate: null,
    isDefault: true,
    sort: 3,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 3. 船只数据（5艘）
const boatsData = [
  {
    _id: "boat_a001",
    boatNumber: "A001",
    boatTypeCode: "DOUBLE",
    status: "idle",
    lastUsedAt: null,
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_a002",
    boatNumber: "A002",
    boatTypeCode: "DOUBLE",
    status: "idle",
    lastUsedAt: null,
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_b001",
    boatNumber: "B001",
    boatTypeCode: "FOUR",
    status: "idle",
    lastUsedAt: null,
    sort: 11,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_b002",
    boatNumber: "B002",
    boatTypeCode: "FOUR",
    status: "idle",
    lastUsedAt: null,
    sort: 12,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "boat_c001",
    boatNumber: "C001",
    boatTypeCode: "SIX",
    status: "idle",
    lastUsedAt: null,
    sort: 21,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 4. 员工账号（3个，密码：admin123）
const staffData = [
  {
    _id: "staff_admin",
    username: "admin",
    password: "$2a$10$x6kDRz29p6LcSNcSzUCPIOm7ExpXJD76IMsBbDC34RxL7M5dcgqre",
    realName: "系统管理员",
    phone: "13800000000",
    role: "admin",
    lastLoginAt: null,
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "staff_001",
    username: "staff01",
    password: "$2a$10$x6kDRz29p6LcSNcSzUCPIOm7ExpXJD76IMsBbDC34RxL7M5dcgqre",
    realName: "张三",
    phone: "13800138001",
    role: "staff",
    lastLoginAt: null,
    sort: 10,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "staff_002",
    username: "staff02",
    password: "$2a$10$x6kDRz29p6LcSNcSzUCPIOm7ExpXJD76IMsBbDC34RxL7M5dcgqre",
    realName: "李四",
    phone: "13800138002",
    role: "staff",
    lastLoginAt: null,
    sort: 11,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 5. 轮播图（3个）
const bannersData = [
  {
    _id: "banner_001",
    title: "春节特惠活动",
    imageUrl: "cloud://boat-rental-xxx.png",
    linkType: "none",
    linkUrl: "",
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "banner_002",
    title: "会员储值享优惠",
    imageUrl: "cloud://boat-rental-xxx.png",
    linkType: "page",
    linkUrl: "/pages/recharge/recharge",
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "banner_003",
    title: "景区介绍",
    imageUrl: "cloud://boat-rental-xxx.png",
    linkType: "web",
    linkUrl: "https://example.com/about",
    sort: 3,
    enabled: false,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 6. 公告通知（3条）
const announcementsData = [
  {
    _id: "announcement_001",
    title: "今日因暴雨暂停运营",
    content: "尊敬的游客：\n\n由于今日天气恶劣，为确保游客安全，景区游船暂停运营。已购票的游客可申请全额退款。\n\n给您带来不便，敬请谅解。",
    type: "warning",
    showOnHome: true,
    startDate: new Date("2026-02-12T00:00:00.000Z"),
    endDate: new Date("2026-02-12T23:59:59.000Z"),
    sort: 1,
    enabled: false,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "announcement_002",
    title: "春节营业时间调整通知",
    content: "尊敬的游客：\n\n春节期间（2月15日-2月21日）营业时间调整为：\n上午8:00 - 晚上20:00\n\n祝大家新春快乐！",
    type: "info",
    showOnHome: false,
    startDate: new Date("2026-02-10T00:00:00.000Z"),
    endDate: new Date("2026-02-21T23:59:59.000Z"),
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "announcement_003",
    title: "紧急通知：XX号船维护中",
    content: "A001号船正在维护中，预计今日18:00恢复使用。请游客选择其他船只。",
    type: "urgent",
    showOnHome: true,
    startDate: new Date("2026-02-12T10:00:00.000Z"),
    endDate: new Date("2026-02-12T18:00:00.000Z"),
    sort: 0,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 7. 基础设置（1条）
const appSettingsData = [
  {
    _id: "global_settings",
    scenicName: "云湖景区",
    contactPhone: "0571-88888888",
    openTime: "08:00",
    closeTime: "18:00",
    refundRules: "1. 未核销的订单可全额退款；\n2. 已核销但未发船的订单可申请退款（扣除10%手续费）；\n3. 已发船的订单不支持退款，押金按实际使用情况结算；\n4. 退款将在3-7个工作日内原路返回。",
    safetyNotice: "安全须知：\n\n1. 请穿好救生衣，听从工作人员指挥；\n2. 禁止在船上站立、打闹；\n3. 禁止将身体探出船外；\n4. 儿童须由成人陪同；\n5. 雷雨天气禁止游玩；\n6. 醉酒者禁止游玩。",
    aboutUs: "云湖景区位于XX省XX市，湖面面积约500亩，湖水清澈，风景优美。景区提供多种游船服务，适合家庭出游、情侣约会、团队活动。\n\n营业时间：每日08:00-18:00\n地址：XX省XX市XX路123号\n客服电话：0571-88888888",
    logoUrl: "cloud://boat-rental-xxx.png",
    enabled: true,
    sort: 1,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// 8. 充值方案（6个）
const rechargePlansData = [
  {
    _id: "recharge_plan_50",
    name: "充50送10",
    amount: 50,
    giftAmount: 10,
    totalAmount: 60,
    tag: "",
    sort: 1,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "recharge_plan_100",
    name: "充100送20",
    amount: 100,
    giftAmount: 20,
    totalAmount: 120,
    tag: "热门",
    sort: 2,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "recharge_plan_200",
    name: "充200送50",
    amount: 200,
    giftAmount: 50,
    totalAmount: 250,
    tag: "超值",
    sort: 3,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "recharge_plan_500",
    name: "充500送150",
    amount: 500,
    giftAmount: 150,
    totalAmount: 650,
    tag: "",
    sort: 4,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "recharge_plan_1000",
    name: "充1000送350",
    amount: 1000,
    giftAmount: 350,
    totalAmount: 1350,
    tag: "",
    sort: 5,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  },
  {
    _id: "recharge_plan_2000",
    name: "充2000送800",
    amount: 2000,
    giftAmount: 800,
    totalAmount: 2800,
    tag: "",
    sort: 6,
    enabled: true,
    createdAt: new Date("2026-02-12T00:00:00.000Z"),
    updatedAt: new Date("2026-02-12T00:00:00.000Z")
  }
]

// ===== 初始化函数 =====

exports.main = async (event, context) => {
  const { action } = event

  try {
    if (action === 'init') {
      // 初始化所有集合和数据
      return await initAllCollections()
    } else if (action === 'clear') {
      // 清空所有集合（危险操作，仅用于测试）
      return await clearAllCollections()
    } else if (action === 'check') {
      // 检查数据库状态
      return await checkDatabase()
    } else {
      return {
        success: false,
        message: '无效的操作类型，支持：init（初始化）、clear（清空）、check（检查）'
      }
    }
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      message: '初始化失败',
      error: error.message
    }
  }
}

// 初始化所有集合
async function initAllCollections() {
  const results = {}

  console.log('开始初始化数据库...')

  // 1. 船型配置
  console.log('正在初始化 boatTypes...')
  results.boatTypes = await initCollection('boatTypes', boatTypesData)

  // 2. 价格配置
  console.log('正在初始化 pricingConfigs...')
  results.pricingConfigs = await initCollection('pricingConfigs', pricingConfigsData)

  // 3. 船只
  console.log('正在初始化 boats...')
  results.boats = await initCollection('boats', boatsData)

  // 4. 员工
  console.log('正在初始化 staff...')
  results.staff = await initCollection('staff', staffData)

  // 5. 轮播图
  console.log('正在初始化 banners...')
  results.banners = await initCollection('banners', bannersData)

  // 6. 公告
  console.log('正在初始化 announcements...')
  results.announcements = await initCollection('announcements', announcementsData)

  // 7. 基础设置
  console.log('正在初始化 app_settings...')
  results.app_settings = await initCollection('app_settings', appSettingsData)

  // 8. 充值方案
  console.log('正在初始化 recharge_plans...')
  results.recharge_plans = await initCollection('recharge_plans', rechargePlansData)

  // 9. 创建运行时集合（users、orders等）
  console.log('正在创建运行时集合...')
  results.runtimeCollections = await createRuntimeCollections()

  console.log('数据库初始化完成！')

  return {
    success: true,
    message: '数据库初始化成功',
    results: results
  }
}

// 初始化单个集合
async function initCollection(collectionName, data) {
  try {
    // 尝试创建集合（如果已存在会自动忽略）
    try {
      await db.createCollection(collectionName)
      console.log(`集合 ${collectionName} 创建成功`)
    } catch (createError) {
      // 集合已存在或创建失败，继续执行
      console.log(`集合 ${collectionName} 可能已存在:`, createError.errMsg)
    }

    // 检查集合是否已有数据
    const { total } = await db.collection(collectionName).count()

    if (total > 0) {
      return {
        status: 'skipped',
        message: `集合 ${collectionName} 已存在 ${total} 条数据，跳过初始化`,
        count: total
      }
    }

    // 批量插入数据
    const tasks = data.map(item =>
      db.collection(collectionName).add({ data: item })
    )
    await Promise.all(tasks)

    return {
      status: 'success',
      message: `集合 ${collectionName} 初始化成功`,
      count: data.length
    }
  } catch (error) {
    return {
      status: 'error',
      message: `集合 ${collectionName} 初始化失败: ${error.message}`,
      count: 0
    }
  }
}

// 清空所有集合（危险操作）
async function clearAllCollections() {
  const collections = ['boatTypes', 'pricingConfigs', 'boats', 'staff', 'banners', 'announcements', 'app_settings', 'recharge_plans']
  const results = {}

  for (const collectionName of collections) {
    try {
      const { data } = await db.collection(collectionName).get()
      const tasks = data.map(item =>
        db.collection(collectionName).doc(item._id).remove()
      )
      await Promise.all(tasks)

      results[collectionName] = {
        status: 'success',
        message: `已清空 ${data.length} 条记录`
      }
    } catch (error) {
      results[collectionName] = {
        status: 'error',
        message: error.message
      }
    }
  }

  return {
    success: true,
    message: '清空操作完成',
    results: results
  }
}

// 检查数据库状态
async function checkDatabase() {
  const collections = ['boatTypes', 'pricingConfigs', 'boats', 'staff', 'banners', 'announcements', 'app_settings', 'recharge_plans']
  const results = {}

  for (const collectionName of collections) {
    try {
      const { total } = await db.collection(collectionName).count()
      const { data: enabledData } = await db.collection(collectionName).where({ enabled: true }).count()

      results[collectionName] = {
        status: 'ok',
        total: total,
        enabled: enabledData
      }
    } catch (error) {
      results[collectionName] = {
        status: 'error',
        message: error.message
      }
    }
  }

  return {
    success: true,
    message: '数据库检查完成',
    results: results
  }
}

// 创建运行时集合（确保集合存在，即使是空的）
async function createRuntimeCollections() {
  const runtimeCollections = ['users', 'orders', 'recharge_orders', 'balance_logs', 'verificationLogs']
  const results = {}

  for (const collectionName of runtimeCollections) {
    try {
      // 方法1：尝试使用 createCollection API（可能不支持）
      try {
        await db.createCollection(collectionName)
        results[collectionName] = {
          status: 'created',
          message: `集合 ${collectionName} 创建成功`
        }
        continue
      } catch (createError) {
        // createCollection 失败，尝试方法2
        console.log(`createCollection ${collectionName} 失败:`, createError.errMsg)
      }

      // 方法2：通过查询判断集合是否已存在
      try {
        await db.collection(collectionName).limit(1).get()
        results[collectionName] = {
          status: 'exists',
          message: `集合 ${collectionName} 已存在`
        }
      } catch (error) {
        // 集合不存在
        results[collectionName] = {
          status: 'pending',
          message: `集合 ${collectionName} 不存在，将在首次使用时自动创建`
        }
      }
    } catch (error) {
      results[collectionName] = {
        status: 'error',
        message: error.message
      }
    }
  }

  return results
}

# 测试数据说明

## 文件列表

### 核心业务集合
- `boatTypes.json` - 船型配置数据（3种船型）
- `pricingConfigs.json` - 价格配置数据（3个价格方案）
- `boats.json` - 船只数据（5艘船）
- `staff.json` - 员工账号数据（3个账号）

### 运营内容集合（新增）
- `banners.json` - 轮播图数据（3个轮播图）
- `announcements.json` - 公告通知数据（3条公告）
- `app_settings.json` - 基础设置数据（1条记录）

## 数据导入方法

### 方法1：通过微信开发者工具导入（推荐）

1. 打开微信开发者工具
2. 点击【云开发】→【数据库】
3. 选择对应的集合（如 `boatTypes`）
4. 点击【导入】按钮
5. 选择对应的JSON文件（如 `boatTypes.json`）
6. 导入模式选择：**插入**（如果是空集合）或 **更新/插入**（如果已有数据）
7. 点击【确定】开始导入

**重复以上步骤，依次导入所有文件。**

### 方法2：通过云函数批量导入

创建一个临时云函数 `importTestData`：

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { collection, data } = event

  try {
    const tasks = data.map(item =>
      db.collection(collection).add({ data: item })
    )
    await Promise.all(tasks)

    return {
      success: true,
      count: data.length,
      message: `成功导入 ${data.length} 条记录到 ${collection}`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

在小程序或测试脚本中调用：

```javascript
const boatTypesData = require('./test-data/boatTypes.json')

wx.cloud.callFunction({
  name: 'importTestData',
  data: {
    collection: 'boatTypes',
    data: boatTypesData
  }
})
```

## 数据说明

### boatTypes - 船型配置

- **3种船型**：双人游艇、四人画舫、六人龙舟
- 所有船型 `enabled: true`
- 按 `sort` 字段排序

### pricingConfigs - 价格配置

- **3个默认价格**：对应3种船型的平日价
- **1个周末价**：双人游艇周末价（`enabled: false`，需要时手动启用）
- `isDefault: true` 的配置会被优先使用

### boats - 船只数据

- **5艘双人游艇**：E-001 ~ E-005
- **3艘四人画舫**：F-001 ~ F-003
- **3艘六人龙舟**：S-001 ~ S-003
- S-003 状态为 `maintenance`（维护中），`enabled: false`

### staff - 员工账号

**默认密码**：所有账号密码都是 `123456`

| 用户名 | 密码 | 角色 | 真实姓名 | 状态 |
|--------|------|------|---------|------|
| admin | 123456 | admin | 系统管理员 | 启用 |
| staff01 | 123456 | staff | 张三 | 启用 |
| staff02 | 123456 | staff | 李四 | 启用 |

**注意**：密码字段存储的是 bcrypt 加密后的哈希值。

### banners - 轮播图（新增）

- **3个轮播图**：春节活动、会员储值、景区介绍
- 第3个 `enabled: false`（禁用状态）
- `linkType` 枚举：none（无跳转）、page（小程序页面）、web（外部网页）

### announcements - 公告通知（新增）

- **3条公告**：暴雨停运、春节营业时间、紧急通知
- `type` 枚举：info（普通）、warning（警告）、urgent（紧急）
- `showOnHome` 控制是否在首页弹窗显示
- 公告有生效时间范围（startDate/endDate）

### app_settings - 基础设置（新增）

- **只有1条记录**：`_id` 固定为 `global_settings`
- 包含景区名称、联系方式、营业时间、规则说明等
- 运营人员可在 CMS 中直接编辑

## 字段说明

所有集合都包含以下通用字段：

- `sort` - Number类型，用于排序
- `enabled` - Boolean类型，是否启用（软删除）
- `createdAt` - Date类型，创建时间
- `updatedAt` - Date类型，更新时间

## 数据验证

导入后请验证：

```javascript
// 验证船型数量
db.collection('boatTypes').where({ enabled: true }).count()
// 预期：3

// 验证价格配置数量
db.collection('pricingConfigs').where({ enabled: true }).count()
// 预期：3

// 验证可用船只数量
db.collection('boats').where({ enabled: true }).count()
// 预期：5

// 验证可用员工数量
db.collection('staff').where({ enabled: true }).count()
// 预期：3

// 验证轮播图数量
db.collection('banners').where({ enabled: true }).count()
// 预期：2

// 验证公告数量
db.collection('announcements').where({ enabled: true }).count()
// 预期：2
```

## 清空数据（谨慎操作）

如果需要重新导入，先清空集合：

```javascript
// 清空集合（保留集合结构）
db.collection('boatTypes').where({ _id: db.command.exists(true) }).remove()
```

或在微信开发者工具中：
1. 数据库 → 选择集合 → 【更多】→【清空集合】

---

**最后更新**：2026-02-12

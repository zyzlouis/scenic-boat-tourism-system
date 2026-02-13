# 景区游船系统 - CMS友好数据库设计文档

## 设计约束（必须遵守）

1. 一个集合只存一种事物，集合内所有记录的字段结构必须完全一致
2. 禁止在一个集合里通过不同 _id 存放结构完全不同的配置
3. 禁止使用嵌套数组存放列表数据，应该拆分为独立集合
4. **字段保持扁平，不使用嵌套对象，所有字段都在文档的第一层**
5. 每个集合都要有 `sort`、`enabled`、`createdAt`、`updatedAt` 这四个通用字段
6. 图片类数据不要用数组存在一条记录里，每张图应该是一条独立记录
7. CMS支持的字段类型：单行字符串、多行字符串、数字、布尔值、枚举、图片、文件、富文本、日期

---

## 集合设计

### 1. boatTypes（船型配置）

**说明**：船型基础信息，运营人员通过CMS管理

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| code | String | 是 | 船型编码（如：double_boat） | 单行字符串 |
| name | String | 是 | 船型名称（如：双人游艇） | 单行字符串 |
| description | String | 否 | 船型描述 | 多行字符串 |
| maxCapacity | Number | 是 | 最大载客量 | 数字 |
| imageUrl | String | 否 | 船型图片URL | 图片 |
| sort | Number | 是 | 排序（数字越小越靠前） | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**初始数据示例**：
```json
{
  "_id": "boat_type_1",
  "code": "double_boat",
  "name": "双人游艇",
  "description": "适合情侣、朋友，配备电动马达",
  "maxCapacity": 2,
  "imageUrl": "cloud://xxx.png",
  "sort": 1,
  "enabled": true,
  "createdAt": "2026-02-12T00:00:00.000Z",
  "updatedAt": "2026-02-12T00:00:00.000Z"
}
```

---

### 2. pricingConfigs（价格配置）

**说明**：船型价格配置，支持按日期设置不同价格

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| boatTypeCode | String | 是 | 关联船型code | 单行字符串 |
| name | String | 是 | 价格方案名称（如：双人船-平日价） | 单行字符串 |
| basePrice | Number | 是 | 基础票价（元） | 数字 |
| depositAmount | Number | 是 | 押金金额（元） | 数字 |
| includedMinutes | Number | 是 | 包含时长（分钟） | 数字 |
| overtimeRate | Number | 是 | 超时费率（元/分钟） | 数字 |
| capAmount | Number | 否 | 封顶金额（元，null表示不封顶） | 数字 |
| effectiveDate | Date | 否 | 生效日期（null表示立即生效） | 日期 |
| expiryDate | Date | 否 | 失效日期（null表示长期有效） | 日期 |
| isDefault | Boolean | 是 | 是否默认价格 | 布尔值 |
| sort | Number | 是 | 排序 | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**初始数据示例**：
```json
{
  "_id": "pricing_1",
  "boatTypeCode": "double_boat",
  "name": "双人游艇-平日价",
  "basePrice": 50,
  "depositAmount": 100,
  "includedMinutes": 60,
  "overtimeRate": 1,
  "capAmount": 200,
  "effectiveDate": null,
  "expiryDate": null,
  "isDefault": true,
  "sort": 1,
  "enabled": true,
  "createdAt": "2026-02-12T00:00:00.000Z",
  "updatedAt": "2026-02-12T00:00:00.000Z"
}
```

---

### 3. boats（船只管理）

**说明**：实体船只信息，每艘船一条记录

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| boatNumber | String | 是 | 船号（如：E-001） | 单行字符串 |
| boatTypeCode | String | 是 | 关联船型code | 单行字符串 |
| status | String | 是 | 状态：idle/in_use/maintenance | 枚举 |
| lastUsedAt | Date | 否 | 最后使用时间 | 日期 |
| sort | Number | 是 | 排序 | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**status 枚举值**：
- `idle` - 空闲
- `in_use` - 使用中
- `maintenance` - 维护中

**初始数据示例**：
```json
{
  "_id": "boat_1",
  "boatNumber": "E-001",
  "boatTypeCode": "double_boat",
  "status": "idle",
  "lastUsedAt": null,
  "sort": 1,
  "enabled": true,
  "createdAt": "2026-02-12T00:00:00.000Z",
  "updatedAt": "2026-02-12T00:00:00.000Z"
}
```

---

### 4. orders（订单表）⚠️ 核心，已扁平化

**说明**：租船订单，所有字段扁平化，无嵌套对象

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| _openid | String | 是 | 用户openid（自动） | - |
| orderNo | String | 是 | 订单号 | 单行字符串 |
| userId | String | 是 | 用户openid | 单行字符串 |
| userNickname | String | 否 | 用户昵称（冗余，便于CMS查看） | 单行字符串 |
| | | | **船型信息（冗余字段）** | |
| boatTypeId | String | 是 | 船型ID | 单行字符串 |
| boatTypeCode | String | 是 | 船型编码 | 单行字符串 |
| boatTypeName | String | 是 | 船型名称 | 单行字符串 |
| | | | **船只信息** | |
| boatId | String | 否 | 船只ID（发船后绑定） | 单行字符串 |
| boatNumber | String | 否 | 船号（发船后绑定） | 单行字符串 |
| | | | **价格信息（快照）** | |
| pricingId | String | 是 | 价格配置ID | 单行字符串 |
| basePrice | Number | 是 | 基础票价 | 数字 |
| depositAmount | Number | 是 | 押金金额 | 数字 |
| includedMinutes | Number | 是 | 包含时长 | 数字 |
| overtimeRate | Number | 是 | 超时费率 | 数字 |
| capAmount | Number | 否 | 封顶金额 | 数字 |
| totalAmount | Number | 是 | 订单总额（基础+押金） | 数字 |
| | | | **核销信息** | |
| verificationCode | String | 否 | 核销码（支付后生成） | 单行字符串 |
| | | | **订单状态** | |
| status | String | 是 | 订单状态枚举 | 枚举 |
| | | | **计时信息** | |
| startTime | Date | 否 | 开始计时时间 | 日期 |
| endTime | Date | 否 | 结束计时时间 | 日期 |
| usedSeconds | Number | 否 | 实际使用秒数 | 数字 |
| usedMinutes | Number | 否 | 实际使用分钟数 | 数字 |
| overtimeMinutes | Number | 否 | 超时分钟数 | 数字 |
| overtimeFee | Number | 否 | 超时费用 | 数字 |
| isAbnormal | Boolean | 是 | 是否异常（超48小时） | 布尔值 |
| | | | **结算信息** | |
| finalAmount | Number | 否 | 最终支付金额 | 数字 |
| refundAmount | Number | 否 | 退款金额 | 数字 |
| refundedAt | Date | 否 | 退款时间 | 日期 |
| | | | **支付信息** | |
| transactionId | String | 否 | 微信支付交易号 | 单行字符串 |
| paidAt | Date | 否 | 支付时间 | 日期 |
| paymentMethod | String | 是 | 支付方式（wechat） | 单行字符串 |
| | | | **其他** | |
| remark | String | 否 | 备注 | 多行字符串 |
| completedAt | Date | 否 | 完成时间 | 日期 |
| sort | Number | 是 | 排序（创建时间戳） | 数字 |
| enabled | Boolean | 是 | 是否启用（软删除用） | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**status 枚举值**：
- `pending` - 待支付
- `paid` - 已支付，待核销
- `verified` - 已核销，待发船（可选状态）
- `timing` - 计时中
- `ended` - 已结束，待结算
- `completed` - 已完成
- `cancelled` - 已取消
- `timeout` - 超时异常

**示例数据**：
```json
{
  "_id": "order_1",
  "_openid": "oXXXX",
  "orderNo": "ORD20260212120000123456",
  "userId": "oXXXX",
  "userNickname": "张三",

  "boatTypeId": "boat_type_1",
  "boatTypeCode": "double_boat",
  "boatTypeName": "双人游艇",

  "boatId": null,
  "boatNumber": null,

  "pricingId": "pricing_1",
  "basePrice": 50,
  "depositAmount": 100,
  "includedMinutes": 60,
  "overtimeRate": 1,
  "capAmount": 200,
  "totalAmount": 150,

  "verificationCode": null,

  "status": "pending",

  "startTime": null,
  "endTime": null,
  "usedSeconds": 0,
  "usedMinutes": 0,
  "overtimeMinutes": 0,
  "overtimeFee": 0,
  "isAbnormal": false,

  "finalAmount": null,
  "refundAmount": null,
  "refundedAt": null,

  "transactionId": null,
  "paidAt": null,
  "paymentMethod": "wechat",

  "remark": "",
  "completedAt": null,

  "sort": 1707724800000,
  "enabled": true,
  "createdAt": "2026-02-12T12:00:00.000Z",
  "updatedAt": "2026-02-12T12:00:00.000Z"
}
```

---

### 5. staff（员工表）

**说明**：员工账号信息

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| username | String | 是 | 用户名（登录账号） | 单行字符串 |
| password | String | 是 | 密码（bcrypt加密） | 单行字符串 |
| realName | String | 是 | 真实姓名 | 单行字符串 |
| phone | String | 否 | 手机号 | 单行字符串 |
| role | String | 是 | 角色：staff/admin | 枚举 |
| lastLoginAt | Date | 否 | 最后登录时间 | 日期 |
| sort | Number | 是 | 排序 | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**role 枚举值**：
- `staff` - 普通员工
- `admin` - 管理员

**初始数据示例**：
```json
{
  "_id": "staff_1",
  "username": "admin",
  "password": "$2b$10$...",
  "realName": "系统管理员",
  "phone": "13800138000",
  "role": "admin",
  "lastLoginAt": null,
  "sort": 1,
  "enabled": true,
  "createdAt": "2026-02-12T00:00:00.000Z",
  "updatedAt": "2026-02-12T00:00:00.000Z"
}
```

---

### 6. verificationLogs（核销记录）

**说明**：记录所有扫码核销操作

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| orderId | String | 是 | 订单ID | 单行字符串 |
| orderNo | String | 是 | 订单号（冗余） | 单行字符串 |
| staffId | String | 是 | 员工ID | 单行字符串 |
| staffName | String | 是 | 员工姓名（冗余） | 单行字符串 |
| boatId | String | 否 | 船只ID | 单行字符串 |
| boatNumber | String | 否 | 船号 | 单行字符串 |
| actionType | String | 是 | 操作类型：start/end | 枚举 |
| scanTime | Date | 是 | 扫码时间 | 日期 |
| remark | String | 否 | 备注 | 多行字符串 |
| sort | Number | 是 | 排序（扫码时间戳） | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

**actionType 枚举值**：
- `start` - 发船
- `end` - 收船

---

### 7. users（用户表）

**说明**：微信小程序用户信息

| 字段名 | 类型 | 必填 | 说明 | CMS类型 |
|--------|------|------|------|---------|
| _id | String | 是 | 自动生成 | - |
| _openid | String | 是 | 微信openid（自动） | - |
| openid | String | 是 | 微信openid | 单行字符串 |
| unionid | String | 否 | 微信unionid | 单行字符串 |
| nickname | String | 否 | 微信昵称 | 单行字符串 |
| avatarUrl | String | 否 | 微信头像URL | 图片 |
| phone | String | 否 | 手机号 | 单行字符串 |
| isVip | Boolean | 是 | 是否VIP会员 | 布尔值 |
| sort | Number | 是 | 排序 | 数字 |
| enabled | Boolean | 是 | 是否启用 | 布尔值 |
| createdAt | Date | 是 | 创建时间 | 日期 |
| updatedAt | Date | 是 | 更新时间 | 日期 |

---

## 字段命名规范

1. **统一使用驼峰命名**（适配JavaScript/小程序）
   - ✅ `boatTypeCode`
   - ❌ `boat_type_code`

2. **通用字段**：
   - `sort` - Number类型，用于排序
   - `enabled` - Boolean类型，是否启用（软删除）
   - `createdAt` - Date类型，创建时间
   - `updatedAt` - Date类型，更新时间

3. **关联字段**：
   - 使用 `xxxId` 存储关联ID
   - 冗余常用字段（如 `xxxName`）便于CMS直接显示

---

## 数据冗余策略

为了CMS友好和查询性能，部分字段冗余存储：

1. **orders 集合冗余**：
   - `boatTypeName` - 便于CMS直接显示船型名称
   - `boatNumber` - 便于CMS显示船号
   - `userNickname` - 便于CMS显示用户昵称

2. **verificationLogs 集合冗余**：
   - `orderNo` - 便于CMS显示订单号
   - `staffName` - 便于CMS显示员工姓名
   - `boatNumber` - 便于CMS显示船号

**原则**：冗余字段仅用于显示，不用于业务逻辑判断

---

## 迁移清单

### 需要修改的云函数

1. `createOrder` - 扁平化订单字段
2. `scanCode` - 访问扁平字段
3. `startTrip` - 更新扁平字段
4. `endTrip` - 更新扁平字段
5. `getOrderDetail` - 返回扁平字段
6. `getOrderList` - 返回扁平字段
7. `findByBoatNumber` - 查询扁平字段
8. `getPendingOrders` - 查询扁平字段

### 需要修改的小程序页面

1. **用户端**：
   - `pages/order-detail/order-detail.js` - 访问扁平字段
   - `pages/order-list/order-list.js` - 访问扁平字段

2. **员工端**：
   - `pages/scan/scan.js` - 访问扁平字段
   - `pages/orders/orders.js` - 访问扁平字段
   - `pages/search/search.js` - 访问扁平字段

---

## 测试数据初始化

参见 `test-data/` 目录下的JSON文件：
- `boatTypes.json`
- `pricingConfigs.json`
- `boats.json`
- `staff.json`

---

**文档版本**：V2.0 - CMS友好版本
**创建时间**：2026-02-12
**最后更新**：2026-02-12

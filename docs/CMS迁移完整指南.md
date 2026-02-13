# CMS迁移完整指南

## 迁移进度

### ✅ 已完成
1. **数据库设计文档** - CMS友好的扁平化结构设计完成
2. **测试数据准备** - 所有集合的测试数据已更新并添加CMS通用字段
3. **核心云函数修改完成**：
   - ✅ createOrder - 创建订单（扁平化结构）
   - ✅ scanCode - 扫码核销（访问扁平字段）
   - ✅ startTrip - 发船（更新扁平字段）
   - ✅ endTrip - 收船（更新扁平字段）

### ⏳ 剩余工作
4. **查询类云函数需要修改**（较简单，仅需修改字段访问）：
   - get OrderDetail
   - getOrderList
   - findByBoatNumber
   - getPendingOrders
   - getBoatTypes
   - mockPayment
5. **小程序页面修改**（前端字段访问改为扁平）
6. **CMS配置**（通过Web控制台完成）
7. **测试和数据迁移**

---

## 查询类云函数修改模式

### 通用修改规则

所有查询类云函数只需要修改返回数据的字段访问方式，按照以下对照表修改：

#### orders 集合字段对照表

| 旧字段（嵌套） | 新字段（扁平） |
|---------------|---------------|
| `boatType.id` | `boatTypeId` |
| `boatType.code` | `boatTypeCode` |
| `boatType.name` | `boatTypeName` |
| `boat.id` | `boatId` |
| `boat.number` | `boatNumber` |
| `pricing.id` | `pricingId` |
| `pricing.basePrice` | `basePrice` |
| `pricing.depositAmount` | `depositAmount` |
| `pricing.includedMinutes` | `includedMinutes` |
| `pricing.overtimeRate` | `overtimeRate` |
| `pricing.capAmount` | `capAmount` |
| `timing.startTime` | `startTime` |
| `timing.endTime` | `endTime` |
| `timing.usedSeconds` | `usedSeconds` |
| `timing.usedMinutes` | `usedMinutes` |
| `timing.overtimeMinutes` | `overtimeMinutes` |
| `timing.overtimeFee` | `overtimeFee` |
| `timing.isAbnormal` | `isAbnormal` |
| `settlement.finalAmount` | `finalAmount` |
| `settlement.refundAmount` | `refundAmount` |
| `settlement.refundedAt` | `refundedAt` |
| `payment.transactionId` | `transactionId` |
| `payment.paidAt` | `paidAt` |
| `payment.method` | `paymentMethod` |
| `isDeleted` | `enabled` (取反) |

#### boatTypes 集合字段对照表

| 旧字段 | 新字段 |
|-------|-------|
| `capacity` | `maxCapacity` |
| `isActive` | `enabled` |
| `isDeleted` | (删除，用enabled) |
| `sortOrder` | `sort` |

#### boats 集合字段对照表

| 旧字段 | 新字段 |
|-------|-------|
| `isActive` | `enabled` |
| `isDeleted` | (删除，用enabled) |
| (新增) | `sort` |
| (新增) | `lastUsedAt` |

#### pricingConfigs 集合字段对照表

| 旧字段 | 新字段 |
|-------|-------|
| `isActive` | `enabled` |
| `description` | (删除，改用name字段) |
| (新增) | `name` |
| (新增) | `isDefault` |
| (新增) | `capAmount` |
| (新增) | `expiryDate` |
| (新增) | `sort` |

#### staff 集合字段对照表

| 旧字段 | 新字段 |
|-------|-------|
| `name` | `realName` |
| `staffNo` | (删除，使用_id) |
| (新增) | `username` (登录用) |
| `isActive` | `enabled` |
| `isDeleted` | (删除，用enabled) |
| (新增) | `lastLoginAt` |
| (新增) | `sort` |

---

## 快速修改云函数示例

### getOrderDetail 修改示例

**修改前**：
```javascript
return {
  orderId: order._id,
  orderNo: order.orderNo,
  boatTypeName: order.boatType.name,  // ❌ 嵌套访问
  basePrice: order.pricing.basePrice,  // ❌ 嵌套访问
  startTime: order.timing.startTime,  // ❌ 嵌套访问
  boatNumber: order.boat.number  // ❌ 嵌套访问
}
```

**修改后**：
```javascript
return {
  orderId: order._id,
  orderNo: order.orderNo,
  boatTypeName: order.boatTypeName,  // ✅ 扁平访问
  basePrice: order.basePrice,  // ✅ 扁平访问
  startTime: order.startTime,  // ✅ 扁平访问
  boatNumber: order.boatNumber  // ✅ 扁平访问
}
```

### 查询条件修改示例

**修改前**：
```javascript
await db.collection('boatTypes').where({
  isActive: true,  // ❌ 旧字段
  isDeleted: false  // ❌ 旧字段
})
```

**修改后**：
```javascript
await db.collection('boatTypes').where({
  enabled: true  // ✅ CMS规范字段
})
```

---

## 小程序页面修改

### 用户端修改点

#### pages/order-detail/order-detail.js

**修改内容**：
1. 访问订单数据时使用扁平字段
2. 显示船型名称、价格、计时信息时使用新字段

**示例修改**：
```javascript
// 修改前
this.setData({
  boatTypeName: order.boatType.name,
  basePrice: order.pricing.basePrice,
  usedMinutes: order.timing.usedMinutes
})

// 修改后
this.setData({
  boatTypeName: order.boatTypeName,
  basePrice: order.basePrice,
  usedMinutes: order.usedMinutes
})
```

#### pages/order-list/order-list.js

类似修改，将列表中的嵌套字段访问改为扁平访问。

### 员工端修改点

#### pages/scan/scan.js
#### pages/orders/orders.js
#### pages/search/search.js

所有页面的修改方式相同：将 `order.xxx.yyy` 改为 `order.yyy`

---

## 数据迁移方案

### 方案A：清空重导（推荐 - 如果是测试阶段）

```javascript
// 1. 清空所有集合
db.collection('orders').where({ _id: db.command.exists(true) }).remove()
db.collection('boatTypes').where({ _id: db.command.exists(true) }).remove()
db.collection('pricingConfigs').where({ _id: db.command.exists(true) }).remove()
db.collection('boats').where({ _id: db.command.exists(true) }).remove()
db.collection('staff').where({ _id: db.command.exists(true) }).remove()

// 2. 重新导入测试数据（使用 test-data 目录下的JSON文件）
```

### 方案B：数据迁移脚本（如果有生产数据）

创建临时云函数 `migrateData`：

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { collection } = event

  try {
    // 以 orders 集合为例
    if (collection === 'orders') {
      const { data: orders } = await db.collection('orders').get()

      for (const order of orders) {
        // 展平嵌套字段
        await db.collection('orders').doc(order._id).update({
          data: {
            // 船型信息
            boatTypeId: order.boatType?.id || null,
            boatTypeCode: order.boatType?.code || null,
            boatTypeName: order.boatType?.name || null,

            // 船只信息
            boatId: order.boat?.id || null,
            boatNumber: order.boat?.number || null,

            // 价格信息
            pricingId: order.pricing?.id || null,
            basePrice: order.pricing?.basePrice || 0,
            depositAmount: order.pricing?.depositAmount || 0,
            includedMinutes: order.pricing?.includedMinutes || 60,
            overtimeRate: order.pricing?.overtimeRate || 0,
            capAmount: order.pricing?.capAmount || null,

            // 计时信息
            startTime: order.timing?.startTime || null,
            endTime: order.timing?.endTime || null,
            usedSeconds: order.timing?.usedSeconds || 0,
            usedMinutes: order.timing?.usedMinutes || 0,
            overtimeMinutes: order.timing?.overtimeMinutes || 0,
            overtimeFee: order.timing?.overtimeFee || 0,
            isAbnormal: order.timing?.isAbnormal || false,

            // 结算信息
            finalAmount: order.settlement?.finalAmount || null,
            refundAmount: order.settlement?.refundAmount || null,
            refundedAt: order.settlement?.refundedAt || null,

            // 支付信息
            transactionId: order.payment?.transactionId || null,
            paidAt: order.payment?.paidAt || null,
            paymentMethod: order.payment?.method || 'wechat',

            // CMS通用字段
            sort: new Date(order.createdAt).getTime(),
            enabled: !order.isDeleted
          }
        })
      }

      return { success: true, count: orders.length }
    }

    // 其他集合类似处理...
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## CMS配置步骤（重要！）

### 1. 开启内容管理（CMS）

1. 登录微信开发者工具
2. 点击【云开发】→【内容管理】
3. 首次使用会提示开通，点击【开通】

### 2. 配置集合权限

为每个集合配置 CMS 访问权限：

1. 进入【内容管理】→【内容集合】
2. 点击【新建内容模型】或【导入现有集合】
3. 选择要管理的集合（如 `boatTypes`）
4. 配置权限：
   - **查看权限**：管理员、运营
   - **编辑权限**：管理员
   - **删除权限**：仅管理员

### 3. 配置字段类型

#### boatTypes - 船型配置

| 字段名 | CMS类型 | 必填 | 说明 |
|-------|---------|------|------|
| code | 单行字符串 | 是 | 船型编码 |
| name | 单行字符串 | 是 | 船型名称 |
| description | 多行字符串 | 否 | 船型描述 |
| maxCapacity | 数字 | 是 | 最大载客量 |
| imageUrl | 图片 | 否 | 船型图片 |
| sort | 数字 | 是 | 排序(默认1) |
| enabled | 布尔值 | 是 | 是否启用(默认true) |

**展示配置**：
- 列表主标题：`name`
- 列表副标题：`description`
- 列表图片：`imageUrl`
- 排序字段：`sort` 升序

#### pricingConfigs - 价格配置

| 字段名 | CMS类型 | 必填 | 说明 |
|-------|---------|------|------|
| boatTypeCode | 枚举 | 是 | 船型编码(DOUBLE/FOUR/SIX) |
| name | 单行字符串 | 是 | 价格方案名称 |
| basePrice | 数字 | 是 | 基础票价 |
| depositAmount | 数字 | 是 | 押金金额 |
| includedMinutes | 数字 | 是 | 包含时长 |
| overtimeRate | 数字 | 是 | 超时费率 |
| capAmount | 数字 | 否 | 封顶金额 |
| effectiveDate | 日期 | 否 | 生效日期 |
| expiryDate | 日期 | 否 | 失效日期 |
| isDefault | 布尔值 | 是 | 是否默认(默认false) |
| sort | 数字 | 是 | 排序(默认1) |
| enabled | 布尔值 | 是 | 是否启用(默认true) |

**展示配置**：
- 列表主标题：`name`
- 列表副标题：`basePrice元 + depositAmount押金`
- 排序字段：`sort` 升序
- 筛选字段：`boatTypeCode`, `enabled`

#### boats - 船只管理

| 字段名 | CMS类型 | 必填 | 说明 |
|-------|---------|------|------|
| boatNumber | 单行字符串 | 是 | 船号 |
| boatTypeCode | 枚举 | 是 | 船型编码(DOUBLE/FOUR/SIX) |
| status | 枚举 | 是 | 状态(idle/in_use/maintenance) |
| lastUsedAt | 日期 | 否 | 最后使用时间 |
| sort | 数字 | 是 | 排序(默认1) |
| enabled | 布尔值 | 是 | 是否启用(默认true) |

**展示配置**：
- 列表主标题：`boatNumber`
- 列表副标题：`status`
- 排序字段：`sort` 升序
- 筛选字段：`boatTypeCode`, `status`, `enabled`

**枚举配置**：
- status:
  - `idle` - 空闲
  - `in_use` - 使用中
  - `maintenance` - 维护中

#### orders - 订单管理（只读展示）

**注意**：订单集合建议设置为**只读**，不允许通过CMS修改。

| 字段名 | CMS类型 | 展示 |
|-------|---------|------|
| orderNo | 单行字符串 | 主标题 |
| boatTypeName | 单行字符串 | 副标题 |
| totalAmount | 数字 | 金额显示 |
| status | 枚举 | 状态标签 |
| createdAt | 日期 | 创建时间 |

**展示配置**：
- 列表主标题：`orderNo`
- 列表副标题：`boatTypeName - totalAmount元`
- 排序字段：`createdAt` 降序
- 筛选字段：`status`, `boatTypeCode`

#### staff - 员工管理

| 字段名 | CMS类型 | 必填 | 说明 |
|-------|---------|------|------|
| username | 单行字符串 | 是 | 登录账号 |
| password | 单行字符串 | 是 | 密码(加密) |
| realName | 单行字符串 | 是 | 真实姓名 |
| phone | 单行字符串 | 否 | 手机号 |
| role | 枚举 | 是 | 角色(staff/admin) |
| sort | 数字 | 是 | 排序(默认10) |
| enabled | 布尔值 | 是 | 是否启用(默认true) |

**展示配置**：
- 列表主标题：`realName`
- 列表副标题：`username - role`
- 排序字段：`sort` 升序
- 筛选字段：`role`, `enabled`

**枚举配置**：
- role:
  - `staff` - 普通员工
  - `admin` - 管理员

### 4. 配置用户角色

进入【内容管理】→【用户管理】：

1. **管理员角色**：
   - 权限：所有集合的增删改查
   - 人员：景区管理者、技术负责人

2. **运营角色**：
   - 权限：
     - `boatTypes` - 查看、编辑
     - `pricingConfigs` - 查看、编辑
     - `boats` - 查看、编辑
     - `orders` - 仅查看
     - `staff` - 仅查看
   - 人员：日常运营人员

3. **财务角色**（可选）：
   - 权限：
     - `orders` - 仅查看
     - `verificationLogs` - 仅查看
   - 人员：财务对账人员

---

## 运营手册（交接文档）

### 日常运营任务

#### 1. 价格调整（节假日涨价）

**场景**：周末或节假日需要调整价格

**操作步骤**：
1. 进入【内容管理】→【pricingConfigs】
2. 找到要调整的船型价格（如"双人船-平日价"）
3. 点击【复制】创建新价格方案
4. 修改字段：
   - `name`：改为"双人船-周末价"
   - `basePrice`：调整为新价格（如60元）
   - `effectiveDate`：设置生效日期
   - `expiryDate`：设置失效日期
   - `isDefault`：设为false
   - `enabled`：设为true
5. 点击【保存】

**注意事项**：
- 一个船型可以有多个价格方案
- 系统会优先使用在有效期内的价格
- `isDefault=true` 的价格是默认方案

#### 2. 船只维护管理

**场景**：某艘船需要暂时停用维护

**操作步骤**：
1. 进入【内容管理】→【boats】
2. 找到要维护的船只（如"A001"）
3. 点击【编辑】
4. 修改字段：
   - `status`：改为"maintenance"（维护中）
   - `enabled`：改为false（禁用）
5. 点击【保存】

**恢复步骤**：
1. 维护完成后，将 `status` 改回"idle"
2. 将 `enabled` 改回true
3. 保存

#### 3. 新增船只

**操作步骤**：
1. 进入【内容管理】→【boats】
2. 点击【新建】
3. 填写字段：
   - `boatNumber`：船号（如"A006"）
   - `boatTypeCode`：选择船型
   - `status`：idle
   - `sort`：排序号（按现有船号递增）
   - `enabled`：true
4. 点击【保存】

#### 4. 查看订单统计

**场景**：查看今日订单情况

**操作步骤**：
1. 进入【内容管理】→【orders】
2. 使用筛选功能：
   - 日期范围：选择今天
   - 状态：可筛选"completed"查看完成订单
3. 查看列表展示的金额、船型等信息

**注意**：订单数据不允许通过CMS修改，仅供查看。

#### 5. 员工账号管理

**新增员工**：
1. 进入【内容管理】→【staff】
2. 点击【新建】
3. 填写信息（注意：密码需要先用bcrypt加密）
4. 保存

**禁用员工**：
1. 找到员工记录
2. 点击【编辑】
3. 将 `enabled` 改为false
4. 保存

---

## 测试清单

### 上线前必须测试的功能

#### 1. 用户端测试
- [ ] 船型列表正常显示
- [ ] 创建订单正常（使用扁平化数据）
- [ ] 订单详情显示正确（价格、船型等）
- [ ] 计时功能正常更新

#### 2. 员工端测试
- [ ] 扫码核销正常（发船）
- [ ] 船号输入和绑定正常
- [ ] 扫码收船正常
- [ ] 账单计算正确

#### 3. CMS测试
- [ ] 运营人员能登录CMS
- [ ] 可以查看和编辑船型配置
- [ ] 可以查看和编辑价格配置
- [ ] 可以查看和编辑船只信息
- [ ] 可以查看订单（只读）
- [ ] 字段类型显示正确（图片、日期等）

#### 4. 数据验证
- [ ] 所有集合都有`sort`, `enabled`, `createdAt`, `updatedAt`字段
- [ ] 订单数据是扁平结构，无嵌套对象
- [ ] 价格配置中的`isDefault`字段正常工作

---

## 常见问题

### Q1: CMS无法显示图片？
**A**: 检查 `imageUrl` 字段是否配置为"图片"类型，且URL是否可访问。

### Q2: 修改价格后小程序没有生效？
**A**: 检查：
1. 价格配置的 `enabled` 是否为true
2. `effectiveDate` 和 `expiryDate` 是否在有效期内
3. 如果有多个价格方案，检查哪个是 `isDefault=true`

### Q3: 船只状态一直显示"使用中"？
**A**: 可能是订单收船时没有正确更新船只状态。通过CMS手动将船只 `status` 改回"idle"。

### Q4: CMS中如何批量导入数据？
**A**:
1. 在CMS中，每个集合都有【导入】功能
2. 选择JSON文件（使用 `test-data` 目录下的文件）
3. 导入模式选择"更新/插入"
4. 确认导入

---

## 技术支持

遇到问题时联系：
- 技术负责人：[姓名/联系方式]
- 开发团队：[联系方式]

**紧急联系**：
- 订单异常：手动在CMS中修改订单状态
- 系统故障：联系技术负责人

---

**文档版本**：V1.0
**最后更新**：2026-02-12
**下次更新**：根据运营反馈持续优化

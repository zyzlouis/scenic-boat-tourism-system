# Claude Code 任务指令：CMS适配修复 + 会员储值功能开发

**项目**：景区游船计时收费系统
**日期**：2026-02-12
**优先级**：高
**说明**：本文档包含两部分任务，请按顺序执行

---

## 第一部分：CMS适配方案的修复（6个问题）

以下是对当前CMS适配方案的审查反馈，请逐项修复。

---

### 问题1（重要）：orders 集合不需要扁平化，请还原

**问题描述**：
当前方案把 orders 集合中的 `boatType`、`pricing`、`timing`、`settlement`、`payment` 全部拆平了。但 orders 是系统自动生成的业务数据，在 CMS 中设为只读展示，运营人员不需要编辑订单。为了 CMS 只读展示而把订单结构全部拆平，导致需要修改所有核心云函数和所有小程序页面，工作量大且容易引入 bug。

**要求**：
1. orders 集合**保持原来的嵌套结构不变**（boatType、pricing、timing、settlement、payment 保持嵌套对象）
2. **撤销**已经对 createOrder、scanCode、startTrip、endTrip 这4个核心云函数的扁平化修改，还原为嵌套结构
3. **撤销**进度报告中提到的6个查询类云函数的修改计划
4. **撤销**小程序页面的字段修改计划
5. orders 集合在 CMS 中仍然设为只读展示，用嵌套字段直接展示即可（CMS 可以展示嵌套对象的数据，只是不方便编辑，但我们本来就不需要编辑）

**只有以下集合需要做 CMS 适配**（字段扁平、通用字段齐全）：
- `boatTypes` — 船型管理（运营可编辑）
- `pricingConfigs` — 价格配置（运营可编辑）
- `boats` — 船只管理（运营可编辑）
- `staff` — 员工管理（管理员可编辑）

---

### 问题2（必须修复）：员工密码管理方案不可行

**问题描述**：
CMS迁移指南中写"新增员工时密码需要先用bcrypt加密"，这对运营人员来说完全不可操作。运营人员不知道什么是 bcrypt。

**要求**：
1. 创建一个云函数 `manageStaff`，用于新增和修改员工，在云函数内部自动处理密码的 bcrypt 加密
2. CMS 中 staff 集合的 `password` 字段设置为**隐藏**，不让运营人员看到或编辑
3. 员工的新增和密码修改统一通过云函数处理，不通过 CMS 直接操作
4. 可以考虑在管理员端（员工端小程序）里提供一个"新增员工/重置密码"的入口，调用该云函数

**云函数示例逻辑**：
```javascript
// 云函数：manageStaff
const bcrypt = require('bcryptjs')

exports.main = async (event) => {
  const { action, staffData } = event

  if (action === 'create' || action === 'resetPassword') {
    // 自动加密密码
    const hashedPassword = await bcrypt.hash(staffData.password, 10)
    staffData.password = hashedPassword
  }

  // ... 执行创建或更新操作
}
```

---

### 问题3（必须修复）：boatTypes 的 code 字段需要设为只读

**问题描述**：
pricingConfigs 和 boats 集合使用 `boatTypeCode` 来关联船型。如果运营人员在 CMS 中误改了 boatTypes 的 `code` 字段，所有关联关系就断了。

**要求**：
1. 在 CMS 配置中，将 boatTypes 集合的 `code` 字段设为**不可编辑**（只读）
2. 如果 CMS 不支持单个字段设为只读，则在 CMS 的字段描述中**明确注明**："⚠️ 此字段为系统标识，请勿修改，否则会导致价格配置和船只关联失效"
3. 同时在 boatTypes 模型配置的说明中也加上此提醒

---

### 问题4（建议补充）：新增运营内容集合

**问题描述**：
当前只处理了业务集合，缺少运营人员日常需要管理的内容集合。

**要求**：新增以下3个集合，遵守CMS友好设计原则（扁平字段、通用字段齐全）

#### 4.1 banners（轮播图/广告位）

```javascript
{
  _id: "auto",
  title: "春节特惠活动",          // 单行字符串，标题（方便管理员识别）
  imageUrl: "cloud://...",       // 图片，轮播图片
  linkType: "none",              // 枚举：none/page/web，点击跳转类型
  linkUrl: "",                   // 单行字符串，跳转地址（小程序页面路径或网页URL）
  sort: 1,                       // 数字，排序
  enabled: true,                 // 布尔值，是否显示
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.2 announcements（公告通知）

```javascript
{
  _id: "auto",
  title: "今日因暴雨暂停运营",     // 单行字符串，公告标题
  content: "尊敬的游客...",        // 多行字符串/富文本，公告内容
  type: "warning",               // 枚举：info/warning/urgent，公告类型
  showOnHome: true,              // 布尔值，是否在首页弹窗显示
  startDate: Date,               // 日期，生效开始时间
  endDate: Date,                 // 日期，生效结束时间
  sort: 1,                       // 数字，排序
  enabled: true,                 // 布尔值，是否启用
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.3 app_settings（基础设置）

**注意**：此集合比较特殊，只有1条记录，但所有字段都在第一层，CMS可以直接编辑。

```javascript
{
  _id: "global_settings",
  scenicName: "XX湖景区",          // 单行字符串，景区名称
  contactPhone: "0571-12345678",  // 单行字符串，客服电话
  openTime: "08:00",              // 单行字符串，营业开始时间
  closeTime: "18:00",             // 单行字符串，营业结束时间
  refundRules: "退款说明...",      // 多行字符串，退款规则说明
  safetyNotice: "安全须知...",     // 多行字符串，安全须知
  aboutUs: "景区介绍...",          // 多行字符串/富文本，关于我们
  logoUrl: "cloud://...",         // 图片，景区logo
  enabled: true,                  // 布尔值，系统是否开放（紧急关闭用）
  sort: 1,
  createdAt: Date,
  updatedAt: Date
}
```

**同时需要**：
- 在小程序首页添加公告展示逻辑（读取 announcements，判断日期和 enabled 状态）
- 在小程序首页添加轮播图展示逻辑（读取 banners）
- 在小程序适当位置展示客服电话、营业时间等信息（读取 app_settings）

---

### 问题5（上线前必做）：全局搜索验证

**要求**：
在所有修改完成后，对整个项目代码（云函数 + 小程序页面）进行全局搜索，确保以下旧字段名已全部替换干净（仅针对 boatTypes、pricingConfigs、boats、staff 这几个需要CMS适配的集合）：

需要搜索确认不再存在的旧写法：
```
isDeleted
isActive
sortOrder
```

如果在 orders 相关的代码中出现上述字段，那是正常的（因为 orders 保持原结构）。只需确保 boatTypes、pricingConfigs、boats、staff 相关的代码中没有旧字段。

---

### 问题6（注意事项）：isDeleted 到 enabled 的迁移兜底

**问题描述**：
如果旧数据中某些记录的 `isDeleted` 字段不存在（undefined），直接 `!undefined` 虽然结果为 true（恰好正确），但建议加显式兜底。

**要求**：
在所有数据迁移逻辑中，使用显式判断：
```javascript
// ✅ 推荐写法
enabled: order.isDeleted === true ? false : true

// ❌ 不推荐
enabled: !order.isDeleted
```

---
---

## 第二部分：会员储值功能开发

### 需求概述

在用户端小程序中新增**会员储值卡**功能，用户可以提前充值余额到账户中，游玩时可使用余额支付。同时重构用户端的页面结构，新增"个人中心"页面。

---

### 一、页面结构调整

#### 当前结构（2个Tab）：
```
底部TabBar:
├── 首页
└── 我的订单
```

#### 调整后（3个Tab）：
```
底部TabBar:
├── 首页          → pages/index/index（保持不变）
├── 我的订单      → pages/order-list/order-list（保持不变，仅移动Tab位置到中间）
└── 个人中心      → pages/profile/profile（新建页面）
```

#### 个人中心页面布局：

```
┌─────────────────────────────────┐
│  用户头像    昵称                │
│             手机号              │
├─────────────────────────────────┤
│                                 │
│  ┌─── 储值卡 ─────────────────┐ │
│  │  余额：¥ 500.00            │ │
│  │                            │ │
│  │  [立即充值]                 │ │
│  └────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  📋 我的订单                  > │
│  💳 充值记录                  > │
│  📞 联系客服                  > │
│  ℹ️  关于景区                  > │
├─────────────────────────────────┤
│  🔄 退款说明                  > │
│  ⚙️  设置                     > │
└─────────────────────────────────┘
```

---

### 二、数据库设计（新增集合）

遵守 CMS 友好设计原则：字段扁平、通用字段齐全。

#### 2.1 recharge_plans（充值方案）— CMS可编辑

运营人员可以在 CMS 中配置充值面额和赠送规则。

```javascript
{
  _id: "auto",
  name: "充100送20",               // 单行字符串，方案名称
  amount: 100,                     // 数字，充值金额（元）
  giftAmount: 20,                  // 数字，赠送金额（元）
  totalAmount: 120,                // 数字，到账总额（元）= amount + giftAmount
  tag: "热门",                     // 单行字符串，标签（如"热门"、"超值"，可为空）
  sort: 1,                         // 数字，排序
  enabled: true,                   // 布尔值，是否启用
  createdAt: Date,
  updatedAt: Date
}
```

**CMS配置**：
- 列表主标题：`name`
- 列表副标题：`amount`元 + 送`giftAmount`元
- 运营人员可以自由增删改充值方案

#### 2.2 users 集合增加余额字段

在现有 users 集合中新增以下字段：

```javascript
{
  // ... 原有字段保持不变 ...
  balance: 0.00,                   // 数字，当前余额（元）
  totalRecharge: 0.00,             // 数字，累计充值金额（元）
  totalGift: 0.00,                 // 数字，累计获赠金额（元）
  isVip: false                     // 布尔值，是否为会员（充值过即为会员）
}
```

**注意**：余额的增减必须通过云函数操作，禁止在小程序端直接修改余额字段。

#### 2.3 recharge_orders（充值订单）— CMS只读

```javascript
{
  _id: "auto",
  _openid: "user_openid",
  userId: "user_id",               // 单行字符串，关联用户ID
  orderNo: "RC20260212123456",     // 单行字符串，充值订单号（唯一）
  planName: "充100送20",            // 单行字符串，充值方案名称（快照）
  amount: 100.00,                  // 数字，实付金额
  giftAmount: 20.00,               // 数字，赠送金额
  totalAmount: 120.00,             // 数字，到账总额
  status: "success",               // 枚举：pending/success/failed/refunded
  transactionId: "wx_pay_id",      // 单行字符串，微信支付交易号
  paidAt: Date,                    // 日期，支付时间
  remark: "",                      // 单行字符串，备注
  sort: 0,                         // 数字，排序（用时间戳）
  enabled: true,                   // 布尔值
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.4 balance_logs（余额变动记录）— CMS只读

每一次余额变动都记录一条流水，方便对账。

```javascript
{
  _id: "auto",
  _openid: "user_openid",
  userId: "user_id",               // 单行字符串，关联用户ID
  type: "recharge",                // 枚举：recharge（充值）/ consume（消费）/ refund（退款）
  changeAmount: 120.00,            // 数字，变动金额（正数为增加，负数为减少）
  beforeBalance: 0.00,             // 数字，变动前余额
  afterBalance: 120.00,            // 数字，变动后余额
  relatedOrderNo: "RC20260212..",  // 单行字符串，关联订单号（充值订单号或游船订单号）
  description: "充值100元,赠送20元", // 单行字符串，变动说明
  sort: 0,                         // 数字，排序（用时间戳）
  enabled: true,                   // 布尔值
  createdAt: Date,
  updatedAt: Date
}
```

---

### 三、云函数设计

#### 3.1 getRecharePlans — 获取充值方案列表

```javascript
// 小程序端调用，获取所有启用的充值方案
const db = cloud.database()
const { data } = await db.collection('recharge_plans')
  .where({ enabled: true })
  .orderBy('sort', 'asc')
  .get()
return { plans: data }
```

#### 3.2 createRechargeOrder — 创建充值订单

```javascript
// 1. 根据 planId 查询充值方案（验证有效性）
// 2. 生成充值订单号
// 3. 创建充值订单（status: pending）
// 4. 调用微信支付统一下单
// 5. 返回支付参数给前端
```

#### 3.3 rechargeCallback — 充值支付回调

```javascript
// 1. 验证支付结果
// 2. 更新充值订单状态为 success
// 3. 更新用户余额（使用事务，确保原子操作）：
//    - balance += totalAmount
//    - totalRecharge += amount
//    - totalGift += giftAmount
//    - isVip = true
// 4. 写入 balance_logs 流水记录
```

**关键：余额操作必须使用事务（transaction）或原子操作（inc），防止并发问题**

```javascript
// 推荐使用 inc 原子操作
await db.collection('users').doc(userId).update({
  data: {
    balance: _.inc(totalAmount),
    totalRecharge: _.inc(amount),
    totalGift: _.inc(giftAmount),
    isVip: true,
    updatedAt: new Date()
  }
})
```

#### 3.4 getUserBalance — 获取用户余额信息

```javascript
// 返回用户余额、累计充值、会员状态等
const { data: user } = await db.collection('users').doc(userId).get()
return {
  balance: user.balance || 0,
  totalRecharge: user.totalRecharge || 0,
  totalGift: user.totalGift || 0,
  isVip: user.isVip || false
}
```

#### 3.5 getBalanceLogs — 获取余额变动记录

```javascript
// 分页查询用户的余额变动流水
const { data } = await db.collection('balance_logs')
  .where({ userId: userId })
  .orderBy('createdAt', 'desc')
  .skip(page * pageSize)
  .limit(pageSize)
  .get()
return { logs: data }
```

#### 3.6 修改现有的订单支付逻辑 — 支持余额支付

现有的游船订单支付流程需要增加余额支付选项：

```
用户选择支付方式：
├── 微信支付（原有逻辑不变）
└── 余额支付（新增）
    ├── 检查余额是否充足
    ├── 扣减余额（原子操作）
    ├── 写入 balance_logs
    └── 更新订单状态为已支付
```

**余额支付云函数逻辑要点**：
```javascript
// 1. 查询用户余额
// 2. 判断余额 >= 订单金额（票价 + 押金）
// 3. 使用事务：
//    a. 扣减用户余额 balance: _.inc(-totalAmount)
//    b. 写入 balance_logs（type: consume）
//    c. 更新订单状态为 paid，payment.method 设为 "balance"
// 4. 如果余额不足，返回错误提示
```

**退款时也要处理余额退回**：
```javascript
// 收船结算退押金时，如果原支付方式是余额：
// 1. 退回余额 balance: _.inc(refundAmount)
// 2. 写入 balance_logs（type: refund）
```

---

### 四、小程序页面开发

#### 4.1 修改 app.json — 调整 TabBar

```json
{
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab-home.png",
        "selectedIconPath": "images/tab-home-active.png"
      },
      {
        "pagePath": "pages/order-list/order-list",
        "text": "我的订单",
        "iconPath": "images/tab-order.png",
        "selectedIconPath": "images/tab-order-active.png"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "个人中心",
        "iconPath": "images/tab-profile.png",
        "selectedIconPath": "images/tab-profile-active.png"
      }
    ]
  }
}
```

#### 4.2 新建页面：个人中心 pages/profile/profile

**功能**：
- 顶部显示用户头像、昵称
- 储值卡区域：显示余额 + 充值按钮
- 功能列表：我的订单、充值记录、联系客服、关于景区、退款说明

#### 4.3 新建页面：充值 pages/recharge/recharge

**功能**：
- 展示所有充值方案（从 recharge_plans 读取）
- 每个方案显示：充值金额、赠送金额、到账总额、标签
- 用户选择方案后点击充值，调起微信支付
- 支付成功后跳转到个人中心，刷新余额

**页面布局**：
```
┌─────────────────────────────────┐
│         选择充值金额             │
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │ ¥50  │  │ ¥100 │  │ ¥200 │  │
│  │送10元│  │送20元│  │送50元│  │
│  │      │  │ 热门 │  │ 超值 │  │
│  └──────┘  └──────┘  └──────┘  │
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │ ¥500 │  │¥1000 │  │¥2000 │  │
│  │送150 │  │送350 │  │送800 │  │
│  │      │  │      │  │      │  │
│  └──────┘  └──────┘  └──────┘  │
│                                 │
│  充值金额：¥100                  │
│  赠送金额：¥20                   │
│  到账总额：¥120                  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       立即充值              │  │
│  └───────────────────────────┘  │
│                                 │
│  充值即表示同意《储值服务协议》    │
└─────────────────────────────────┘
```

#### 4.4 新建页面：充值记录 pages/recharge-logs/recharge-logs

**功能**：
- 展示用户的所有余额变动记录（充值、消费、退款）
- 按时间倒序
- 不同类型用不同颜色标识（充值=绿色正数，消费=红色负数，退款=蓝色正数）

#### 4.5 修改订单支付页面

在创建订单/支付页面增加支付方式选择：
- 微信支付
- 余额支付（显示当前余额，余额不足时置灰）

---

### 五、CMS配置补充

以下新集合需要在 CMS 中配置：

| 集合 | CMS权限 | 运营操作 |
|------|---------|---------|
| `recharge_plans` | 可编辑 | 运营人员可增删改充值方案 |
| `recharge_orders` | 只读 | 仅查看充值订单 |
| `balance_logs` | 只读 | 仅查看余额流水 |

**recharge_plans 的 CMS 字段配置**：

| 字段名 | CMS类型 | 必填 | 说明 |
|-------|---------|------|------|
| name | 单行字符串 | 是 | 方案名称 |
| amount | 数字 | 是 | 充值金额 |
| giftAmount | 数字 | 是 | 赠送金额 |
| totalAmount | 数字 | 是 | 到账总额 |
| tag | 单行字符串 | 否 | 标签（热门/超值等） |
| sort | 数字 | 是 | 排序 |
| enabled | 布尔值 | 是 | 是否启用 |

---

### 六、安全要点

1. **余额操作只能通过云函数**，禁止在小程序端直接修改 users 的 balance 字段
2. **使用原子操作 `_.inc()`** 更新余额，防止并发问题
3. **每次余额变动必须写入 balance_logs**，确保可追溯
4. **支付回调要做幂等处理**，防止重复到账
5. **退款逻辑要区分支付方式**：微信支付的退微信，余额支付的退余额
6. **数据库权限**：balance_logs 和 recharge_orders 设为仅云函数可写，用户端不可直接写入

---

### 七、数据库设计约束（重申）

所有新增集合必须遵守以下原则：
1. 一个集合只存一种事物，集合内所有记录的字段结构必须完全一致
2. 禁止在一个集合里通过不同 `_id` 存放结构完全不同的配置
3. 禁止使用嵌套数组存放列表数据，应该拆分为独立集合，每个元素一条记录
4. **字段保持扁平，不使用嵌套对象，所有字段都在文档的第一层**
5. 每个集合都要有 `sort`、`enabled`、`createdAt`、`updatedAt` 这四个通用字段
6. 图片类数据不要用数组存在一条记录里，每张图应该是一条独立记录
7. CMS 支持的字段类型有：单行字符串、多行字符串、数字、布尔值、枚举、图片、文件、富文本、日期，设计字段时请只使用这些类型
8. orders 集合是例外，保持原有嵌套结构（因为不需要CMS编辑）

---

**文档结束。请按照第一部分→第二部分的顺序执行。第一部分完成后先确认，再开始第二部分。**

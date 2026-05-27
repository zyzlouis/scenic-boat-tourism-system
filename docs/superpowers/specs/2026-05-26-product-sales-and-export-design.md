# 设计文档：项目化商品销售 + 订单导出

> 2026-05-26 | 状态：已确认，待开发

## 背景

景区新增「水上城堡」等项目，需要在小程序里销售门票和配套用品。同时后台需要支持订单数据导出。

## 核心决策

**方案 A（已选定）**：商品订单与游船订单共用 `orders` 集合，通过 `orderType` 字段区分。理由：最小改动量，复用现有支付/退款/核销基础设施，外包项目优先可维护性。

---

## 一、数据模型

### 1.1 新增集合：`projects`

```javascript
{
  _id: "project_water_castle",
  name: "水上城堡",
  description: "水上乐园游玩项目",
  imageUrl: "cloud://xxx/water-castle.jpg",
  openTime: "09:00",
  closeTime: "19:00",
  sort: 1,
  enabled: true,
  createdAt: "2026-05-26T...",
  updatedAt: "2026-05-26T..."
}
```

### 1.2 新增集合：`products`

```javascript
{
  _id: "prod_child_ticket",
  projectId: "project_water_castle",
  name: "单人儿童票",
  description: "适合3-12岁儿童",
  imageUrl: "cloud://xxx/child-ticket.jpg",
  price: 29.9,
  needVerification: true,       // 是否需要核销
  verificationDays: 15,         // 核销有效天数
  stock: 0,                     // 0=不限，>0=限量
  soldCount: 0,
  sort: 1,
  enabled: true,                // 上下架
  createdAt: "2026-05-26T...",
  updatedAt: "2026-05-26T..."
}
```

### 1.3 orders 集合扩展（商品订单专有字段）

```javascript
{
  // 新增字段（所有订单）
  orderType: "boat" | "product",  // 游船订单默认 "boat"

  // 以下字段仅 orderType="product" 时存在
  projectId: "project_water_castle",
  projectName: "水上城堡",
  productId: "prod_child_ticket",
  productName: "单人儿童票",
  productPrice: 29.9,
  quantity: 2,
  needVerification: true,
  verificationDeadline: "2026-06-10T...",  // createdAt + verificationDays
  verifiedAt: null,
  verifiedStaffId: null,
  verifiedStaffName: null,

  // 复用现有字段
  orderNo: "PROD202605261425...",   // 前缀 PROD 区分
  totalAmount: 59.8,                // quantity × price
  verificationCode: "AB3K9F",       // needVerification=true 时生成
  status: "pending|paid|completed|refunded",
  payment: { ... }                  // 与游船订单结构一致
}
```

**商品订单状态流转**：`pending → paid → completed / refunded`（无 timing 状态）

- `needVerification=true`：paid → 员工扫码核销 → completed
- `needVerification=false`：支付回调中直接设为 completed

### 1.4 现有数据兼容

历史游船订单没有 `orderType` 字段。查询时约定：`orderType` 不存在或为 `"boat"` 均视为游船订单。不需要回填历史数据。

### 1.5 数据库初始化（自动化）

扩展现有 `initDatabase` 云函数，新增 `action: 'initProducts'`：
- 自动创建 `projects`、`products` 两个集合（`db.createCollection()`）
- 插入「水上城堡」初始项目和 5 个初始商品（3 门票 + 2 用品）
- 部署后调用一次即可，无需手动在控制台操作
- 集合权限（所有用户可读、仅管理端可写）需后续在控制台补设，不影响功能运行

---

## 二、云函数

### 2.1 新增云函数（3 个）

#### `getProjects`
- 入参：无
- 逻辑：查询 `projects`（enabled=true），每个项目下关联查询 `products`（enabled=true），按 sort 排序
- 返回：项目列表，每个项目包含 products 数组

#### `createProductOrder`
- 入参：productId, quantity
- 逻辑：
  1. 查商品是否存在、已上架
  2. 检查库存（stock>0 时判断 soldCount+quantity <= stock）
  3. 创建订单（orderType="product"，状态 pending）
  4. 有库存限制时 soldCount += quantity（用 _.inc()）
  5. 返回订单信息，前端调起支付
- 订单号前缀：`PROD`

#### `verifyProduct`
- 入参：orderId, staffId
- 逻辑：
  1. 查订单，确认 orderType="product"、status="paid"、needVerification=true
  2. 检查 verificationDeadline 未过期
  3. 更新：status="completed"、verifiedAt/verifiedStaffId/verifiedStaffName、completedAt
- 返回：核销成功信息

### 2.2 修改现有云函数（4 个）

#### `wechatPayCallback`
- 改动：根据订单号前缀分流
  - `BOAT*` → 原有逻辑（生成核销码，status=paid）
  - `PROD*` → 商品逻辑：
    - needVerification=true → 生成核销码，计算 verificationDeadline，status=paid
    - needVerification=false → 不生成核销码，status=completed

#### `scanCode`
- 改动：扫码查到订单后判断 orderType
  - `boat` → 原有逻辑（start/end 两步）
  - `product` → 调用 verifyProduct 逻辑，返回 action:"verify_product"

#### `refundOrder`
- 改动：增加商品订单退款支持
  - 检查 orderType、status=paid、未核销
  - 有库存限制时退回 soldCount（用 _.inc(-quantity)）
  - 退款逻辑复用现有的微信退款/余额退款

#### `adminApi`
- 新增 action：
  - `queryProjects` / `saveProject` / `deleteProject`
  - `queryProducts` / `saveProduct` / `deleteProduct`
  - `queryOrders` 增加 orderType 筛选参数

---

## 三、用户端（client-user）

### 3.1 首页改造（pages/index/）

在现有船型列表下方，增加项目商品区块：

```
轮播图（不变）
公告栏（不变）
━━━━━━━━━━━━━━━━━
🚤 游船租赁（原有，不变）
  [双人船] [四人船] ...
━━━━━━━━━━━━━━━━━
🏰 水上城堡（从 getProjects 获取）
  [单人儿童票 ¥29.9] [亲子票 ¥39.9] ...
━━━━━━━━━━━━━━━━━
（未来新项目自动追加）
```

onLoad 新增调用 `getProjects`，渲染项目区块。

### 3.2 新增页面：商品详情（pages/product-detail/）

- 商品图片
- 名称、描述、价格
- 数量选择器（+/-）
- 库存提示（有限量时显示"剩余 XX 份"）
- 「立即购买」按钮 → createProductOrder → 调起支付

### 3.3 新增页面：商品订单详情（pages/product-order/）

- 订单基本信息：商品名、数量、金额、下单时间
- 需核销的：大字显示核销码 + 有效期倒计时 + 二维码
- 无需核销的：显示"交易完成"
- 已核销的：显示核销时间和核销员工
- 未核销+未过期：显示「申请退款」按钮

### 3.4 修改页面：订单列表（pages/order-list/）

- 顶部增加 Tab：「游船订单」/「商品订单」
- getOrderList 增加 orderType 参数
- 商品订单卡片显示：商品名、数量、金额、核销状态

---

## 四、员工端（client-staff）

### 4.1 修改页面：扫码核销（pages/scan/）

扫码后根据返回的 action 分流：

- `action:"start"` / `action:"end"` → 原有游船流程（不变）
- `action:"verify_product"` → 显示商品核销确认卡片：
  - 商品名、数量、金额
  - 核销截止日期
  - 「确认核销」按钮 → 调用 verifyProduct → 显示成功

---

## 五、后台（admin-web）

### 5.1 新增菜单：项目管理

- 项目列表（表格）：名称、图片、营业时间、状态（启用/禁用）、操作
- 新增/编辑项目弹窗

### 5.2 新增菜单：商品管理

- 顶部项目筛选下拉框
- 商品列表（表格）：名称、价格、库存、已售、是否核销、上下架状态、操作
- 新增/编辑商品弹窗：含「是否需要核销」开关、核销有效天数、库存数量

### 5.3 修改：订单管理

- 筛选条件增加「订单类型」下拉（全部/游船/商品）
- 表格列自适应：游船订单显示船型+船号列，商品订单显示商品名+数量列
- 新增「导出 Excel」按钮

### 5.4 Excel 导出

前端实现（SheetJS/xlsx 库），不需要新增云函数：

1. 根据当前筛选条件查询所有订单（分页加载直到全部获取）
2. 拼装表格数据
3. 生成 .xlsx 文件触发下载

导出字段：订单号、类型、商品/船型名、数量、金额、支付方式、状态、核销状态、创建时间

---

## 六、改动汇总

| 层 | 新增 | 修改 |
|---|------|------|
| 云数据库 | projects、products（2 个集合） | orders（加字段） |
| 云函数 | getProjects、createProductOrder、verifyProduct（3 个） | wechatPayCallback、scanCode、refundOrder、adminApi（4 个） |
| 用户端 | product-detail、product-order（2 个页面） | index、order-list（2 个页面） |
| 员工端 | 无 | scan（1 个页面） |
| 后台 | 项目管理、商品管理（2 个菜单） | 订单管理（筛选+导出） |

**不改的**：createOrder、startTrip、endTrip、getOrderDetail、wechatPay、充值相关、分享相关 — 游船核心流程零改动。

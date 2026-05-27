# 项目化商品销售 + 订单导出 开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在景区游船小程序中新增项目化商品销售功能（水上城堡门票/用品）和后台订单导出功能。

**Architecture:** 商品订单复用现有 orders 集合（通过 orderType 字段区分），新增 projects/products 两个集合。新增 3 个云函数、修改 4 个云函数，用户端新增 2 个页面、修改 2 个页面，员工端修改 1 个页面，后台新增 2 个菜单并改造订单管理。

**Tech Stack:** 微信云开发（云函数 + 云数据库）、原生微信小程序、Vue3 + Element Plus（admin-web 单 HTML）、Vant Weapp、SheetJS（Excel 导出）

---

### Task 1: 数据库初始化 — 扩展 initDatabase 云函数

**Files:**
- Modify: `cloudfunctions/initDatabase/index.js`

- [ ] **Step 1: 添加商品初始数据和 initProducts action**

在 `cloudfunctions/initDatabase/index.js` 文件末尾的 `exports.main` 函数中，在 `action === 'check'` 分支后面增加 `initProducts` 分支。同时在文件顶部添加初始数据。

在文件顶部（`rechargePlansData` 数组之后、`exports.main` 之前）添加：

```javascript
// 9. 项目数据
const projectsData = [
  {
    _id: 'project_water_castle',
    name: '水上城堡',
    description: '水上乐园游玩项目',
    imageUrl: '',
    openTime: '09:00',
    closeTime: '19:00',
    sort: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 10. 商品数据
const productsData = [
  {
    _id: 'prod_child_ticket',
    projectId: 'project_water_castle',
    name: '单人儿童票',
    description: '适合3-12岁儿童',
    imageUrl: '',
    price: 29.9,
    needVerification: true,
    verificationDays: 15,
    stock: 0,
    soldCount: 0,
    sort: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'prod_parent_child_1',
    projectId: 'project_water_castle',
    name: '一大一小亲子票',
    description: '1位成人+1位儿童',
    imageUrl: '',
    price: 39.9,
    needVerification: true,
    verificationDays: 15,
    stock: 0,
    soldCount: 0,
    sort: 2,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'prod_parent_child_2',
    projectId: 'project_water_castle',
    name: '一大二小亲子票',
    description: '1位成人+2位儿童',
    imageUrl: '',
    price: 59.9,
    needVerification: true,
    verificationDays: 15,
    stock: 0,
    soldCount: 0,
    sort: 3,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'prod_bath_towel',
    projectId: 'project_water_castle',
    name: '浴巾',
    description: '水上乐园专用浴巾',
    imageUrl: '',
    price: 0,
    needVerification: false,
    verificationDays: 0,
    stock: 0,
    soldCount: 0,
    sort: 4,
    enabled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'prod_anti_slip_socks',
    projectId: 'project_water_castle',
    name: '防滑袜',
    description: '水上乐园专用防滑袜',
    imageUrl: '',
    price: 0,
    needVerification: false,
    verificationDays: 0,
    stock: 0,
    soldCount: 0,
    sort: 5,
    enabled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]
```

在 `exports.main` 的 switch 中增加分支（在 `action === 'check'` 之后）：

```javascript
    } else if (action === 'initProducts') {
      return await initProductCollections()
    } else {
```

在文件末尾添加新函数：

```javascript
async function initProductCollections() {
  const results = {}

  console.log('开始初始化商品相关集合...')

  results.projects = await initCollection('projects', projectsData)
  results.products = await initCollection('products', productsData)

  console.log('商品相关集合初始化完成！')

  return {
    success: true,
    message: '商品集合初始化成功',
    results: results
  }
}
```

- [ ] **Step 2: 验证代码无语法错误**

在微信开发者工具中右键 `cloudfunctions/initDatabase` → 上传并部署：云端安装依赖。

- [ ] **Step 3: 调用 initProducts 初始化数据**

在微信开发者工具的云开发控制台中，测试调用 initDatabase 云函数：
```json
{ "action": "initProducts" }
```

预期返回：projects 和 products 两个集合 status 为 "success"。

- [ ] **Step 4: 调用 check 确认现有数据不受影响**

```json
{ "action": "check" }
```

预期：所有原有集合（boatTypes、orders 等）状态为 "ok"，数据量不变。

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/initDatabase/index.js
git commit -m "$(cat <<'EOF'
feat: initDatabase 新增 initProducts action

自动创建 projects 和 products 集合，插入水上城堡初始项目和5个商品数据。
与现有集合完全隔离，不影响已有数据。
EOF
)"
```

---

### Task 2: 新增云函数 getProjects

**Files:**
- Create: `cloudfunctions/getProjects/index.js`
- Create: `cloudfunctions/getProjects/package.json`

- [ ] **Step 1: 创建 getProjects 云函数**

`cloudfunctions/getProjects/package.json`:
```json
{
  "name": "getProjects",
  "version": "1.0.0",
  "description": "获取项目和商品列表",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/getProjects/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { data: projects } = await db.collection('projects')
      .where({ enabled: true })
      .orderBy('sort', 'asc')
      .get()

    if (projects.length === 0) {
      return { code: 200, message: '成功', data: [] }
    }

    const projectIds = projects.map(p => p._id)
    const _ = db.command

    const { data: products } = await db.collection('products')
      .where({
        projectId: _.in(projectIds),
        enabled: true
      })
      .orderBy('sort', 'asc')
      .get()

    const result = projects.map(project => ({
      ...project,
      products: products.filter(p => p.projectId === project._id)
    }))

    return { code: 200, message: '成功', data: result }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}
```

- [ ] **Step 2: 部署并测试**

微信开发者工具中右键上传部署，测试调用（无参数）。预期返回水上城堡项目及其下的 3 个已上架商品。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/getProjects/
git commit -m "$(cat <<'EOF'
feat: 新增 getProjects 云函数

查询已上架的项目列表，每个项目包含其下已上架的商品数组。
EOF
)"
```

---

### Task 3: 新增云函数 createProductOrder

**Files:**
- Create: `cloudfunctions/createProductOrder/index.js`
- Create: `cloudfunctions/createProductOrder/package.json`

- [ ] **Step 1: 创建 createProductOrder 云函数**

`cloudfunctions/createProductOrder/package.json`:
```json
{
  "name": "createProductOrder",
  "version": "1.0.0",
  "description": "创建商品订单",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/createProductOrder/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const r = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `PROD${y}${M}${d}${h}${m}${s}${r}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { productId, quantity = 1 } = event

  if (!productId) {
    return { code: 400, message: '商品ID不能为空', data: null }
  }

  if (quantity < 1 || quantity > 99) {
    return { code: 400, message: '购买数量不合法', data: null }
  }

  try {
    const { data: productList } = await db.collection('products')
      .where({ _id: productId, enabled: true })
      .get()

    if (productList.length === 0) {
      return { code: 404, message: '商品不存在或已下架', data: null }
    }

    const product = productList[0]

    if (product.stock > 0 && product.soldCount + quantity > product.stock) {
      return { code: 400, message: '库存不足', data: null }
    }

    const { data: projectList } = await db.collection('projects')
      .where({ _id: product.projectId })
      .get()

    const project = projectList[0] || {}

    const totalAmount = parseFloat((product.price * quantity).toFixed(2))
    const now = new Date()

    let verificationDeadline = null
    if (product.needVerification && product.verificationDays > 0) {
      verificationDeadline = new Date(now.getTime() + product.verificationDays * 24 * 60 * 60 * 1000)
    }

    const orderData = {
      _openid: wxContext.OPENID,
      orderNo: generateOrderNo(),
      userId: wxContext.OPENID,
      orderType: 'product',
      projectId: product.projectId,
      projectName: project.name || '',
      productId: product._id,
      productName: product.name,
      productPrice: product.price,
      quantity: quantity,
      needVerification: product.needVerification,
      verificationDeadline: verificationDeadline,
      verifiedAt: null,
      verifiedStaffId: null,
      verifiedStaffName: null,
      totalAmount: totalAmount,
      verificationCode: null,
      status: 'pending',
      payment: {
        transactionId: null,
        paidAt: null,
        method: 'wechat'
      },
      remark: '',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    }

    const { _id } = await db.collection('orders').add({ data: orderData })

    if (product.stock > 0) {
      await db.collection('products').doc(productId).update({
        data: { soldCount: _.inc(quantity) }
      })
    }

    return {
      code: 200,
      message: '订单创建成功',
      data: {
        orderId: _id,
        orderNo: orderData.orderNo,
        productName: product.name,
        quantity: quantity,
        totalAmount: totalAmount,
        status: 'pending',
        createdAt: now
      }
    }
  } catch (error) {
    console.error('创建商品订单失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}
```

- [ ] **Step 2: 部署并测试**

部署后测试调用：
```json
{ "productId": "prod_child_ticket", "quantity": 1 }
```

预期：返回 code 200，订单号以 PROD 开头，totalAmount 为 29.9。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/createProductOrder/
git commit -m "$(cat <<'EOF'
feat: 新增 createProductOrder 云函数

创建商品订单：校验商品、检查库存、生成 PROD 前缀订单号、写入 orders 集合（orderType=product）。
EOF
)"
```

---

### Task 4: 新增云函数 verifyProduct

**Files:**
- Create: `cloudfunctions/verifyProduct/index.js`
- Create: `cloudfunctions/verifyProduct/package.json`

- [ ] **Step 1: 创建 verifyProduct 云函数**

`cloudfunctions/verifyProduct/package.json`:
```json
{
  "name": "verifyProduct",
  "version": "1.0.0",
  "description": "商品订单核销",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/verifyProduct/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId, staffId } = event

  if (!orderId) {
    return { code: 400, message: '订单ID不能为空', data: null }
  }

  try {
    const { data: order } = await db.collection('orders').doc(orderId).get()

    if (!order) {
      return { code: 404, message: '订单不存在', data: null }
    }

    if (order.orderType !== 'product') {
      return { code: 400, message: '非商品订单，无法使用此方式核销', data: null }
    }

    if (order.status !== 'paid') {
      return { code: 400, message: '订单状态不正确，无法核销', data: null }
    }

    if (!order.needVerification) {
      return { code: 400, message: '该商品无需核销', data: null }
    }

    if (order.verificationDeadline && new Date() > new Date(order.verificationDeadline)) {
      return { code: 400, message: '核销码已过期，请联系管理员处理', data: null }
    }

    let staffName = ''
    if (staffId) {
      try {
        const { data: staff } = await db.collection('staff').doc(staffId).get()
        staffName = staff.realName || staff.username || ''
      } catch (e) {}
    }

    const now = new Date()
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        verifiedAt: now,
        verifiedStaffId: staffId || '',
        verifiedStaffName: staffName,
        completedAt: now,
        updatedAt: now
      }
    })

    return {
      code: 200,
      message: '核销成功',
      data: {
        orderId: orderId,
        orderNo: order.orderNo,
        productName: order.productName,
        quantity: order.quantity,
        verifiedAt: now,
        verifiedStaffName: staffName
      }
    }
  } catch (error) {
    console.error('商品核销失败:', error)
    return { code: 500, message: '服务器错误', data: null }
  }
}
```

- [ ] **Step 2: 部署并测试**

部署后测试。预期：对一个 status=paid、orderType=product 的订单调用后，status 变为 completed。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/verifyProduct/
git commit -m "$(cat <<'EOF'
feat: 新增 verifyProduct 云函数

商品订单一次性核销：校验订单类型、状态、有效期，更新为 completed。
EOF
)"
```

---

### Task 5: 修改 wechatPayCallback — 支持商品订单

**Files:**
- Modify: `cloudfunctions/wechatPayCallback/index.js`

- [ ] **Step 1: 修改支付回调，根据订单号前缀分流**

在 `wechatPayCallback/index.js` 中，找到「5. 生成核销码」和「6. 更新订单状态」部分（约第 87-99 行），替换为：

```javascript
    // 5. 根据订单类型处理
    const isProductOrder = order.orderNo && order.orderNo.startsWith('PROD')

    let updateData = {
      'payment.transactionId': transactionId || 'CALLBACK',
      'payment.paidAmount': Number(cashFee || totalFee) / 100 || 0,
      'payment.paidAt': paidAtDate,
      updatedAt: new Date()
    }

    if (isProductOrder && !order.needVerification) {
      // 商品订单 - 无需核销，直接完成
      updateData.status = 'completed'
      updateData.completedAt = new Date()
    } else {
      // 游船订单 或 需核销的商品订单 — 生成核销码
      const verificationCode = generateVerificationCode()
      updateData.status = 'paid'
      updateData.verificationCode = verificationCode
      console.log('🔑 核销码:', verificationCode)
    }

    // 商品订单：计算核销截止时间（如果尚未设置）
    if (isProductOrder && order.needVerification && !order.verificationDeadline && order.verificationDays) {
      updateData.verificationDeadline = new Date(paidAtDate.getTime() + (order.verificationDays || 15) * 24 * 60 * 60 * 1000)
    }

    // 6. 更新订单状态
    await db.collection('orders').doc(order._id).update({
      data: updateData
    })
```

- [ ] **Step 2: 验证原有游船订单回调不受影响**

检查逻辑：ORD 前缀订单 → isProductOrder=false → 走原有分支（生成核销码，status=paid）。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/wechatPayCallback/index.js
git commit -m "$(cat <<'EOF'
fix: wechatPayCallback 支持商品订单

根据订单号前缀 PROD 分流：无需核销的商品直接 completed，需核销的生成核销码。
游船订单（ORD 前缀）逻辑不变。
EOF
)"
```

---

### Task 6: 修改 scanCode — 支持商品核销

**Files:**
- Modify: `cloudfunctions/scanCode/index.js`

- [ ] **Step 1: 在 scanCode 中增加商品订单分流**

在 `scanCode/index.js` 中，找到查找订单后的 `if (order.status === 'paid')` 判断（约第 49 行），在它**前面**插入商品订单判断：

```javascript
    // 判断订单类型
    if (order.orderType === 'product') {
      // 商品订单核销
      if (order.status !== 'paid') {
        return {
          code: 10002,
          message: order.status === 'completed' ? '该订单已核销' : '订单状态不正确',
          data: null
        }
      }

      if (!order.needVerification) {
        return {
          code: 400,
          message: '该商品无需核销',
          data: null
        }
      }

      if (order.verificationDeadline && new Date() > new Date(order.verificationDeadline)) {
        return {
          code: 10004,
          message: '核销码已过期，请联系管理员处理',
          data: null
        }
      }

      return {
        code: 200,
        message: '扫码成功，请确认核销',
        data: {
          orderId: order._id,
          orderNo: order.orderNo,
          action: 'verify_product',
          productName: order.productName,
          projectName: order.projectName || '',
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          verificationDeadline: order.verificationDeadline,
          userNickname: user.nickname || user.nickName || '游客'
        }
      }
    }

    // 以下是原有的游船订单逻辑（不改）
```

- [ ] **Step 2: 验证游船订单扫码逻辑不受影响**

游船订单没有 orderType 字段（或为 undefined），不会进入 `order.orderType === 'product'` 分支，直接走原有 `if (order.status === 'paid')` 逻辑。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/scanCode/index.js
git commit -m "$(cat <<'EOF'
feat: scanCode 支持商品订单核销

扫码后判断 orderType，商品订单返回 action:verify_product。
游船订单走原有 start/end 逻辑，完全不变。
EOF
)"
```

---

### Task 7: 修改 wechatPay — 支持商品订单支付

**Files:**
- Modify: `cloudfunctions/wechatPay/index.js`

- [ ] **Step 1: 修改统一下单，适配商品订单**

在 `wechatPay/index.js` 中，修改商户订单号生成和商品描述逻辑。

找到第 62-65 行：
```javascript
    const outTradeNo = `BOAT${Date.now()}${Math.floor(Math.random() * 1000)}`
    const body = `${order.boatType.name}-${order.duration}小时`
```

替换为：
```javascript
    const isProductOrder = order.orderType === 'product'
    const outTradeNo = isProductOrder
      ? `PROD${Date.now()}${Math.floor(Math.random() * 1000)}`
      : `BOAT${Date.now()}${Math.floor(Math.random() * 1000)}`
    const body = isProductOrder
      ? `${order.productName}x${order.quantity}`
      : `${order.boatType ? order.boatType.name : '游船'}-游船租赁`
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/wechatPay/index.js
git commit -m "$(cat <<'EOF'
fix: wechatPay 适配商品订单

商品订单使用 PROD 前缀的商户订单号，商品描述使用商品名+数量。
EOF
)"
```

---

### Task 8: 修改 refundOrder — 支持商品订单退款

**Files:**
- Modify: `cloudfunctions/refundOrder/index.js`

- [ ] **Step 1: 在退款描述中适配商品订单**

在 `refundOrder/index.js` 中，找到余额退款的流水描述（约第 114 行）：

```javascript
            description: `订单退款（${order.boatType.name}）`,
```

替换为：
```javascript
            description: order.orderType === 'product'
              ? `订单退款（${order.productName}）`
              : `订单退款（${order.boatType.name}）`,
```

- [ ] **Step 2: 在退款成功后退回商品库存**

在余额退款的「更新订单状态为退款成功」之后（约第 132 行之后），添加库存退回逻辑：

```javascript
        // 商品订单退回库存
        if (order.orderType === 'product' && order.productId) {
          try {
            const { data: product } = await db.collection('products').doc(order.productId).get()
            if (product && product.stock > 0) {
              await db.collection('products').doc(order.productId).update({
                data: { soldCount: _.inc(-(order.quantity || 1)) }
              })
            }
          } catch (e) {
            console.warn('退回库存失败（非致命）:', e.message)
          }
        }
```

同样在微信支付退款成功后（约第 207 行之后）添加相同的库存退回代码。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/refundOrder/index.js
git commit -m "$(cat <<'EOF'
fix: refundOrder 支持商品订单退款

退款描述适配商品名，退款成功后退回商品库存（有限量时）。
EOF
)"
```

---

### Task 9: 修改 getOrderList — 支持 orderType 筛选

**Files:**
- Modify: `cloudfunctions/getOrderList/index.js`

- [ ] **Step 1: 增加 orderType 参数和商品订单字段返回**

在 `getOrderList/index.js` 中，修改入参和查询条件。

替换第 11 行：
```javascript
  const { page = 1, pageSize = 10 } = event
```
为：
```javascript
  const { page = 1, pageSize = 10, orderType } = event
```

在 where 条件（约第 18-21 行）中增加 orderType 筛选：
```javascript
    const whereCondition = {
      _openid: wxContext.OPENID,
      isDeleted: false
    }

    if (orderType === 'product') {
      whereCondition.orderType = 'product'
    } else if (orderType === 'boat') {
      const _ = db.command
      whereCondition.orderType = _.neq('product')
    }
```

修改格式化订单数据部分（约第 37-47 行），增加商品订单字段：
```javascript
    const result = orderList.map(order => ({
      orderId: order._id,
      orderNo: order.orderNo,
      orderType: order.orderType || 'boat',
      // 游船字段
      boatTypeName: order.boatType ? order.boatType.name : '',
      boatNumber: order.boat ? order.boat.number : '',
      // 商品字段
      productName: order.productName || '',
      projectName: order.projectName || '',
      quantity: order.quantity || 0,
      needVerification: order.needVerification || false,
      verificationDeadline: order.verificationDeadline || null,
      verifiedAt: order.verifiedAt || null,
      // 通用字段
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      finalAmount: order.settlement ? order.settlement.finalAmount : null,
      refundAmount: order.settlement ? order.settlement.refundAmount : null
    }))
```

注意：使用 `order.boatType ? order.boatType.name : ''` 防止商品订单没有 boatType 字段导致报错。将 `whereCondition` 替换原来直接写在 where 中的对象。

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/getOrderList/index.js
git commit -m "$(cat <<'EOF'
feat: getOrderList 支持 orderType 筛选

增加 orderType 参数（boat/product），返回数据兼容商品订单字段。
历史游船订单无 orderType 字段时默认归为 boat。
EOF
)"
```

---

### Task 10: 修改 adminApi — 支持项目/商品管理和订单类型筛选

**Files:**
- Modify: `cloudfunctions/adminApi/index.js`

- [ ] **Step 1: 添加 projects 和 products 到白名单**

在 `adminApi/index.js` 约第 46 行，`allowedCollections` 数组中增加两个集合：

```javascript
    const allowedCollections = [
      'boatTypes', 'boats', 'staff', 'banners',
      'announcements', 'pricingConfigs', 'app_settings',
      'orders', 'users', 'verificationLogs', 'recharge_plans',
      'projects', 'products'
    ]
```

- [ ] **Step 2: queryOrders 增加 orderType 筛选**

在 `case 'queryOrders'` 中，找到解构参数（约第 114 行），添加 `orderType`：

```javascript
        const { startDate, endDate, status, boatTypeCode, orderType, limit, skip } = data || {}
```

在 `whereCondition` 构建部分（boatTypeCode 筛选之后）添加：

```javascript
        if (orderType === 'product') {
          whereCondition.orderType = 'product'
        } else if (orderType === 'boat') {
          whereCondition.orderType = _.neq('product')
        }
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/adminApi/index.js
git commit -m "$(cat <<'EOF'
feat: adminApi 支持项目/商品集合和 orderType 筛选

白名单增加 projects/products，queryOrders 支持按 orderType 筛选。
EOF
)"
```

---

### Task 11: 用户端 — cloud.js 添加新接口封装

**Files:**
- Modify: `client-user/utils/cloud.js`

- [ ] **Step 1: 添加商品相关接口**

在 `client-user/utils/cloud.js` 中，`getOrderList` 函数之后、`module.exports` 之前添加：

```javascript
/**
 * 获取项目和商品列表
 */
function getProjects() {
  return callFunction('getProjects', {})
}

/**
 * 创建商品订单
 */
function createProductOrder(productId, quantity) {
  return callFunction('createProductOrder', { productId, quantity })
}

/**
 * 商品核销
 */
function verifyProduct(orderId, staffId) {
  return callFunction('verifyProduct', { orderId, staffId })
}
```

更新 `module.exports`：

```javascript
module.exports = {
  callFunction,
  getBoatTypes,
  createOrder,
  getOrderDetail,
  getOrderList,
  getProjects,
  createProductOrder,
  verifyProduct
}
```

- [ ] **Step 2: Commit**

```bash
git add client-user/utils/cloud.js
git commit -m "$(cat <<'EOF'
feat: cloud.js 添加商品相关接口封装

getProjects、createProductOrder、verifyProduct 三个新接口。
EOF
)"
```

---

### Task 12: 用户端 — 首页增加商品展示区

**Files:**
- Modify: `client-user/pages/index/index.js`
- Modify: `client-user/pages/index/index.wxml`
- Modify: `client-user/pages/index/index.wxss`

- [ ] **Step 1: index.js 增加项目数据加载**

在 data 中添加：
```javascript
    projects: [],
```

在 `onLoad()` 中添加：
```javascript
    this.loadProjects();
```

在 `onShow()` 的刷新块中添加：
```javascript
      this.loadProjects();
```

在 `onPullDownRefresh` 的 Promise.all 中添加 `this.loadProjects()`。

添加新方法（在 `loadBoatTypes` 方法之后）：

```javascript
  async loadProjects() {
    try {
      const res = await cloud.getProjects();
      this.setData({
        projects: res.data || []
      });
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  },

  goToProductDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?productId=${id}`
    });
  },
```

- [ ] **Step 2: index.wxml 增加项目商品区块**

在 `</view><!-- 船型列表结束 -->` 之后、空状态之前（约第 120 行之后），添加项目区块：

```xml
  <!-- 项目商品区 -->
  <block wx:for="{{projects}}" wx:key="_id" wx:for-item="project">
    <view class="section-header">
      <view class="section-title">{{project.name}}</view>
      <view class="section-desc">{{project.description}}</view>
      <view wx:if="{{project.openTime}}" class="section-time">
        营业时间：{{project.openTime}} - {{project.closeTime}}
      </view>
    </view>

    <view class="product-list">
      <view
        wx:for="{{project.products}}"
        wx:key="_id"
        wx:for-item="product"
        class="product-card"
        data-id="{{product._id}}"
        bindtap="goToProductDetail"
      >
        <image
          wx:if="{{product.imageUrl}}"
          class="product-image"
          src="{{product.imageUrl}}"
          mode="aspectFill"
        />
        <view class="product-info">
          <view class="product-name">{{product.name}}</view>
          <view class="product-desc">{{product.description}}</view>
          <view class="product-bottom">
            <view class="product-price">¥{{product.price}}</view>
            <view wx:if="{{product.stock > 0}}" class="product-stock">
              剩余{{product.stock - product.soldCount}}份
            </view>
          </view>
        </view>
      </view>
    </view>
  </block>
```

- [ ] **Step 3: index.wxss 增加商品卡片样式**

在 `index.wxss` 末尾追加：

```css
/* 项目区块 */
.section-header {
  padding: 40rpx 30rpx 20rpx;
  color: #ffffff;
}

.section-title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.section-desc {
  font-size: 26rpx;
  opacity: 0.85;
}

.section-time {
  font-size: 24rpx;
  opacity: 0.7;
  margin-top: 8rpx;
}

/* 商品列表 */
.product-list {
  padding: 0 20rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.product-card {
  width: 48%;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.product-card:active {
  transform: scale(0.98);
}

.product-image {
  width: 100%;
  height: 240rpx;
  background: #f5f5f5;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.product-desc {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 34rpx;
  font-weight: bold;
  color: #ff4444;
}

.product-stock {
  font-size: 22rpx;
  color: #999;
}
```

- [ ] **Step 4: 在微信开发者工具中预览首页效果**

确认：轮播图 + 公告 + 游船卡片 + 水上城堡区块（含 3 个已上架商品卡片）都正常渲染。

- [ ] **Step 5: Commit**

```bash
git add client-user/pages/index/index.js client-user/pages/index/index.wxml client-user/pages/index/index.wxss
git commit -m "$(cat <<'EOF'
feat: 首页增加项目商品展示区

在游船列表下方显示项目区块（水上城堡），以双列卡片展示商品。
EOF
)"
```

---

### Task 13: 用户端 — 新增商品详情页

**Files:**
- Create: `client-user/pages/product-detail/product-detail.js`
- Create: `client-user/pages/product-detail/product-detail.json`
- Create: `client-user/pages/product-detail/product-detail.wxml`
- Create: `client-user/pages/product-detail/product-detail.wxss`
- Modify: `client-user/app.json` (添加页面路径)

- [ ] **Step 1: 在 app.json pages 数组中添加路径**

在 `client-user/app.json` 的 `pages` 数组中（在 `"pages/recharge-logs/recharge-logs"` 之后）添加：

```json
    "pages/product-detail/product-detail",
    "pages/product-order/product-order",
```

- [ ] **Step 2: 创建商品详情页**

`product-detail.json`:
```json
{
  "navigationBarTitleText": "商品详情",
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-stepper": "@vant/weapp/stepper/index",
    "van-tag": "@vant/weapp/tag/index",
    "van-loading": "@vant/weapp/loading/index"
  }
}
```

`product-detail.js`:
```javascript
const cloud = require('../../utils/cloud');
const app = getApp();

Page({
  data: {
    product: null,
    quantity: 1,
    loading: true
  },

  onLoad(options) {
    const { productId } = options;
    if (productId) {
      this.loadProduct(productId);
    }
  },

  async loadProduct(productId) {
    try {
      const res = await cloud.getProjects();
      const projects = res.data || [];
      for (const project of projects) {
        const product = (project.products || []).find(p => p._id === productId);
        if (product) {
          product.projectName = project.name;
          this.setData({ product, loading: false });
          return;
        }
      }
      this.setData({ loading: false });
      wx.showToast({ title: '商品不存在', icon: 'none' });
    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({ loading: false });
    }
  },

  onQuantityChange(e) {
    this.setData({ quantity: e.detail });
  },

  async handleBuy() {
    const { product, quantity } = this.data;
    if (!product) return;

    try {
      wx.showLoading({ title: '创建订单中...' });
      const res = await cloud.createProductOrder(product._id, quantity);
      wx.hideLoading();

      if (res.code === 200) {
        wx.navigateTo({
          url: `/pages/payment/payment?orderId=${res.data.orderId}`
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建商品订单失败:', error);
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.product ? this.data.product.name : '景区商品',
      path: `/pages/product-detail/product-detail?productId=${this.data.product?._id}`
    };
  }
});
```

`product-detail.wxml`:
```xml
<view class="container">
  <van-loading wx:if="{{loading}}" size="48rpx" type="spinner" color="#1989fa" custom-class="loading">加载中...</van-loading>

  <block wx:if="{{!loading && product}}">
    <image
      wx:if="{{product.imageUrl}}"
      class="product-hero"
      src="{{product.imageUrl}}"
      mode="aspectFill"
    />

    <view class="info-card">
      <view class="product-name">{{product.name}}</view>
      <view wx:if="{{product.projectName}}" class="project-name">{{product.projectName}}</view>
      <view class="product-desc">{{product.description}}</view>

      <view class="price-row">
        <text class="price">¥{{product.price}}</text>
        <text wx:if="{{product.needVerification}}" class="verify-tag">需核销</text>
        <text wx:else class="verify-tag no-verify">购买即完成</text>
      </view>

      <view wx:if="{{product.stock > 0}}" class="stock-info">
        库存：剩余 {{product.stock - product.soldCount}} 份
      </view>

      <view wx:if="{{product.needVerification && product.verificationDays}}" class="deadline-info">
        购买后 {{product.verificationDays}} 天内有效
      </view>
    </view>

    <view class="action-card">
      <view class="quantity-row">
        <text class="label">购买数量</text>
        <van-stepper
          value="{{quantity}}"
          min="1"
          max="{{product.stock > 0 ? product.stock - product.soldCount : 99}}"
          bind:change="onQuantityChange"
        />
      </view>

      <view class="total-row">
        <text class="label">合计</text>
        <text class="total-price">¥{{(product.price * quantity).toFixed(2)}}</text>
      </view>

      <van-button
        type="primary"
        size="large"
        round
        custom-class="buy-button"
        bind:click="handleBuy"
      >
        立即购买
      </van-button>
    </view>
  </block>
</view>
```

`product-detail.wxss`:
```css
.container {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading {
  padding: 200rpx 0;
  text-align: center;
}

.product-hero {
  width: 100%;
  height: 500rpx;
}

.info-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.product-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.project-name {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.product-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.price {
  font-size: 48rpx;
  font-weight: bold;
  color: #ff4444;
}

.verify-tag {
  font-size: 22rpx;
  background: #e6f7ff;
  color: #1890ff;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.verify-tag.no-verify {
  background: #f6ffed;
  color: #52c41a;
}

.stock-info, .deadline-info {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.action-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.quantity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #eee;
}

.total-row .label, .quantity-row .label {
  font-size: 30rpx;
  color: #333;
}

.total-price {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff4444;
}

.buy-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
}
```

- [ ] **Step 3: 在微信开发者工具中预览商品详情页**

从首页点击商品卡片，确认跳转到详情页，显示商品信息、数量选择器、合计金额。

- [ ] **Step 4: Commit**

```bash
git add client-user/pages/product-detail/ client-user/app.json
git commit -m "$(cat <<'EOF'
feat: 新增商品详情页

展示商品信息、价格、库存、数量选择器、核销有效期提示，支持立即购买。
EOF
)"
```

---

### Task 14: 用户端 — 新增商品订单详情页

**Files:**
- Create: `client-user/pages/product-order/product-order.js`
- Create: `client-user/pages/product-order/product-order.json`
- Create: `client-user/pages/product-order/product-order.wxml`
- Create: `client-user/pages/product-order/product-order.wxss`

- [ ] **Step 1: 创建商品订单详情页**

`product-order.json`:
```json
{
  "navigationBarTitleText": "商品订单详情",
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-tag": "@vant/weapp/tag/index",
    "van-loading": "@vant/weapp/loading/index",
    "van-dialog": "@vant/weapp/dialog/index"
  }
}
```

`product-order.js`:
```javascript
const app = getApp();

Page({
  data: {
    order: null,
    loading: true,
    remainDays: 0
  },

  onLoad(options) {
    const { orderId } = options;
    if (orderId) {
      this.loadOrder(orderId);
    }
  },

  onShow() {
    if (this.data.order) {
      this.loadOrder(this.data.order._id);
    }
  },

  async loadOrder(orderId) {
    try {
      const { data: order } = await wx.cloud.database()
        .collection('orders')
        .doc(orderId)
        .get();

      let remainDays = 0;
      if (order.verificationDeadline && order.status === 'paid') {
        const deadline = new Date(order.verificationDeadline);
        const now = new Date();
        remainDays = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
      }

      this.setData({ order, loading: false, remainDays });
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
    }
  },

  async handleRefund() {
    const result = await wx.showModal({
      title: '确认退款？',
      content: `将退还 ¥${this.data.order.totalAmount.toFixed(2)}`,
      confirmText: '确认退款',
      confirmColor: '#f44336'
    });

    if (!result.confirm) return;

    try {
      wx.showLoading({ title: '退款中...', mask: true });
      const res = await wx.cloud.callFunction({
        name: 'refundOrder',
        data: { orderId: this.data.order._id, reason: '用户申请退款' }
      });
      wx.hideLoading();

      if (res.result.code === 200) {
        wx.showToast({ title: '退款成功', icon: 'success' });
        setTimeout(() => this.loadOrder(this.data.order._id), 1500);
      } else {
        wx.showToast({ title: res.result.message || '退款失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '退款失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.order ? `${this.data.order.productName} - 订单详情` : '商品订单',
      path: '/pages/index/index'
    };
  }
});
```

`product-order.wxml`:
```xml
<wxs module="filters" src="../../utils/filters.wxs"></wxs>
<view class="container">
  <van-loading wx:if="{{loading}}" size="48rpx" type="spinner" color="#1989fa" custom-class="loading">加载中...</van-loading>

  <block wx:if="{{!loading && order}}">
    <!-- 状态卡片 -->
    <view class="status-card status-{{order.status}}">
      <view class="status-text">{{filters.getOrderStatusText(order.status)}}</view>
      <view wx:if="{{order.status === 'paid' && order.needVerification}}" class="status-sub">
        核销码有效期剩余 {{remainDays}} 天
      </view>
    </view>

    <!-- 核销码（已支付且需核销） -->
    <view wx:if="{{order.status === 'paid' && order.needVerification && order.verificationCode}}" class="code-card">
      <view class="code-label">核销码</view>
      <view class="code-value">{{order.verificationCode}}</view>
      <view class="code-tip">请出示此核销码给工作人员扫码</view>
    </view>

    <!-- 已核销信息 -->
    <view wx:if="{{order.status === 'completed' && order.verifiedAt}}" class="verified-card">
      <view class="verified-title">已核销</view>
      <view class="verified-info">核销时间：{{filters.formatTime(order.verifiedAt)}}</view>
      <view wx:if="{{order.verifiedStaffName}}" class="verified-info">核销员工：{{order.verifiedStaffName}}</view>
    </view>

    <!-- 无需核销 -->
    <view wx:if="{{order.status === 'completed' && !order.needVerification}}" class="verified-card">
      <view class="verified-title">交易完成</view>
    </view>

    <!-- 订单信息 -->
    <view class="info-card">
      <view class="info-title">订单信息</view>
      <view class="info-row">
        <text class="label">订单号</text>
        <text class="value">{{order.orderNo}}</text>
      </view>
      <view class="info-row">
        <text class="label">商品</text>
        <text class="value">{{order.productName}}</text>
      </view>
      <view wx:if="{{order.projectName}}" class="info-row">
        <text class="label">所属项目</text>
        <text class="value">{{order.projectName}}</text>
      </view>
      <view class="info-row">
        <text class="label">数量</text>
        <text class="value">{{order.quantity}}</text>
      </view>
      <view class="info-row">
        <text class="label">单价</text>
        <text class="value">¥{{filters.formatMoney(order.productPrice)}}</text>
      </view>
      <view class="info-row">
        <text class="label">订单金额</text>
        <text class="value price">¥{{filters.formatMoney(order.totalAmount)}}</text>
      </view>
      <view class="info-row">
        <text class="label">下单时间</text>
        <text class="value">{{filters.formatTime(order.createdAt)}}</text>
      </view>
      <view wx:if="{{order.verificationDeadline && order.needVerification}}" class="info-row">
        <text class="label">核销截止</text>
        <text class="value">{{filters.formatTime(order.verificationDeadline)}}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view wx:if="{{order.status === 'paid'}}" class="action-area">
      <van-button
        type="danger"
        size="large"
        plain
        round
        bind:click="handleRefund"
      >
        申请退款
      </van-button>
    </view>
  </block>
  <van-dialog id="van-dialog" />
</view>
```

`product-order.wxss`:
```css
.container { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.loading { padding: 200rpx 0; text-align: center; }

.status-card {
  padding: 40rpx 32rpx;
  color: #fff;
}
.status-card.status-paid { background: linear-gradient(135deg, #2196f3, #1976d2); }
.status-card.status-completed { background: linear-gradient(135deg, #4caf50, #388e3c); }
.status-card.status-refunded { background: linear-gradient(135deg, #ff5722, #d84315); }
.status-card.status-pending { background: linear-gradient(135deg, #ff9800, #f57c00); }
.status-text { font-size: 40rpx; font-weight: bold; }
.status-sub { font-size: 26rpx; opacity: 0.85; margin-top: 8rpx; }

.code-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
}
.code-label { font-size: 28rpx; color: #999; margin-bottom: 16rpx; }
.code-value {
  font-size: 72rpx;
  font-weight: bold;
  color: #333;
  letter-spacing: 16rpx;
  margin-bottom: 16rpx;
}
.code-tip { font-size: 24rpx; color: #999; }

.verified-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
}
.verified-title { font-size: 36rpx; font-weight: bold; color: #4caf50; margin-bottom: 16rpx; }
.verified-info { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }

.info-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}
.info-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.info-row:last-child { border-bottom: none; }
.info-row .label { font-size: 28rpx; color: #999; }
.info-row .value { font-size: 28rpx; color: #333; }
.info-row .value.price { color: #ff4444; font-weight: bold; }

.action-area { padding: 40rpx 32rpx; }
```

- [ ] **Step 2: 在微信开发者工具中预览**

- [ ] **Step 3: Commit**

```bash
git add client-user/pages/product-order/
git commit -m "$(cat <<'EOF'
feat: 新增商品订单详情页

显示核销码（大字）、有效期倒计时、订单信息、申请退款按钮。
无需核销的商品显示"交易完成"。
EOF
)"
```

---

### Task 15: 用户端 — 修改订单列表支持商品订单

**Files:**
- Modify: `client-user/pages/order-list/order-list.js`
- Modify: `client-user/pages/order-list/order-list.wxml`
- Modify: `client-user/pages/order-list/order-list.wxss`

- [ ] **Step 1: order-list.js 增加 Tab 切换**

在 data 中添加：
```javascript
    activeTab: 'boat',  // 'boat' | 'product'
```

修改 `loadOrderList` 方法，在 `cloud.getOrderList` 调用中传入 orderType：
```javascript
      const res = await cloud.getOrderList(this.data.page, this.data.pageSize, null, this.data.activeTab);
```

同时修改 cloud.js 中的 `getOrderList` 函数签名（在 Task 11 中已导出）：
```javascript
function getOrderList(page = 1, pageSize = 10, status = null, orderType = null) {
  return callFunction('getOrderList', { page, pageSize, status, orderType })
}
```

添加 Tab 切换方法：
```javascript
  onTabChange(e) {
    this.setData({
      activeTab: e.detail.name || e.detail,
      page: 1,
      hasMore: true,
      orders: []
    });
    this.loadOrderList();
  },
```

修改 `gotoOrderDetail` 方法，商品订单跳转到商品订单详情页：
```javascript
  gotoOrderDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'product') {
      wx.navigateTo({
        url: `/pages/product-order/product-order?orderId=${id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?orderId=${id}`
      });
    }
  },
```

- [ ] **Step 2: order-list.wxml 增加 Tab 和商品订单卡片**

在订单列表容器顶部添加 Tab：
```xml
  <!-- Tab 切换 -->
  <van-tabs active="{{activeTab}}" bind:change="onTabChange" color="#1989fa">
    <van-tab title="游船订单" name="boat"></van-tab>
    <van-tab title="商品订单" name="product"></van-tab>
  </van-tabs>
```

修改订单卡片，根据 orderType 展示不同内容。在 `order-item` 的 bindtap 中传递 type：
```xml
      data-type="{{item.orderType || 'boat'}}"
```

修改订单内容部分：
```xml
      <!-- 订单内容 -->
      <view class="order-content">
        <view class="boat-info">
          <view wx:if="{{item.orderType === 'product'}}" class="boat-type">
            <van-tag plain type="primary" custom-class="order-type-tag">商品</van-tag>
            {{item.productName}} ×{{item.quantity}}
          </view>
          <view wx:else class="boat-type">{{item.boatTypeName}}</view>
          <view wx:if="{{item.boatNumber}}" class="boat-number">船号：{{item.boatNumber}}</view>
        </view>

        <view class="order-amount">
          <text class="label">订单金额</text>
          <text class="value">¥{{filters.formatMoney(item.totalAmount)}}</text>
        </view>
      </view>
```

- [ ] **Step 3: 在微信开发者工具中预览**

切换 Tab 确认游船订单和商品订单分别显示。点击商品订单跳转到 product-order 页面。

- [ ] **Step 4: Commit**

```bash
git add client-user/pages/order-list/ client-user/utils/cloud.js
git commit -m "$(cat <<'EOF'
feat: 订单列表支持 Tab 切换游船/商品订单

增加顶部 Tab，商品订单显示商品名+数量，点击跳转商品订单详情页。
EOF
)"
```

---

### Task 16: 用户端 — 修改支付页面支持商品订单

**Files:**
- Modify: `client-user/pages/payment/payment.js`
- Modify: `client-user/pages/payment/payment.wxml`

- [ ] **Step 1: 支付成功后根据订单类型跳转不同详情页**

在 `payment.js` 中，微信支付成功回调（约第 299 行）和余额支付成功回调（约第 226 行）中，将跳转逻辑改为：

```javascript
            const detailPage = this.data.order.orderType === 'product'
              ? '/pages/product-order/product-order'
              : '/pages/order-detail/order-detail'
            wx.redirectTo({
              url: `${detailPage}?orderId=${this.data.order._id}`
            })
```

- [ ] **Step 2: Commit**

```bash
git add client-user/pages/payment/payment.js
git commit -m "$(cat <<'EOF'
fix: 支付成功后根据订单类型跳转对应详情页

商品订单跳转 product-order，游船订单跳转 order-detail。
EOF
)"
```

---

### Task 17: 员工端 — 扫码页支持商品核销

**Files:**
- Modify: `client-staff/pages/scan/scan.js`

- [ ] **Step 1: processScan 中增加商品核销分流**

在 `scan.js` 的 `processScan` 方法中，在 `if (data.action === 'start')` 之前添加商品核销分支：

```javascript
      if (data.action === 'verify_product') {
        this.showProductVerify(data);
      } else if (data.action === 'start') {
```

添加新方法：

```javascript
  showProductVerify(data) {
    const deadlineStr = data.verificationDeadline
      ? `\n有效期至：${util.formatTime(data.verificationDeadline)}`
      : '';

    wx.showModal({
      title: '🎫 商品核销确认',
      content: `商品：${data.productName}\n数量：${data.quantity}\n金额：¥${Number(data.totalAmount).toFixed(2)}${deadlineStr}`,
      confirmText: '确认核销',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          this.doVerifyProduct(data.orderId);
        }
      }
    });
  },

  async doVerifyProduct(orderId) {
    try {
      wx.showLoading({ title: '核销中...' });
      const staffInfo = app.getStaffInfo();
      await cloud.verifyProduct(orderId, staffInfo?._id || staffInfo?.id);
      wx.hideLoading();
      util.playSuccessSound();

      wx.showToast({
        title: '✅ 核销成功',
        icon: 'success',
        duration: 2000
      });

      this.setData({ lastScanResult: null });
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('商品核销失败:', error);
    }
  },
```

- [ ] **Step 2: 员工端 cloud.js 添加 verifyProduct**

检查 `client-staff/utils/cloud.js` 是否存在，添加 verifyProduct 封装。如果员工端直接用 `wx.cloud.callFunction`，则在 `doVerifyProduct` 中直接调用即可：

```javascript
  async doVerifyProduct(orderId) {
    try {
      wx.showLoading({ title: '核销中...' });
      const staffInfo = app.getStaffInfo();
      const res = await wx.cloud.callFunction({
        name: 'verifyProduct',
        data: { orderId, staffId: staffInfo?._id || staffInfo?.id }
      });
      wx.hideLoading();

      if (res.result.code === 200) {
        util.playSuccessSound();
        wx.showToast({ title: '✅ 核销成功', icon: 'success', duration: 2000 });
        this.setData({ lastScanResult: null });
      } else {
        util.playErrorSound();
        wx.showToast({ title: res.result.message || '核销失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      util.playErrorSound();
      console.error('商品核销失败:', error);
      wx.showToast({ title: '核销失败', icon: 'none' });
    }
  },
```

- [ ] **Step 3: 在微信开发者工具中测试扫码流程**

- [ ] **Step 4: Commit**

```bash
git add client-staff/pages/scan/scan.js
git commit -m "$(cat <<'EOF'
feat: 员工端扫码支持商品核销

扫码后识别 action:verify_product，显示商品核销确认卡片，一键核销。
游船发船/收船流程不变。
EOF
)"
```

---

### Task 18: 后台 admin-web — 新增项目管理和商品管理菜单

**Files:**
- Modify: `admin-web/index.html`

- [ ] **Step 1: 菜单列表中添加项目管理和商品管理**

在 `admin-web/index.html` 中找到 menus 数组（约第 1400 行），在 `pricingConfigs` 和 `recharge_plans` 之间插入两项：

```javascript
            { key: 'projects', label: '项目管理', icon: '🏰' },
            { key: 'productsMgmt', label: '商品管理', icon: '🎫' },
```

- [ ] **Step 2: 添加项目管理和商品管理的数据变量**

在 data 部分（约第 1440 行附近）添加：

```javascript
          // 项目管理
          projectsData: [],
          projectsTotal: 0,
          projectDialogVisible: false,
          projectForm: { name: '', description: '', imageUrl: '', openTime: '09:00', closeTime: '19:00' },
          editingProjectId: null,

          // 商品管理
          productsMgmtData: [],
          productsMgmtTotal: 0,
          productDialogVisible: false,
          productForm: { projectId: '', name: '', description: '', imageUrl: '', price: 0, needVerification: true, verificationDays: 15, stock: 0 },
          editingProductId: null,
          productFilterProjectId: '',
```

- [ ] **Step 3: 添加项目管理页面模板**

在 `index.html` 中找到 `<div v-if="currentMenu === 'settings'">` 之前，添加项目管理和商品管理的模板。内容较多，这里提供完整的模板块。

项目管理模板（在 `v-if="currentMenu === 'recharge_plans'"` 的 div 之后）：

```html
          <!-- 项目管理 -->
          <div v-if="currentMenu === 'projects'">
            <div class="page-header">
              <h2 class="page-title">项目管理</h2>
              <el-button type="primary" @click="showProjectDialog()">新增项目</el-button>
            </div>
            <div class="data-table">
              <el-table :data="projectsData" stripe>
                <el-table-column prop="name" label="项目名称" />
                <el-table-column prop="description" label="描述" />
                <el-table-column label="营业时间" width="160">
                  <template #default="scope">
                    {{scope.row.openTime}} - {{scope.row.closeTime}}
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="scope">
                    <el-switch v-model="scope.row.enabled" @change="toggleProjectEnabled(scope.row)" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160">
                  <template #default="scope">
                    <el-button size="small" @click="showProjectDialog(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deleteProject(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <el-dialog :title="editingProjectId ? '编辑项目' : '新增项目'" v-model="projectDialogVisible" width="500px">
              <el-form :model="projectForm" label-width="100px">
                <el-form-item label="项目名称">
                  <el-input v-model="projectForm.name" placeholder="如：水上城堡" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="projectForm.description" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="图片URL">
                  <el-input v-model="projectForm.imageUrl" placeholder="可选" />
                </el-form-item>
                <el-form-item label="开始时间">
                  <el-input v-model="projectForm.openTime" placeholder="09:00" />
                </el-form-item>
                <el-form-item label="结束时间">
                  <el-input v-model="projectForm.closeTime" placeholder="19:00" />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="projectDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveProject">保存</el-button>
              </template>
            </el-dialog>
          </div>

          <!-- 商品管理 -->
          <div v-if="currentMenu === 'productsMgmt'">
            <div class="page-header">
              <h2 class="page-title">商品管理</h2>
              <div style="display:flex;gap:10px;">
                <el-select v-model="productFilterProjectId" placeholder="选择项目" clearable @change="loadProductsMgmt" style="width:200px">
                  <el-option v-for="p in projectsData" :key="p._id" :label="p.name" :value="p._id" />
                </el-select>
                <el-button type="primary" @click="showProductDialog()">新增商品</el-button>
              </div>
            </div>
            <div class="data-table">
              <el-table :data="productsMgmtData" stripe>
                <el-table-column prop="name" label="商品名称" />
                <el-table-column label="价格" width="100">
                  <template #default="scope">¥{{scope.row.price}}</template>
                </el-table-column>
                <el-table-column label="库存" width="100">
                  <template #default="scope">
                    {{scope.row.stock === 0 ? '不限' : scope.row.stock}}
                  </template>
                </el-table-column>
                <el-table-column prop="soldCount" label="已售" width="80" />
                <el-table-column label="需核销" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.needVerification ? 'primary' : 'info'" size="small">
                      {{scope.row.needVerification ? '是' : '否'}}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="上下架" width="80">
                  <template #default="scope">
                    <el-switch v-model="scope.row.enabled" @change="toggleProductEnabled(scope.row)" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160">
                  <template #default="scope">
                    <el-button size="small" @click="showProductDialog(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deleteProduct(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <el-dialog :title="editingProductId ? '编辑商品' : '新增商品'" v-model="productDialogVisible" width="500px">
              <el-form :model="productForm" label-width="100px">
                <el-form-item label="所属项目">
                  <el-select v-model="productForm.projectId" placeholder="选择项目" style="width:100%">
                    <el-option v-for="p in projectsData" :key="p._id" :label="p.name" :value="p._id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="商品名称">
                  <el-input v-model="productForm.name" placeholder="如：单人儿童票" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="productForm.description" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="价格">
                  <el-input-number v-model="productForm.price" :min="0" :precision="1" :step="1" />
                </el-form-item>
                <el-form-item label="需要核销">
                  <el-switch v-model="productForm.needVerification" />
                </el-form-item>
                <el-form-item v-if="productForm.needVerification" label="核销有效天数">
                  <el-input-number v-model="productForm.verificationDays" :min="1" :max="365" />
                </el-form-item>
                <el-form-item label="库存（0=不限）">
                  <el-input-number v-model="productForm.stock" :min="0" />
                </el-form-item>
                <el-form-item label="图片URL">
                  <el-input v-model="productForm.imageUrl" placeholder="可选" />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="productDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveProduct">保存</el-button>
              </template>
            </el-dialog>
          </div>
```

- [ ] **Step 4: 添加项目管理和商品管理的 methods**

在 methods 部分添加以下方法（在文件中搜索现有的 `loadSettings` 等方法附近）：

```javascript
          // === 项目管理 ===
          async loadProjects() {
            const res = await this.callAdminApi('query', 'projects', {
              orderBy: { field: 'sort', direction: 'asc' }
            });
            if (res.code === 200) {
              this.projectsData = res.data;
              this.projectsTotal = res.total;
            }
          },

          showProjectDialog(row) {
            if (row) {
              this.editingProjectId = row._id;
              this.projectForm = { name: row.name, description: row.description || '', imageUrl: row.imageUrl || '', openTime: row.openTime || '09:00', closeTime: row.closeTime || '19:00' };
            } else {
              this.editingProjectId = null;
              this.projectForm = { name: '', description: '', imageUrl: '', openTime: '09:00', closeTime: '19:00' };
            }
            this.projectDialogVisible = true;
          },

          async saveProject() {
            const data = { ...this.projectForm, sort: Date.now(), enabled: true };
            if (this.editingProjectId) {
              await this.callAdminApi('update', 'projects', data, this.editingProjectId);
            } else {
              await this.callAdminApi('add', 'projects', data);
            }
            this.projectDialogVisible = false;
            this.loadProjects();
          },

          async toggleProjectEnabled(row) {
            await this.callAdminApi('update', 'projects', { enabled: row.enabled }, row._id);
          },

          async deleteProject(row) {
            await ElMessageBox.confirm('确定删除该项目？', '警告', { type: 'warning' });
            await this.callAdminApi('remove', 'projects', {}, row._id);
            this.loadProjects();
          },

          // === 商品管理 ===
          async loadProductsMgmt() {
            const where = {};
            if (this.productFilterProjectId) {
              where.projectId = this.productFilterProjectId;
            }
            const res = await this.callAdminApi('query', 'products', {
              where,
              orderBy: { field: 'sort', direction: 'asc' }
            });
            if (res.code === 200) {
              this.productsMgmtData = res.data;
              this.productsMgmtTotal = res.total;
            }
          },

          showProductDialog(row) {
            if (row) {
              this.editingProductId = row._id;
              this.productForm = {
                projectId: row.projectId, name: row.name, description: row.description || '',
                imageUrl: row.imageUrl || '', price: row.price, needVerification: row.needVerification,
                verificationDays: row.verificationDays || 15, stock: row.stock || 0
              };
            } else {
              this.editingProductId = null;
              this.productForm = {
                projectId: this.productFilterProjectId || '', name: '', description: '',
                imageUrl: '', price: 0, needVerification: true, verificationDays: 15, stock: 0
              };
            }
            this.productDialogVisible = true;
          },

          async saveProduct() {
            const data = { ...this.productForm, sort: Date.now(), enabled: true, soldCount: 0 };
            if (this.editingProductId) {
              delete data.soldCount;
              await this.callAdminApi('update', 'products', data, this.editingProductId);
            } else {
              await this.callAdminApi('add', 'products', data);
            }
            this.productDialogVisible = false;
            this.loadProductsMgmt();
          },

          async toggleProductEnabled(row) {
            await this.callAdminApi('update', 'products', { enabled: row.enabled }, row._id);
          },

          async deleteProduct(row) {
            await ElMessageBox.confirm('确定删除该商品？', '警告', { type: 'warning' });
            await this.callAdminApi('remove', 'products', {}, row._id);
            this.loadProductsMgmt();
          },
```

- [ ] **Step 5: 菜单切换时加载对应数据**

在菜单切换方法中（搜索 `switchMenu` 或者 `currentMenu` 赋值的地方），添加项目和商品的数据加载：

```javascript
          if (key === 'projects') {
            this.loadProjects();
          } else if (key === 'productsMgmt') {
            this.loadProjects();  // 商品管理也需要项目列表做筛选
            this.loadProductsMgmt();
          }
```

- [ ] **Step 6: 在浏览器中测试后台项目/商品管理**

- [ ] **Step 7: Commit**

```bash
git add admin-web/index.html
git commit -m "$(cat <<'EOF'
feat: 后台新增项目管理和商品管理

项目 CRUD + 商品 CRUD（含上下架、是否需核销、库存、核销有效天数配置）。
EOF
)"
```

---

### Task 19: 后台 admin-web — 订单管理增加类型筛选和 Excel 导出

**Files:**
- Modify: `admin-web/index.html`

- [ ] **Step 1: 订单管理筛选条件增加订单类型**

在订单管理的筛选区域（搜索 `orderFilter`），添加订单类型下拉：

在 `orderFilter` 数据中添加：
```javascript
          orderFilter: {
            dateRange: [],
            status: '',
            boatTypeCode: '',
            orderType: ''  // 新增
          },
```

在模板的筛选区域追加：
```html
                <el-select v-model="orderFilter.orderType" placeholder="订单类型" clearable @change="loadOrders" style="width:140px">
                  <el-option label="全部" value="" />
                  <el-option label="游船订单" value="boat" />
                  <el-option label="商品订单" value="product" />
                </el-select>
```

在 `loadOrders` 方法中，将 `orderType` 传入 queryOrders：
```javascript
            if (this.orderFilter.orderType) {
              queryData.orderType = this.orderFilter.orderType;
            }
```

- [ ] **Step 2: 订单表格适配商品订单列**

在订单表格中，将「船型」列改为自适应显示：

```html
                <el-table-column label="类型/名称" width="150">
                  <template #default="scope">
                    <el-tag v-if="scope.row.orderType === 'product'" size="small" type="warning">商品</el-tag>
                    <el-tag v-else size="small">游船</el-tag>
                    <span style="margin-left:5px">
                      {{scope.row.orderType === 'product' ? scope.row.productName : (scope.row.boatType ? scope.row.boatType.name : '')}}
                    </span>
                  </template>
                </el-table-column>
```

- [ ] **Step 3: 添加 Excel 导出按钮和逻辑**

在订单管理的 page-header 区域，筛选按钮旁添加导出按钮：
```html
                <el-button type="success" @click="exportOrders">导出Excel</el-button>
```

在 `<head>` 中引入 SheetJS 库（在 Element Plus JS 之后）：
```html
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

添加导出方法：

```javascript
          async exportOrders() {
            ElMessage.info('正在导出，请稍候...');

            let allOrders = [];
            let skip = 0;
            let hasMore = true;

            while (hasMore) {
              const queryData = { limit: 1000, skip };
              if (this.orderFilter.dateRange && this.orderFilter.dateRange.length === 2) {
                queryData.startDate = this.orderFilter.dateRange[0];
                queryData.endDate = this.orderFilter.dateRange[1];
              }
              if (this.orderFilter.status) queryData.status = this.orderFilter.status;
              if (this.orderFilter.boatTypeCode) queryData.boatTypeCode = this.orderFilter.boatTypeCode;
              if (this.orderFilter.orderType) queryData.orderType = this.orderFilter.orderType;

              const res = await this.callAdminApi('queryOrders', null, queryData);
              if (res.code === 200) {
                allOrders = allOrders.concat(res.data);
                hasMore = res.data.length === 1000;
                skip += 1000;
              } else {
                hasMore = false;
              }
            }

            if (allOrders.length === 0) {
              ElMessage.warning('没有可导出的订单');
              return;
            }

            const rows = allOrders.map(o => ({
              '订单号': o.orderNo,
              '类型': o.orderType === 'product' ? '商品' : '游船',
              '名称': o.orderType === 'product' ? o.productName : (o.boatType ? o.boatType.name : ''),
              '船号': o.boat ? o.boat.number : '',
              '数量': o.quantity || 1,
              '订单金额': o.totalAmount,
              '结算金额': o.settlement ? o.settlement.finalAmount : '',
              '退款金额': o.refundAmount || '',
              '支付方式': o.payment ? (o.payment.method === 'balance' ? '余额' : '微信') : '',
              '状态': { pending: '待支付', paid: '待核销', timing: '计时中', completed: '已完成', refunded: '已退款' }[o.status] || o.status,
              '创建时间': o.createdAt ? new Date(o.createdAt).toLocaleString('zh-CN') : ''
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '订单数据');
            XLSX.writeFile(wb, `订单导出_${new Date().toISOString().slice(0, 10)}.xlsx`);

            ElMessage.success(`成功导出 ${allOrders.length} 条订单`);
          },
```

- [ ] **Step 4: 在浏览器中测试导出功能**

- [ ] **Step 5: Commit**

```bash
git add admin-web/index.html
git commit -m "$(cat <<'EOF'
feat: 后台订单管理增加类型筛选和 Excel 导出

筛选条件新增订单类型（全部/游船/商品），表格列适配商品订单。
新增「导出 Excel」按钮，使用 SheetJS 前端生成 xlsx 文件下载。
EOF
)"
```

---

### Task 20: 最终验证和 CLAUDE.md 进度更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 端到端验证核心流程**

在微信开发者工具中完整走一遍：
1. 用户端首页看到水上城堡项目和商品
2. 点击商品 → 商品详情 → 选数量 → 立即购买 → 支付页面
3. 支付后跳转商品订单详情，显示核销码
4. 员工端扫码 → 显示商品核销确认 → 确认核销
5. 订单列表 Tab 切换正常
6. 后台项目管理/商品管理 CRUD 正常
7. 后台订单导出 Excel 正常

- [ ] **Step 2: 更新 CLAUDE.md 进度**

```markdown
## 实时进度

> 更新于 2026-05-26

- **2026-05-26**：完成商品销售功能 + 订单导出
  - 新增 projects/products 两个数据集合
  - 新增 getProjects/createProductOrder/verifyProduct 三个云函数
  - 修改 wechatPayCallback/scanCode/refundOrder/wechatPay/getOrderList/adminApi 六个云函数
  - 用户端：首页商品展示、商品详情页、商品订单详情页、订单列表 Tab 切换
  - 员工端：扫码支持商品一次性核销
  - 后台：项目管理、商品管理、订单类型筛选、Excel 导出
- **下一步**：部署云函数 + 小程序端上传 + 提交审核（注意 rechargeEnabled=false）
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: 更新进度 — 商品销售功能和订单导出完成
EOF
)"
```

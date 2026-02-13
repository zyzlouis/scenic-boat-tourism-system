# CMS适配方案修复说明

**日期**：2026-02-12
**状态**：✅ 第一部分已完成

---

## 修复内容总结

### ✅ 问题1：撤销 orders 集合的扁平化修改

**修复内容**：
- ✅ 还原 `createOrder` 云函数 - orders 保持嵌套结构（boatType、pricing、timing、settlement、payment）
- ✅ 还原 `scanCode` 云函数 - 访问嵌套字段（order.boatType.name、order.pricing.basePrice 等）
- ✅ 还原 `startTrip` 云函数 - 更新嵌套字段（'boat.id'、'timing.startTime' 等）
- ✅ 还原 `endTrip` 云函数 - 更新和读取嵌套字段
- ✅ 取消对其他6个查询云函数的修改计划
- ✅ 取消对小程序页面的修改计划

**关键理解**：
- orders 集合在 CMS 中设为**只读展示**，不需要编辑
- CMS 可以展示嵌套对象的数据，只是不方便编辑，但我们本来就不需要编辑订单
- 保持嵌套结构避免了大量代码修改，减少引入bug的风险

**orders 数据结构示例**：
```javascript
{
  _id: "order_id",
  orderNo: "ORD20260212...",
  boatType: {
    id: "boat_type_id",
    code: "DOUBLE",
    name: "双人船"
  },
  pricing: {
    basePrice: 50,
    depositAmount: 100,
    includedMinutes: 60,
    overtimeRate: 1
  },
  timing: {
    startTime: Date,
    endTime: Date,
    usedMinutes: 0,
    overtimeFee: 0
  },
  // ... 其他嵌套对象
  isDeleted: false,  // 保持原字段名
  createdAt: Date,
  updatedAt: Date
}
```

---

### ✅ 问题2：员工密码管理方案

**修复内容**：
- ✅ 创建云函数 `manageStaff`
- ✅ 支持4种操作：
  - `create` - 新增员工（自动加密密码）
  - `resetPassword` - 重置密码（自动加密密码）
  - `update` - 更新员工信息（不包括密码）
  - `disable` - 禁用员工

**云函数位置**：
- `cloudfunctions/manageStaff/index.js`
- `cloudfunctions/manageStaff/package.json`

**使用方法**：

```javascript
// 新增员工
wx.cloud.callFunction({
  name: 'manageStaff',
  data: {
    action: 'create',
    staffData: {
      username: 'staff03',
      password: '123456',  // 明文密码，云函数内部自动加密
      realName: '王五',
      phone: '13900139003',
      role: 'staff'
    }
  }
})

// 重置密码
wx.cloud.callFunction({
  name: 'manageStaff',
  data: {
    action: 'resetPassword',
    staffId: 'staff_id',
    staffData: {
      password: 'new_password'  // 明文密码，云函数内部自动加密
    }
  }
})
```

**CMS 配置**：
- staff 集合的 `password` 字段设置为**隐藏**
- 运营人员在 CMS 中看不到密码字段
- 新增和修改员工统一通过云函数处理

**下一步**：
- 可在管理员端（员工端小程序）提供"新增员工/重置密码"的入口
- 调用 `manageStaff` 云函数

---

### ✅ 问题3：boatTypes 的 code 字段只读

**说明**：
- pricingConfigs 和 boats 集合使用 `boatTypeCode` 关联船型
- 如果运营人员误改了 `code` 字段，所有关联关系就断了

**解决方案**：
1. 在 CMS 配置中，将 boatTypes 集合的 `code` 字段设为**不可编辑**（只读）
2. 如果 CMS 不支持单个字段设为只读，在字段描述中明确注明：
   - "⚠️ 此字段为系统标识，请勿修改，否则会导致价格配置和船只关联失效"
3. 在 boatTypes 模型配置的说明中也加上此提醒

**CMS 配置时需注意**：
- code 字段设为只读或添加明显警告
- 建议在 CMS 配置说明文档中特别强调

---

### ✅ 问题4：新增3个运营内容集合

**新增集合**：

#### 4.1 banners（轮播图/广告位）

**用途**：首页轮播图管理

**字段结构**（扁平）：
```javascript
{
  _id: "banner_001",
  title: "春节特惠活动",          // 单行字符串
  imageUrl: "cloud://...",       // 图片
  linkType: "none",              // 枚举：none/page/web
  linkUrl: "",                   // 单行字符串
  sort: 1,                       // 数字
  enabled: true,                 // 布尔值
  createdAt: Date,
  updatedAt: Date
}
```

**测试数据**：`test-data/banners.json`（3个轮播图）

#### 4.2 announcements（公告通知）

**用途**：公告管理，支持首页弹窗显示

**字段结构**（扁平）：
```javascript
{
  _id: "announcement_001",
  title: "今日因暴雨暂停运营",     // 单行字符串
  content: "尊敬的游客...",        // 多行字符串/富文本
  type: "warning",               // 枚举：info/warning/urgent
  showOnHome: true,              // 布尔值
  startDate: Date,               // 日期
  endDate: Date,                 // 日期
  sort: 1,                       // 数字
  enabled: true,                 // 布尔值
  createdAt: Date,
  updatedAt: Date
}
```

**测试数据**：`test-data/announcements.json`（3条公告）

#### 4.3 app_settings（基础设置）

**用途**：景区基础信息配置

**特点**：只有1条记录，`_id` 固定为 `global_settings`

**字段结构**（扁平）：
```javascript
{
  _id: "global_settings",
  scenicName: "云湖景区",          // 单行字符串
  contactPhone: "0571-88888888",  // 单行字符串
  openTime: "08:00",              // 单行字符串
  closeTime: "18:00",             // 单行字符串
  refundRules: "退款说明...",      // 多行字符串
  safetyNotice: "安全须知...",     // 多行字符串
  aboutUs: "景区介绍...",          // 多行字符串/富文本
  logoUrl: "cloud://...",         // 图片
  enabled: true,                  // 布尔值
  sort: 1,
  createdAt: Date,
  updatedAt: Date
}
```

**测试数据**：`test-data/app_settings.json`（1条记录）

**小程序集成**：
- 首页需要读取 banners 和 announcements
- 判断公告的 enabled、showOnHome、日期范围，决定是否显示
- 在适当位置展示客服电话、营业时间等信息（读取 app_settings）

---

### ✅ 问题5：全局搜索验证（待执行）

**待搜索的旧字段**：
- `isDeleted`
- `isActive`
- `sortOrder`

**搜索范围**：
- 仅针对 boatTypes、pricingConfigs、boats、staff 这4个需要CMS适配的集合
- orders 相关代码出现旧字段是正常的（保持原结构）

**验证命令**：
```bash
# 在项目根目录执行
cd ~/Desktop/corePalace/softwareProject/景区游船项目

# 搜索 isActive（应该只在 orders 相关代码中出现）
grep -r "isActive" cloudfunctions/ --exclude-dir=node_modules

# 搜索 isDeleted（应该只在 orders 相关代码中出现）
grep -r "isDeleted" cloudfunctions/ --exclude-dir=node_modules

# 搜索 sortOrder（应该不存在）
grep -r "sortOrder" cloudfunctions/ --exclude-dir=node_modules
```

**预期结果**：
- boatTypes、boats、staff 相关代码中不应出现 isActive/isDeleted
- 全部使用 `enabled` 字段
- 不应出现 sortOrder，全部改为 `sort`

---

### ✅ 问题6：enabled 转换兜底

**修复内容**：使用显式判断

**推荐写法**：
```javascript
// ✅ 推荐写法（显式判断）
enabled: order.isDeleted === true ? false : true

// 或者
enabled: !order.isDeleted ? true : false

// ❌ 不推荐（虽然也能工作）
enabled: !order.isDeleted
```

**应用场景**：
- 数据迁移逻辑中
- 如果旧数据的 isDeleted 字段不存在（undefined），显式判断更安全

---

## 需要CMS适配的集合总结

| 集合名 | CMS权限 | 字段扁平化 | 通用字段 | 说明 |
|--------|---------|-----------|---------|------|
| **boatTypes** | 可编辑 | ✅ | ✅ | 船型管理，code字段只读 |
| **pricingConfigs** | 可编辑 | ✅ | ✅ | 价格配置 |
| **boats** | 可编辑 | ✅ | ✅ | 船只管理 |
| **staff** | 管理员可编辑 | ✅ | ✅ | 员工管理，密码隐藏 |
| **banners** | 可编辑 | ✅ | ✅ | 轮播图管理（新增） |
| **announcements** | 可编辑 | ✅ | ✅ | 公告管理（新增） |
| **app_settings** | 可编辑 | ✅ | ✅ | 基础设置（新增） |
| **orders** | 只读 | ❌ | ❌ | 订单，保持原嵌套结构 |
| **verificationLogs** | 只读 | ✅ | ✅ | 核销记录 |

**通用字段**：`sort`、`enabled`、`createdAt`、`updatedAt`

---

## 测试数据文件

### 核心业务集合
- ✅ `test-data/boatTypes.json` - 3种船型
- ✅ `test-data/pricingConfigs.json` - 3个价格方案
- ✅ `test-data/boats.json` - 5艘船
- ✅ `test-data/staff.json` - 3个账号

### 运营内容集合（新增）
- ✅ `test-data/banners.json` - 3个轮播图
- ✅ `test-data/announcements.json` - 3条公告
- ✅ `test-data/app_settings.json` - 1条设置

### 说明文档
- ✅ `test-data/README.md` - 已更新，包含新集合说明

---

## 下一步工作

### 1. 全局搜索验证（5分钟）
执行上述搜索命令，确认旧字段已替换干净

### 2. 数据导入（15分钟）
导入所有测试数据到云数据库

### 3. CMS配置（30分钟）
- 开通内容管理
- 配置7个集合的字段类型
- 配置用户角色和权限
- 特别注意：boatTypes的code字段只读、staff的password字段隐藏

### 4. 小程序集成（1小时）
- 首页添加轮播图展示
- 首页添加公告展示逻辑
- 个人中心/关于页面展示 app_settings

### 5. 测试验证（30分钟）
- 完整流程测试
- CMS 编辑测试
- 确认 manageStaff 云函数可用

---

## 关键注意事项

1. **orders 保持原结构**：不要尝试扁平化，所有云函数和小程序代码保持原样
2. **密码管理**：运营人员新增员工必须通过 manageStaff 云函数，不能在 CMS 中直接操作
3. **code 字段只读**：CMS 配置时务必设置 boatTypes.code 为只读或添加警告
4. **通用字段齐全**：所有CMS可编辑的集合都必须有 sort、enabled、createdAt、updatedAt
5. **数据导入顺序**：先导入基础数据（boatTypes、pricingConfigs），再导入关联数据（boats）

---

**修复完成时间**：2026-02-12
**状态**：✅ 第一部分已完成，等待确认后开始第二部分（会员储值功能）

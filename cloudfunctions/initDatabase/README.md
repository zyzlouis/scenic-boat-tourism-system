# 一键初始化数据库脚本使用说明

## 功能说明

`initDatabase` 云函数可以**一键创建所有集合并导入测试数据**，严格按照CMS规范设计。

### 支持的集合（共8个）

✅ **CMS可编辑的集合**（扁平字段 + 通用字段）：
1. **boatTypes** - 船型配置（3条数据）
2. **pricingConfigs** - 价格配置（3条数据）
3. **boats** - 船只管理（5条数据）
4. **staff** - 员工管理（3条数据，密码：123456）
5. **banners** - 轮播图（3条数据）
6. **announcements** - 公告通知（3条数据）
7. **app_settings** - 基础设置（1条数据）
8. **recharge_plans** - 充值方案（6条数据）

---

## 使用步骤

### 步骤1：上传并部署云函数

1. 在微信开发者工具中，打开项目
2. 找到 `cloudfunctions/initDatabase` 目录
3. **右键点击 `initDatabase` 文件夹**
4. 选择【上传并部署：云端安装依赖】
5. 等待部署完成（会自动安装 wx-server-sdk 和 bcryptjs）

---

### 步骤2：调用云函数初始化数据库

#### 方法A：在小程序中调用（推荐）

在小程序的任意页面（如 index.js）中临时添加代码：

```javascript
// 一键初始化数据库
wx.cloud.callFunction({
  name: 'initDatabase',
  data: {
    action: 'init'  // 初始化所有集合和数据
  },
  success: res => {
    console.log('初始化成功:', res.result)
    wx.showModal({
      title: '初始化成功',
      content: JSON.stringify(res.result.results, null, 2),
      showCancel: false
    })
  },
  fail: err => {
    console.error('初始化失败:', err)
    wx.showToast({
      title: '初始化失败',
      icon: 'none'
    })
  }
})
```

**在首页加个测试按钮**：
```xml
<!-- index.wxml -->
<button bindtap="initDatabase">一键初始化数据库</button>
```

```javascript
// index.js
initDatabase() {
  wx.showLoading({ title: '初始化中...' })

  wx.cloud.callFunction({
    name: 'initDatabase',
    data: { action: 'init' }
  }).then(res => {
    wx.hideLoading()
    console.log('初始化结果:', res.result)

    if (res.result.success) {
      wx.showModal({
        title: '✅ 初始化成功',
        content: '所有数据已导入，可以去CMS查看',
        showCancel: false
      })
    }
  }).catch(err => {
    wx.hideLoading()
    console.error('初始化失败:', err)
  })
}
```

#### 方法B：在云开发控制台调用

1. 打开【云开发】→【云函数】
2. 找到 `initDatabase` 云函数
3. 点击【测试】
4. 输入测试参数：
```json
{
  "action": "init"
}
```
5. 点击【测试】按钮
6. 查看返回结果

---

### 步骤3：验证数据导入

初始化完成后，验证数据：

1. 打开【云开发】→【数据库】
2. 查看是否有以下集合：
   - ✅ boatTypes（3条）
   - ✅ pricingConfigs（3条）
   - ✅ boats（5条）
   - ✅ staff（3条）
   - ✅ banners（3条）
   - ✅ announcements（3条）
   - ✅ app_settings（1条）
   - ✅ recharge_plans（6条）

3. 点击任意集合，查看数据是否正确：
   - ✅ 所有字段都是扁平的（第一层）
   - ✅ 都有 `sort`、`enabled`、`createdAt`、`updatedAt` 字段

---

## 支持的操作

### 1. 初始化数据库（init）

**功能**：创建所有集合并导入测试数据

**调用**：
```javascript
wx.cloud.callFunction({
  name: 'initDatabase',
  data: { action: 'init' }
})
```

**返回示例**：
```json
{
  "success": true,
  "message": "数据库初始化成功",
  "results": {
    "boatTypes": {
      "status": "success",
      "message": "集合 boatTypes 初始化成功",
      "count": 3
    },
    "pricingConfigs": { ... },
    ...
  }
}
```

**注意**：
- ✅ 如果集合已有数据，会**自动跳过**，不会重复导入
- ✅ 幂等操作，可以多次调用

---

### 2. 检查数据库状态（check）

**功能**：查看各集合的数据量

**调用**：
```javascript
wx.cloud.callFunction({
  name: 'initDatabase',
  data: { action: 'check' }
})
```

**返回示例**：
```json
{
  "success": true,
  "message": "数据库检查完成",
  "results": {
    "boatTypes": {
      "status": "ok",
      "total": 3,
      "enabled": 3
    },
    "staff": {
      "status": "ok",
      "total": 3,
      "enabled": 3
    },
    ...
  }
}
```

---

### 3. 清空数据库（clear）⚠️ 危险操作

**功能**：删除所有测试数据

**调用**：
```javascript
wx.cloud.callFunction({
  name: 'initDatabase',
  data: { action: 'clear' }
})
```

**⚠️ 警告**：
- 此操作会**删除所有数据**！
- 仅用于测试环境
- 生产环境请谨慎使用

---

## 测试数据说明

### 员工账号

| 用户名 | 密码 | 角色 | 真实姓名 |
|--------|------|------|---------|
| admin | 123456 | admin | 系统管理员 |
| staff01 | 123456 | staff | 张三 |
| staff02 | 123456 | staff | 李四 |

### 船型配置

- 双人船（DOUBLE）：50元/小时，押金100元
- 四人船（FOUR）：80元/小时，押金150元
- 六人船（SIX）：120元/小时，押金200元

### 船只

- A001、A002（双人船）
- B001、B002（四人船）
- C001（六人船）

### 轮播图

- 3个轮播图（2个启用，1个禁用）
- 支持 none/page/web 三种跳转类型

### 公告

- 3条公告（2条启用，1条禁用）
- 支持 info/warning/urgent 三种类型
- 支持首页弹窗显示

### 基础设置

- 景区名称、联系电话、营业时间
- 退款规则、安全须知、关于我们

### 充值方案

- 6个充值方案（充50送10、充100送20、充200送50、充500送150、充1000送350、充2000送800）
- "充100送20"标记为"热门"，"充200送50"标记为"超值"
- 运营人员可在CMS中自由调整充值金额和赠送比例

---

## 常见问题

### Q1: 调用失败，提示"集合不存在"？
**A**: 云数据库会在第一次插入数据时自动创建集合，这是正常的。继续执行即可。

### Q2: 已经导入过数据，再次调用会重复吗？
**A**: 不会。脚本会检查集合是否已有数据，如果有则自动跳过。

### Q3: 如何重新导入？
**A**: 先调用 `clear` 清空数据，再调用 `init` 重新导入。

### Q4: 图片URL是占位符，如何上传真实图片？
**A**:
1. 在云开发控制台 → 云存储 → 上传图片
2. 获取图片的 cloud:// 地址
3. 在 CMS 中编辑对应记录，更新 imageUrl 字段

### Q5: 密码是否安全？
**A**: 密码已经过 bcrypt 加密，数据库中存储的是哈希值，无法反向破解。测试环境密码为 123456，生产环境请通过 `manageStaff` 云函数修改。

---

## 完成后的下一步

✅ 数据导入完成后：

1. **配置CMS**
   - 开通内容管理
   - 配置7个集合的字段类型
   - 设置用户角色和权限

2. **修改图片URL**
   - 上传真实的船型图片、轮播图、logo
   - 在 CMS 中更新 imageUrl 字段

3. **调整基础设置**
   - 修改景区名称、联系电话
   - 更新退款规则、安全须知

4. **测试完整流程**
   - 用户端：浏览船型、创建订单
   - 员工端：扫码核销、发船收船
   - CMS：编辑价格、管理船只

---

**初始化脚本位置**：`cloudfunctions/initDatabase/`
**文档更新时间**：2026-02-12

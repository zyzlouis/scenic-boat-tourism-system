# 设计文档：跳转链接下拉选择 + 操作日志修复 + 首页导航图标自适应

> 日期：2026-05-29
> 来源：客户（陈艳）反馈三项需求
> 涉及端：admin-web（后台）、cloudfunctions/adminApi（云函数）、client-user（小程序）

## 背景

客户提出三项需求，合并为一个批次实现：

1. 后台「跳转链接/跳转页面」处不知道地址在哪，希望**下拉选择页面**而不是手敲路径。
2. 后台「操作日志」页面打开报错：`collection.get:fail -502005 database collection not exists. admin_logs`。
3. 小程序首页导航宫格图标希望**按数量自适应大小**（2 个放大平铺、3 个/4 个按数量调整图标与字体）。

## 现状调查结论

- `admin-web` 是单文件 `index.html`（约 3133 行，Vue3 + Element Plus 全内联），无构建步骤。
- 手填路径共 **4 处**，均为自由文本 `el-input`：
  | 位置 | 字段 | 行号 |
  |------|------|------|
  | 导航管理 → 跳转页面 | `navForm.pagePath` | 1146 |
  | 轮播图管理 → 链接地址（小程序页面时） | `dialogForm.linkUrl` | 1438 |
  | 推荐管理 → 跳转链接 | `recommendForm.linkUrl` | 1206 |
  | 系统设置 → 横幅跳转页面 | `settingsForm.promoBannerLink` | 1272 |
  存储的值是路径字符串（如 `/pages/recharge/recharge`），云函数与集合无关此改动。
- 操作日志：`cloudfunctions/adminApi/index.js` 第 468 行在 `updateUserBalance` 分支写 `admin_logs`；第 493-530 行 `queryAdminLogs` 读取，无 try/catch 容错。生产云数据库**从未创建 `admin_logs` 集合** → 查询直接抛 -502005。
  - 附带发现（本批次不处理，留作未来项）：通用 `add/update/remove` 操作均未写日志，目前仅「调整余额」一处有日志，审计覆盖率低。
- 首页导航宫格：`client-user/pages/index/index.wxml` 第 28-44 行 `.nav-grid > .nav-item(wx:for=navItems)`；`index.wxss` 第 30-72 行，`.nav-item{width:25%}` 固定 4 列，`.nav-icon-wrap 100rpx`、`.nav-icon 80rpx`、`.nav-label 24rpx`。

## 决策记录（已与用户确认）

- 交互方式：**下拉选择**（非新增链接管理页）。
- 覆盖范围：**全部 4 处**。
- 下拉框设 `filterable`（可搜索）+ `allow-create`（允许手填带参路径兜底）。
- 操作日志范围：**建集合 + 前端/后端容错**（不在本批次补全所有写入点）。
- 导航图标超过 4 个：**换行，每行 4 个**。

---

## 方案一：跳转链接下拉选择

### 共享常量

在 `index.html` 脚本顶部（Vue app 定义之前）新增单一数据源：

```js
const PAGE_OPTIONS = [
  { label: '首页', value: '/pages/index/index' },
  { label: '游船租赁', value: '/pages/boat-list/boat-list' },
  { label: '水上城堡', value: '/pages/water-castle/water-castle' },
  { label: '会员储值', value: '/pages/recharge/recharge' },
  { label: '充值记录', value: '/pages/recharge-logs/recharge-logs' },
  { label: '我的订单', value: '/pages/order-list/order-list' },
  { label: '个人中心', value: '/pages/profile/profile' },
];
```

排除项（带参数详情页 / 内部流程 / 员工 / 测试页）：`boat-type`(船型详情)、`product-order`(商品订单详情)、`product-detail`、`order-detail`、`announcement-detail`、`payment`(收银台)、`staff`、`share-test`。

需在 Vue `data()` 中暴露：`pageOptions: PAGE_OPTIONS`（或通过 computed）。

### 四处表单改造

统一替换为：

```html
<el-select v-model="XXX" filterable allow-create default-first-option
           placeholder="选择页面" style="width:100%">
  <el-option v-for="p in pageOptions" :key="p.value" :label="p.label" :value="p.value" />
</el-select>
```

| 位置 | v-model | 说明 |
|------|---------|------|
| 导航管理（行 1146） | `navForm.pagePath` | 直接替换 |
| 轮播图（行 1437-1438） | `dialogForm.linkUrl` | 保持 `v-if="dialogForm.linkType !== 'none'"`；当 `linkType==='page'` 用下拉，`linkType==='web'`（外部链接）仍用 `el-input` |
| 推荐管理（行 1206） | `recommendForm.linkUrl` | 下拉（allow-create 兼容粘贴外部网址） |
| 系统设置（行 1272） | `settingsForm.promoBannerLink` | 下拉 |

轮播图需按 `linkType` 二选一渲染：

```html
<el-form-item label="链接地址" v-if="dialogForm.linkType !== 'none'">
  <el-select v-if="dialogForm.linkType === 'page'" v-model="dialogForm.linkUrl" filterable allow-create ...>
    <el-option v-for="p in pageOptions" .../>
  </el-select>
  <el-input v-else v-model="dialogForm.linkUrl" placeholder="请输入外部链接" />
</el-form-item>
```

### 兼容性

- 存储值仍为路径字符串，旧数据回显：`el-select` 的值若不在 options 中，`allow-create` 模式下仍能正常显示原值。
- 不改动任何云函数、数据库集合、字段名。

---

## 方案二：操作日志报错修复（最小闭环）

### 手动步骤（用户执行）

云开发控制台新建集合 `admin_logs`（权限：仅管理端可读写，沿用其他后台集合权限）。依据项目铁律，集合需手动创建，不在代码中 DROP/建库。

### 代码改动（cloudfunctions/adminApi/index.js）

`queryAdminLogs` 分支加容错：集合不存在或查询异常时返回空集而非 500。

```js
case 'queryAdminLogs': {
  try {
    // ...原有 whereCondition 构造与查询...
    const logsRes = await query.get()
    const logsCount = await db.collection('admin_logs').where(whereCondition).count()
    return { code: 200, data: logsRes.data, total: logsCount.total }
  } catch (e) {
    // 集合不存在(-502005)或为空时，返回空列表，前端显示"暂无数据"
    return { code: 200, data: [], total: 0 }
  }
}
```

效果：建集合前页面显示「暂无数据」不再飘红；建集合后日志正常累积（目前会累积「调整余额」类日志）。

### 不在本批次范围

- 不重构 `writeAdminLog()` 辅助函数、不为通用 add/update/remove 补写日志（作为未来增强项记录在案）。

---

## 方案三：首页导航图标按数量自适应

### index.js

加载 navItems 后计算布局类名（≤4 用对应列数，≥5 统一 4 列换行）：

```js
const items = res.data || [];
const n = items.length;
const navClass = 'nav-cols-' + (n >= 4 ? 4 : (n || 4));
this.setData({ navItems: items, navClass });
```

> `n===0` 时回退 `nav-cols-4` 不影响（无项不渲染）。

### index.wxml（行 29）

```html
<view class="nav-grid {{navClass}}">
```

### index.wxss

`.nav-grid` 保留 `flex-wrap`。各档定义列宽与尺寸（数量越少越大）：

```css
/* 列宽 */
.nav-cols-1 .nav-item { width: 100%; }
.nav-cols-2 .nav-item { width: 50%; }
.nav-cols-3 .nav-item { width: 33.33%; }
.nav-cols-4 .nav-item { width: 25%; }

/* 图标 / 字号随数量缩放 */
.nav-cols-1 .nav-icon-wrap { width: 160rpx; height: 160rpx; }
.nav-cols-1 .nav-icon, .nav-cols-1 .nav-icon-placeholder { width: 130rpx; height: 130rpx; }
.nav-cols-1 .nav-label { font-size: 32rpx; }

.nav-cols-2 .nav-icon-wrap { width: 140rpx; height: 140rpx; }
.nav-cols-2 .nav-icon, .nav-cols-2 .nav-icon-placeholder { width: 110rpx; height: 110rpx; }
.nav-cols-2 .nav-label { font-size: 30rpx; }

.nav-cols-3 .nav-icon-wrap { width: 120rpx; height: 120rpx; }
.nav-cols-3 .nav-icon, .nav-cols-3 .nav-icon-placeholder { width: 90rpx; height: 90rpx; }
.nav-cols-3 .nav-label { font-size: 28rpx; }

/* nav-cols-4 = 现状默认值（100/80/24rpx），5 个以上复用此档换行 */
```

> 数值为初版，真机预览后可微调。`.nav-icon-placeholder` 同步缩放，保证有/无图标两种情况一致。

---

## 验证流程

- admin-web：浏览器本地打开 `index.html`，逐一验证 4 处下拉可选/可搜/可手填、保存后回显正确、旧数据正常显示；操作日志页不再报错。
- adminApi：微信开发者工具上传部署后，操作日志页查询返回 200。
- client-user：开发者工具预览，依次将导航项配成 1/2/3/4/5 个，确认布局与图标尺寸自适应、点击跳转正常。

## 部署清单

1. 用户在云开发控制台创建 `admin_logs` 集合。
2. 上传部署云函数 `adminApi`（右键→上传并部署：云端安装依赖）。
3. admin-web 静态部署更新后的 `index.html`。
4. client-user 上传 → 提交审核（注意 `app_settings.rechargeEnabled=false`）。

## 影响面

- 无数据库结构破坏性变更（仅新增空集合）。
- 无字段重命名、无存储格式变化，向后兼容。
- 改动文件：`admin-web/index.html`、`cloudfunctions/adminApi/index.js`、`client-user/pages/index/{index.js,index.wxml,index.wxss}`。

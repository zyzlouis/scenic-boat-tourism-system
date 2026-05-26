# CLAUDE.md — 翠屏湖游船计时收费系统

## 项目说明

旅游景区**外包项目**，微信云开发小程序，实现景区游船「购票 → 核销 → 计时 → 结算」业务闭环。

- 客户：旅游景区（翠屏湖），外包交付项目
- 状态：**已上线运营**，多次通过微信审核，按客户反馈持续迭代中
- appid: `wx030224...`
- ⚠️ `backend/` 是 2026-02 最初设想的 Node.js + MySQL 架构残留，**已废弃，勿用**——实际全部走微信云开发

## 技术栈

- 用户端 `client-user/` + 员工端 `client-staff/`：两个独立的原生微信小程序
- 后台 `admin-web/`：Vue3 + Element Plus + CloudBase JS SDK（`@cloudbase/js-sdk`，直连云开发）
- `cloudfunctions/`：39 个云函数
- 云数据库：12 个集合

## 部署方式（与其他项目完全不同，注意！）

- 云函数：微信开发者工具「右键 → 上传并部署：云端安装依赖」，**不是** rsync / pm2 / systemd
- 小程序：开发者工具上传 → 微信公众平台提交审核
- 后台 admin-web：`npm run build` 后静态部署

## 项目特定铁律

- **储值审核开关**：提交小程序审核时，`app_settings.rechargeEnabled` 必须 = `false`，审核通过后再开
- **数据已扁平化**（CMS 适配）：用 `order.boatTypeName`，不是 `order.boatType.name`
- **真实微信支付已接入**（2026-02 已移除模拟支付）——改支付逻辑必须走真实 API + 回调
- **余额操作必须原子**：用 `_.inc()`，且每次变动写 `balance_logs` 流水

## 数据库集合（12 个）

- 可编辑(10)：boatTypes / pricingConfigs / boats / staff / banners / announcements / app_settings / recharge_plans / projects / products
- 只读(4)：users / orders / recharge_orders / balance_logs / verificationLogs

## 实时进度

> 更新于 2026-05-26

- **截至 2026-04-12**：核心闭环 + 真实微信支付 + 会员储值 + 后台管理(admin-web) + 订单/船型分享二维码 全部完成，已上线运营
- **2026-04-12 ~ 05-25**：停滞，等客户反馈
- **2026-05-26**：完成商品销售功能 + 订单导出
  - 新增 projects / products 两个数据集合，initDatabase 支持自动初始化
  - 新增 getProjects / createProductOrder / verifyProduct 三个云函数
  - 修改 wechatPayCallback / scanCode / wechatPay / refundOrder / getOrderList / adminApi 六个云函数
  - 用户端：首页商品展示、商品详情页、商品订单详情页、订单列表 Tab 切换
  - 员工端：扫码支持商品一次性核销
  - 后台：项目管理、商品管理、订单类型筛选、Excel 导出
- **下一步**：
  1. 部署云函数（微信开发者工具右键上传）
  2. 调用 initDatabase `{ action: 'initProducts' }` 创建新集合
  3. 在云开发控制台设置 projects / products 集合权限
  4. 小程序端上传提交审核（注意 rechargeEnabled=false）
  5. 在开发者工具中做端到端测试

## 关键文档索引

- 完整业务流程 / 订单状态流转 → `README.md`
- CMS 字段对照表 → `docs/CMS迁移完整指南.md`
- 会员储值设计 → `docs/会员储值功能开发完成总结.md`
- 员工操作手册 → `docs/翠屏湖游船系统员工操作手册.md`
- 云开发部署 → `docs/云开发部署文档.md`
- 商品销售设计 → `docs/superpowers/specs/2026-05-26-product-sales-and-export-design.md`
- 迁移规划 → `docs/迁移规划.md`

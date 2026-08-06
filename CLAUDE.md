# CLAUDE.md — 翠屏湖游船计时收费系统

## 项目说明

旅游景区**外包项目**，微信云开发小程序，实现景区游船「购票 → 核销 → 计时 → 结算」业务闭环。

- 客户：旅游景区（翠屏湖），外包交付项目
- 状态：**已上线运营**，多次通过微信审核，按客户反馈持续迭代中
- appid: `wx030224...`
- ⚠️ `backend/` 是 2026-02 最初设想的 Node.js + MySQL 架构残留，**已废弃，勿用**——实际全部走微信云开发

## 技术栈

- 小程序 `client-user/`：唯一的线上小程序，用户功能 + 员工功能（通过「我的→员工入口」进入）整合在一起
- ⚠️ `client-staff/` 是早期设想的独立员工端小程序，**已废弃，勿用**——员工功能已在 2026-03 整合进 `client-user/pages/staff/`
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

- 可编辑(12)：boatTypes / pricingConfigs / boats / staff / banners / announcements / app_settings / recharge_plans / projects / products / navItems / recommendItems
- 只读(4)：users / orders / recharge_orders / balance_logs / verificationLogs

## 实时进度

> 更新于 2026-08-06 · 标签 `v1.1.0`

### 2026-07-28 ~ 08-06：支付掉单事故处置（已全量发布）

**事故**：游客买「水上城堡-双人票」¥49.90，微信扣款成功但订单卡在待支付、核销码未生成。

**根因**（由数据完整还原，非推测）：手机号授权成功后 `setTimeout(1500)` 自动续上支付，
其间页面无任何反馈；用户以为没点上又点了一次「立即支付」，两条流程并发，
各向微信申请一个商户单号，后者覆盖前者。用户在前一个支付窗口完成付款，
回调携旧单号返回时库中已是新号 → 查无此单 → 静默返回成功 → 订单永久停滞。

**四层处置**：

| 层 | 措施 | 状态 |
|---|---|---|
| 根除 | 手机号从支付解耦，`setTimeout` 整段删除，触发路径不复存在 | ✅ 已发布 |
| 防重 | 支付收敛为唯一入口 `_enterPayFlow`，锁用实例属性非 data | ✅ 已发布 |
| 数据 | `wechatPay` 复用商户单号；关单换新号重试；回调按 `outTradeNoHistory` 反查 | ✅ 已部署 |
| 兜底 | `reconcilePayment` 定时对账(10分钟) + 支付后前端主动对账；异常落库 `pay_exceptions` | ✅ 运行中 |

**同批修复**：核销码改本地生成二维码（`weapp-qrcode`，原游船页用境外 api.qrserver.com）、
三处时间显示（NaN / 空白 / ISO+UTC偏移）、回调迟到重试会打回已流转订单（既有生产 bug）、
对账加金额与单号占用两道资金校验。

**事故订单已修复**，游客与景区均已沟通。

### ⚠️ 本次踩过的坑（下次直接查这里）

- **定时触发器必须单独「上传触发器」**——「上传并部署」不注册触发器。
  两份官方文档说法相反，以腾讯云 CloudBase 文档为准。曾因此 23 分钟零触发。
- **云调用（`cloud.cloudPay.*`）需要微信侧令牌**，只有小程序端调用和微信定时触发器有；
  云开发控制台「云端测试」和 CLI 都拿不到，必报 `invalid wx openapi access_token`。
- 云函数**默认超时 3 秒**，`config.json` 无 timeout 字段，只能在控制台改（上限 60 秒）。
- 云开发**写入不存在的集合会报 -502005**，不自动建集合。
- **WXS 的 `getDate()` 解析不了 Date 对象** → `NaN-aN-aN aN:aN:aN`。
  客户端直读数据库的页面需在 js 层预格式化；走云函数的页面无此问题（已序列化为 ISO 串）。
- **WXML 只能调 WXS 模块的函数**，调不了 Page 方法或 data 里挂的函数（会静默空白）。
- 云环境**从未开启日志服务**，历史日志不可追溯。关键留痕必须落库。

### 下一步（按优先级）

1. **鉴权安全批次尚未部署**（代码在 `b796a97`）：`adminApi` / `getAppConfig` /
   `manageStaff` / `createStaff` / `updateStaffPassword`。
   ⚠️ `adminApi` 直接部署会打挂线上游船——旧版小程序的 `boat-type.js` 仍在不传
   `staffId` 裸调它查价格。而本项目是低频小程序（用户几周才开一次），
   "等存量更新"不成立。**方案：给 `adminApi` 加 `query`+`pricingConfigs` 只读豁免**（约 8 行）。
2. **微信支付的游船订单押金可能从未退还**：`endTrip/index.js:176-180` 微信分支只有
   `console.log`，但订单已写 `settlement.refundedAt` 并置 completed。
   `pricingConfigs.depositAmount = 100`（非 0），需先统计涉及订单再定补偿。
3. 回调失败时返回失败让微信重试（现在恒返回 errcode:0，白白扔掉微信自带的 24 小时重试）。
4. 其余见 `docs/工作清单-2026-07-29.md`（38 项，分 P0~P5）。

## 关键文档索引

- 完整业务流程 / 订单状态流转 → `README.md`
- CMS 字段对照表 → `docs/CMS迁移完整指南.md`
- 会员储值设计 → `docs/会员储值功能开发完成总结.md`
- 员工操作手册 → `docs/翠屏湖游船系统员工操作手册.md`
- 云开发部署 → `docs/云开发部署文档.md`
- **支付事故处置操作手册** → `docs/部署说明-支付对账-2026-07-29.md`
- **待办工作清单（38 项）** → `docs/工作清单-2026-07-29.md`
- 商品销售设计 → `docs/superpowers/specs/2026-05-26-product-sales-and-export-design.md`
- 迁移规划 → `docs/迁移规划.md`

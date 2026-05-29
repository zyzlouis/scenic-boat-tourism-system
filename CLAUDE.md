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

> 更新于 2026-05-29

- **截至 2026-04-12**：核心闭环 + 真实微信支付 + 会员储值 + 后台管理(admin-web) + 订单/船型分享二维码 全部完成，已上线运营
- **2026-05-28 ~ 05-29**：客户反馈（设计文档 `docs/superpowers/specs/2026-05-29-admin-link-picker-and-fixes-design.md`）
    - 后台跳转链接改下拉选择（提交 8a98828）：新增 `PAGE_OPTIONS`(7个落地页) 常量，导航/轮播图(仅page类型)/推荐/系统设置横幅 共4处 `el-input`→`el-select`(filterable+allow-create)，存储值不变、老数据兼容
    - 首页导航图标按数量自适应（提交 8a98828）：`index.js` 按 navItems.length 算 `navClass`，wxss 定义 1/2/3/4 档尺寸，≥5 个每行4个换行
    - 操作日志（提交 8a98828 + 48765fb）：① 报错修复（客户已建 `admin_logs` 集合 + `queryAdminLogs` 加 try/catch 容错）；② 补**删除日志**——`adminApi.remove` 删除前存完整快照、写 admin_logs(`action='delete'`、`MODULE_NAMES` 英文集合名转中文、`oldValue` 存被删数据完整 JSON)，前端已支持展示无需改；③ 增/改不记（客户认可），金钱不镜像（已有 `balance_logs` 流水）
    - 退款查证：用户申请(refundOrder)/系统自动(autoRefundTask)，无管理员手动环节→不进操作日志；后台已能在 订单管理(状态=已退款)/余额流水(类型=退款,仅余额退款)/数据统计(退款概览) 三处看到，无需新做
- **2026-05-26 ~ 05-27 归档**：完成客户新需求迭代
  - 商品销售：projects/products 集合 + 3个新云函数 + 用户端购买/核销/退款全流程 + 员工端扫码核销
  - 订单导出：后台 Excel 导出（SheetJS）
  - 首页改版：导航入口页（轮播图+宫格导航+公告+活动横幅+图文推荐+景区信息）
  - 游船列表拆为独立 boat-list 页面，水上城堡独立 water-castle 页面
  - 后台新增：项目管理、商品管理、导航管理、推荐管理（含图片上传）
  - 系统设置新增：活动横幅开关、图文推荐开关（默认关闭）
  - TabBar：首页/订单/我的（3个）
  - getAppConfig 改为返回完整配置，后续新增字段不需要改云函数
- **下一步**：
  1. 部署本批次：上传 `adminApi` 云函数 + admin-web 静态部署 + client-user 真机预览（4处下拉/操作日志不报错/导航图标自适应）
  2. 推送代码到远端仓库
  3. 端到端测试商品购买→支付→核销完整流程
  4. 小程序提交审核（注意 rechargeEnabled=false）

## 关键文档索引

- 完整业务流程 / 订单状态流转 → `README.md`
- CMS 字段对照表 → `docs/CMS迁移完整指南.md`
- 会员储值设计 → `docs/会员储值功能开发完成总结.md`
- 员工操作手册 → `docs/翠屏湖游船系统员工操作手册.md`
- 云开发部署 → `docs/云开发部署文档.md`
- 商品销售设计 → `docs/superpowers/specs/2026-05-26-product-sales-and-export-design.md`
- 迁移规划 → `docs/迁移规划.md`

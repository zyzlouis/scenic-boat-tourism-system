# 景区游船计时收费系统 - 项目总览

## 📋 项目简介

景区游船计时收费系统是一套完整的数字化解决方案，旨在解决人工计时混乱、排队拥堵问题，实现购票-核销-计时-结算的完整软件闭环。

**项目类型**: MVP (最小可行产品)
**开发时间**: 2026-02-04
**版本**: V1.0

---

## 🎯 核心价值

### 对游客
- ✅ 购票透明，计时准确
- ✅ 押金自动退还，减少排队
- ✅ 实时查看已用时长和预计费用

### 对景区运营
- ✅ 降低人工计算成本
- ✅ 通过扫码核销提升翻台率
- ✅ 数字化管理，账目清晰

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────┐
│             微信生态                             │
│  ┌──────────────┐      ┌──────────────┐         │
│  │ 用户端小程序  │      │ 员工端小程序  │         │
│  └──────┬───────┘      └──────┬───────┘         │
└─────────┼─────────────────────┼─────────────────┘
          │                     │
          │    HTTPS / WSS      │
          ▼                     ▼
┌─────────────────────────────────────────────────┐
│          Node.js 后端服务 (Express)              │
│  ├ API路由层                                    │
│  ├ 业务逻辑层 (Services)                        │
│  └ 数据访问层 (Sequelize ORM)                   │
└─────────┬───────────────────┬───────────────────┘
          │                   │
          ▼                   ▼
   ┌──────────┐        ┌──────────┐
   │  MySQL   │        │  Redis   │
   │  数据库   │        │   缓存    │
   └──────────┘        └──────────┘
```

---

## 📦 项目结构

```
景区游船项目/
├── docs/                           # 📚 项目文档
│   ├── design/                    # 设计文档
│   │   └── 技术方案设计文档.md
│   ├── database/                  # 数据库设计
│   │   ├── 数据库设计文档.md
│   │   └── schema.sql            # 建表SQL脚本
│   └── api/                       # API接口文档
│       └── API接口文档.md
│
├── backend/                        # 🚀 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── config/               # 配置文件
│   │   ├── models/               # 数据模型 (Sequelize)
│   │   ├── services/             # 业务逻辑层
│   │   ├── controllers/          # 控制器层
│   │   ├── routes/               # 路由定义
│   │   ├── middlewares/          # 中间件
│   │   ├── utils/                # 工具函数
│   │   ├── app.js                # Express应用
│   │   └── server.js             # 服务器启动
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── client-user/                    # 📱 用户端小程序
│   ├── pages/                     # 页面
│   │   ├── index/                # 首页（船型选择）
│   │   ├── order-detail/         # 订单详情
│   │   └── order-list/           # 订单列表
│   ├── utils/                     # 工具函数
│   │   ├── api.js                # API请求封装
│   │   └── util.js               # 工具函数
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   └── README.md
│
├── client-staff/                   # 👔 员工端小程序 (待开发)
│
├── 景区游船计时收费系统 - 产品需求文档 (PRD).md
└── README.md (本文件)
```

---

## 🎨 技术栈

### 前端（小程序）
- **框架**: 微信原生小程序
- **UI组件**: Vant Weapp
- **语言**: JavaScript / WXML / WXSS

### 后端
- **运行环境**: Node.js 18.x LTS
- **Web框架**: Express.js 4.x
- **数据库**: MySQL 8.0
- **缓存**: Redis 7.x
- **ORM**: Sequelize
- **认证**: JWT
- **支付**: 微信支付 API v3

---

## ✅ 已完成功能

### 1. 文档设计 (100%)
- ✅ 技术方案设计文档
- ✅ 数据库设计文档 (10张表，完整ER图)
- ✅ API接口文档 (RESTful API)

### 2. 数据库设计 (100%)
- ✅ 10张核心数据表设计
- ✅ 建表SQL脚本
- ✅ 索引策略优化
- ✅ 数据字典

**核心表**:
- `users` - 用户表
- `boat_types` - 船型配置表
- `pricing_config` - 价格配置表
- `boats` - 船只表
- `orders` - 订单表 (核心)
- `payments` - 支付记录表
- `refunds` - 退款记录表
- `staff` - 员工表
- `verification_logs` - 核销记录表
- `timing_records` - 计时记录表

### 3. 后端服务开发 (80%)
- ✅ Express服务器搭建
- ✅ Sequelize ORM 模型定义
- ✅ JWT认证中间件
- ✅ 全局错误处理
- ✅ 订单服务 (OrderService)
- ✅ 计时服务 (TimingService)
- ✅ 核销服务 (VerificationService)
- ✅ RESTful API路由
- ⏳ 微信登录对接 (TODO)
- ⏳ 微信支付对接 (TODO)
- ⏳ WebSocket实时推送 (TODO)

**已实现的API接口**:
- `GET /api/v1/boats/types` - 获取船型列表
- `POST /api/v1/order/create` - 创建订单
- `GET /api/v1/order/:id` - 获取订单详情
- `GET /api/v1/order/list` - 获取订单列表
- `POST /api/v1/verification/scan` - 扫码核销
- `POST /api/v1/verification/start` - 发船（开始计时）
- `POST /api/v1/verification/end` - 收船（结束计时）
- `GET /api/v1/verification/boat/:boatNumber` - 船号反查

### 4. 用户端小程序 (80%)
- ✅ 小程序项目结构搭建
- ✅ API请求封装 (utils/api.js)
- ✅ 工具函数封装 (utils/util.js)
- ✅ 首页 - 船型列表展示
- ✅ 订单详情页 - 核销码、计时看板
- ✅ 订单列表页 - 下拉刷新、上拉加载
- ⏳ 微信登录 (TODO)
- ⏳ 微信支付页面 (TODO)
- ⏳ WebSocket实时推送 (TODO)

---

## ⏳ 待开发功能

### 高优先级 (P0)
- [ ] **微信登录对接** (后端 + 小程序)
  - 后端：调用微信API验证code，生成JWT Token
  - 小程序：wx.login() 获取code，调用后端登录接口

- [ ] **微信支付对接** (后端 + 小程序)
  - 后端：统一下单、支付回调、退款接口
  - 小程序：wx.requestPayment() 调起支付

- [ ] **员工端小程序开发**
  - 员工登录页
  - 扫码核销页
  - 发船/收船流程
  - 船号查询功能

### 中优先级 (P1)
- [ ] **WebSocket实时推送**
  - 用户端实时计时更新
  - 员工端订单状态推送

- [ ] **服务通知**
  - 计时开始通知
  - 结束结算通知
  - 退款成功通知

- [ ] **管理后台 Web端** (后期扩展)
  - 价格配置管理
  - 财务报表
  - 数据统计分析

### 低优先级 (P2)
- [ ] 单元测试
- [ ] Docker部署配置
- [ ] CI/CD自动化部署
- [ ] 日志系统完善
- [ ] 性能监控

---

## 🚀 快速开始

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p

# 执行建表脚本
mysql -u root -p boat_rental < docs/database/schema.sql
```

### 2. 启动后端服务

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写数据库、Redis等配置

# 启动服务（开发模式）
npm run dev

# 或生产模式
npm start
```

服务启动后访问: `http://localhost:3000`

### 3. 运行用户端小程序

```bash
cd client-user

# 安装依赖
npm install
```

在微信开发者工具中：
1. 导入项目（选择 `client-user` 目录）
2. 点击 **工具 -> 构建npm**
3. 修改 `app.js` 中的 `baseUrl` 为后端API地址
4. 点击 **编译** 运行

---

## 📊 业务流程

### 完整租船流程

```
1. 购票
   游客打开小程序 → 选择船型 → 创建订单 → 支付（基础票价+押金）
   ↓
2. 发船
   游客出示核销码 → 员工扫码 → 输入船号 → 开始计时
   ↓
3. 游玩
   用户端显示"计时中"，实时更新已用时长和预计费用
   ↓
4. 收船
   游客靠岸 → 员工扫码 → 停止计时 → 展示账单预览 → 确认结束
   ↓
5. 结算
   系统计算超时费用 → 原路退还剩余押金 → 订单完成
```

### 订单状态流转

```
pending (待支付)
  ↓
paid (已支付，待核销)
  ↓
verified (已核销，待发船)
  ↓
timing (计时中)
  ↓
ended (已结束计时，待结算)
  ↓
completed (已完成)
```

---

## 🔐 核心功能设计

### 计时逻辑

```javascript
// 1. 发船时记录开始时间
startTime = new Date();

// 2. 实时计算已用时长（向上取整）
usedMinutes = Math.ceil((now - startTime) / 60000);

// 3. 计算超时费用
if (usedMinutes > includedMinutes) {
  overtimeMinutes = usedMinutes - includedMinutes;
  overtimeFee = overtimeMinutes * overtimeRate;
} else {
  overtimeFee = 0;
}

// 4. 计算退款金额
refundAmount = depositAmount - overtimeFee;

// 5. 计算最终费用
finalAmount = basePrice + overtimeFee;
```

### 安全设计

- **认证**: JWT Token，有效期7天
- **支付**: 微信支付签名验证，幂等性处理
- **数据一致性**: 数据库事务，确保订单状态与支付状态一致
- **接口防刷**: Redis限流，核销码一次性使用

---

## 📝 待办清单

### 短期目标（1周内）
- [ ] 实现微信登录对接
- [ ] 实现微信支付对接
- [ ] 完成员工端小程序基本功能
- [ ] 联调测试

### 中期目标（1个月内）
- [ ] WebSocket实时推送
- [ ] 完善错误处理和异常场景
- [ ] 性能优化和压力测试
- [ ] 编写部署文档

### 长期目标（3个月内）
- [ ] 管理后台开发
- [ ] 数据分析和报表
- [ ] 会员系统
- [ ] 营销功能（优惠券、会员卡）

---

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

## 📄 许可证

ISC

---

**项目创建时间**: 2026-02-04
**最后更新时间**: 2026-02-04
**项目状态**: 🚧 开发中 (MVP阶段 80%完成)

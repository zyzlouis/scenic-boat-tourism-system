# 景区游船计时收费系统 - 后端服务

## 项目介绍

景区游船计时收费系统后端API服务，基于Node.js + Express + MySQL + Redis开发。

## 技术栈

- **运行环境**: Node.js 18.x
- **Web框架**: Express.js 4.x
- **数据库**: MySQL 8.0
- **缓存**: Redis 7.x
- **ORM**: Sequelize
- **认证**: JWT
- **支付**: 微信支付 API v3

## 目录结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.js  # 数据库配置
│   │   ├── redis.js     # Redis配置
│   │   └── jwt.js       # JWT配置
│   ├── models/          # 数据模型（Sequelize）
│   │   ├── index.js     # 模型初始化
│   │   ├── user.js      # 用户模型
│   │   ├── order.js     # 订单模型
│   │   └── ...          # 其他模型
│   ├── services/        # 业务逻辑层
│   │   ├── orderService.js     # 订单服务
│   │   ├── timingService.js    # 计时服务
│   │   └── ...
│   ├── controllers/     # 控制器层
│   │   ├── orderController.js  # 订单控制器
│   │   └── ...
│   ├── routes/          # 路由定义
│   │   └── index.js     # 路由汇总
│   ├── middlewares/     # 中间件
│   │   ├── auth.js      # 认证中间件
│   │   └── errorHandler.js  # 错误处理
│   ├── utils/           # 工具函数
│   │   ├── response.js  # 响应工具
│   │   └── orderNo.js   # 订单号生成
│   ├── app.js           # Express应用
│   └── server.js        # 服务器启动文件
├── logs/                # 日志目录
├── .env.example         # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写数据库、Redis、微信等配置。

### 3. 初始化数据库

执行数据库建表脚本：

```bash
mysql -u root -p boat_rental < ../docs/database/schema.sql
```

### 4. 启动服务

**开发模式**（支持热重载）：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

服务启动后，访问: `http://localhost:3000`

## API文档

详细API文档请参考: [docs/api/API接口文档.md](../docs/api/API接口文档.md)

### 主要接口

#### 用户端
- `POST /api/v1/auth/user/login` - 用户登录
- `GET /api/v1/boats/types` - 获取船型列表
- `POST /api/v1/order/create` - 创建订单
- `GET /api/v1/order/:id` - 获取订单详情
- `GET /api/v1/order/list` - 获取订单列表
- `POST /api/v1/payment/prepay` - 发起支付

#### 员工端
- `POST /api/v1/auth/staff/login` - 员工登录
- `POST /api/v1/verification/scan` - 扫码核销
- `POST /api/v1/verification/start` - 发船（开始计时）
- `POST /api/v1/verification/end` - 收船（结束计时）
- `GET /api/v1/verification/boat/:boatNumber` - 船号反查

### 健康检查

```bash
curl http://localhost:3000/api/v1/health
```

## 开发指南

### 数据库迁移

如需修改数据库结构，请：
1. 修改对应的 Model 文件
2. 更新 `docs/database/schema.sql`
3. 执行数据库迁移

### 添加新接口

1. 在 `services/` 创建或修改业务逻辑
2. 在 `controllers/` 创建或修改控制器
3. 在 `routes/index.js` 添加路由
4. 更新API文档

### 代码规范

项目使用 ESLint 进行代码检查：

```bash
npm run lint
```

### 测试

```bash
npm test
```

## 部署

### 使用PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start src/server.js --name boat-rental-api

# 查看日志
pm2 logs boat-rental-api

# 重启服务
pm2 restart boat-rental-api

# 停止服务
pm2 stop boat-rental-api
```

### Docker部署（TODO）

## 常见问题

### 1. 数据库连接失败
- 检查 `.env` 中的数据库配置是否正确
- 确认MySQL服务已启动
- 确认数据库 `boat_rental` 已创建

### 2. Redis连接失败
- 检查 `.env` 中的Redis配置
- 确认Redis服务已启动

### 3. JWT Token失效
- 检查 `.env` 中的 `JWT_SECRET` 配置
- Token默认有效期为7天

## 待完成功能（TODO）

- [ ] 认证接口实现（微信登录、员工登录）
- [ ] 微信支付对接（预支付、回调、退款）
- [ ] WebSocket实时计时推送
- [ ] 定时任务（超时订单处理）
- [ ] 单元测试
- [ ] Docker配置
- [ ] 日志系统完善

## 许可证

ISC

# 景区游船计时收费系统 - API接口文档

| **文档版本** | **V1.0**                     |
| ------------ | ---------------------------- |
| **文档状态** | 设计中 (In Design)           |
| **撰写人**   | 后端架构师                   |
| **创建时间** | 2026-02-04                   |
| **Base URL** | `https://api.boat-rental.com` |

---

## 1. 接口规范

### 1.1 请求规范

- **协议**: HTTPS
- **方法**: GET / POST / PUT / DELETE
- **Content-Type**: `application/json`
- **认证**: JWT Token（放在 Header 中）

**请求头示例**:
```http
POST /api/v1/order/create HTTP/1.1
Host: api.boat-rental.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.2 响应规范

所有接口统一返回格式:

**成功响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    // 业务数据
  },
  "timestamp": 1675584000000
}
```

**失败响应**:
```json
{
  "code": 400,
  "message": "参数错误",
  "data": null,
  "timestamp": 1675584000000
}
```

### 1.3 状态码说明

| HTTP状态码 | 业务code | 说明                     |
| ---------- | -------- | ------------------------ |
| 200        | 200      | 请求成功                 |
| 200        | 400      | 参数错误                 |
| 200        | 401      | 未登录或Token失效        |
| 200        | 403      | 无权限                   |
| 200        | 404      | 资源不存在               |
| 200        | 500      | 服务器内部错误           |
| 200        | 10001    | 订单不存在               |
| 200        | 10002    | 订单状态不正确           |
| 200        | 10003    | 核销码无效               |
| 200        | 20001    | 支付失败                 |
| 200        | 20002    | 退款失败                 |
| 200        | 30001    | 船只不存在或不可用       |

---

## 2. 认证接口

### 2.1 用户微信登录

**接口**: `POST /api/v1/auth/user/login`

**描述**: 用户通过微信小程序登录，获取自定义Token

**请求参数**:
```json
{
  "code": "081xYzGa1HJKlB0wXwHa1bqAkQ0xYzGg" // 微信登录code
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 123,
      "nickname": "张三",
      "avatarUrl": "https://...",
      "isVip": false
    }
  },
  "timestamp": 1675584000000
}
```

---

### 2.2 员工登录

**接口**: `POST /api/v1/auth/staff/login`

**描述**: 员工账号密码登录

**请求参数**:
```json
{
  "username": "staff01",
  "password": "staff123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "staffInfo": {
      "id": 1,
      "username": "staff01",
      "realName": "张三",
      "role": "staff"
    }
  },
  "timestamp": 1675584000000
}
```

---

## 3. 用户端接口

### 3.1 获取船型列表

**接口**: `GET /api/v1/boats/types`

**描述**: 获取所有可租赁的船型列表（含价格信息）

**请求参数**: 无

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "id": 1,
      "typeCode": "powered",
      "typeName": "有动力船",
      "description": "配有电动马达，速度较快，适合远距离游玩",
      "maxCapacity": 4,
      "imageUrl": "https://cdn.example.com/boat-powered.jpg",
      "pricing": {
        "id": 1,
        "priceName": "平日价",
        "basePrice": 50.00,
        "depositAmount": 100.00,
        "includedMinutes": 60,
        "overtimeRate": 1.00,
        "capAmount": 200.00
      }
    },
    {
      "id": 2,
      "typeCode": "unpowered",
      "typeName": "无动力船",
      "description": "脚踏或手划，速度较慢，适合悠闲游湖",
      "maxCapacity": 2,
      "imageUrl": "https://cdn.example.com/boat-unpowered.jpg",
      "pricing": {
        "id": 2,
        "priceName": "平日价",
        "basePrice": 30.00,
        "depositAmount": 50.00,
        "includedMinutes": 60,
        "overtimeRate": 0.50,
        "capAmount": 100.00
      }
    }
  ],
  "timestamp": 1675584000000
}
```

---

### 3.2 创建订单

**接口**: `POST /api/v1/order/create`

**描述**: 用户选择船型后创建订单（未支付）

**请求头**: 需要携带 Token

**请求参数**:
```json
{
  "boatTypeId": 1 // 船型ID
}
```

**响应**:
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "orderId": 1001,
    "orderNo": "ORD20260204123456789",
    "boatTypeId": 1,
    "boatTypeName": "有动力船",
    "basePrice": 50.00,
    "depositAmount": 100.00,
    "totalAmount": 150.00,
    "includedMinutes": 60,
    "overtimeRate": 1.00,
    "status": "pending",
    "createdAt": "2026-02-04 12:34:56"
  },
  "timestamp": 1675584000000
}
```

---

### 3.3 发起支付

**接口**: `POST /api/v1/payment/prepay`

**描述**: 发起微信支付，获取支付参数

**请求头**: 需要携带 Token

**请求参数**:
```json
{
  "orderId": 1001
}
```

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "paymentNo": "PAY20260204123456789",
    "wechatPayParams": {
      "timeStamp": "1675584000",
      "nonceStr": "5K8264ILTKCH16CQ2502SI8ZNMTM67VS",
      "package": "prepay_id=wx20260204123456789abcdef",
      "signType": "RSA",
      "paySign": "oR9d8PuhnIc+YZ8cBHFCwfgpaK9gd7vaRvkYD7rthRAZ..."
    }
  },
  "timestamp": 1675584000000
}
```

**小程序调用支付**:
```javascript
wx.requestPayment({
  timeStamp: data.wechatPayParams.timeStamp,
  nonceStr: data.wechatPayParams.nonceStr,
  package: data.wechatPayParams.package,
  signType: data.wechatPayParams.signType,
  paySign: data.wechatPayParams.paySign,
  success: function(res) {
    // 支付成功
  }
})
```

---

### 3.4 支付回调（内部接口）

**接口**: `POST /api/v1/payment/callback`

**描述**: 微信支付回调接口（微信服务器调用，非前端）

**请求参数**: 微信支付回调数据（加密）

**处理逻辑**:
1. 验证签名
2. 解密数据
3. 更新订单状态为 `paid`
4. 生成核销码
5. 推送服务通知给用户

---

### 3.5 获取订单详情

**接口**: `GET /api/v1/order/:id`

**描述**: 获取订单详情（含实时计时信息）

**请求头**: 需要携带 Token

**路径参数**:
- `id`: 订单ID

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "orderId": 1001,
    "orderNo": "ORD20260204123456789",
    "boatTypeId": 1,
    "boatTypeName": "有动力船",
    "boatNumber": "E-001",  // 发船后才有
    "basePrice": 50.00,
    "depositAmount": 100.00,
    "totalAmount": 150.00,
    "includedMinutes": 60,
    "overtimeRate": 1.00,
    "verificationCode": "VF123456789ABC",  // 支付成功后生成
    "status": "timing",
    "startTime": "2026-02-04 13:00:00",  // 发船时间
    "endTime": null,
    "usedMinutes": 45,  // 实时计算
    "overtime Minutes": 0,
    "overtimeFee": 0.00,
    "estimatedTotalFee": 50.00,  // 预估最终费用
    "createdAt": "2026-02-04 12:34:56"
  },
  "timestamp": 1675584000000
}
```

**状态说明**:
- `pending`: 待支付 -> 显示支付按钮
- `paid`: 已支付，待核销 -> 显示核销码
- `verified`: 已核销，待发船 -> 显示"等待发船"
- `timing`: 计时中 -> 显示计时看板
- `ended`: 已结束，待结算 -> 显示"结算中"
- `completed`: 已完成 -> 显示最终账单

---

### 3.6 获取订单列表

**接口**: `GET /api/v1/order/list`

**描述**: 获取用户的订单列表（分页）

**请求头**: 需要携带 Token

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认10）
- `status`: 订单状态筛选（可选）

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "list": [
      {
        "orderId": 1001,
        "orderNo": "ORD20260204123456789",
        "boatTypeName": "有动力船",
        "boatNumber": "E-001",
        "status": "completed",
        "totalAmount": 150.00,
        "finalAmount": 50.00,
        "refundAmount": 100.00,
        "createdAt": "2026-02-04 12:34:56",
        "completedAt": "2026-02-04 14:05:00"
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 10
  },
  "timestamp": 1675584000000
}
```

---

### 3.7 取消订单

**接口**: `POST /api/v1/order/:id/cancel`

**描述**: 取消未支付或已支付但未核销的订单

**请求头**: 需要携带 Token

**路径参数**:
- `id`: 订单ID

**请求参数**: 无

**响应**:
```json
{
  "code": 200,
  "message": "订单已取消",
  "data": {
    "orderId": 1001,
    "status": "cancelled",
    "refundAmount": 150.00  // 如果已支付则原路退款
  },
  "timestamp": 1675584000000
}
```

---

## 4. 员工端接口

### 4.1 扫码核销

**接口**: `POST /api/v1/verification/scan`

**描述**: 员工扫描用户的核销码，判断是发船还是收船

**请求头**: 需要携带 Token（员工Token）

**请求参数**:
```json
{
  "verificationCode": "VF123456789ABC"  // 核销码
}
```

**响应（待发船）**:
```json
{
  "code": 200,
  "message": "扫码成功，请绑定船号",
  "data": {
    "orderId": 1001,
    "orderNo": "ORD20260204123456789",
    "boatTypeName": "有动力船",
    "action": "start",  // start表示这是发船操作
    "userNickname": "张三",
    "basePrice": 50.00,
    "depositAmount": 100.00,
    "includedMinutes": 60
  },
  "timestamp": 1675584000000
}
```

**响应（待收船）**:
```json
{
  "code": 200,
  "message": "扫码成功，请确认结束",
  "data": {
    "orderId": 1001,
    "orderNo": "ORD20260204123456789",
    "boatTypeName": "有动力船",
    "boatNumber": "E-001",
    "action": "end",  // end表示这是收船操作
    "startTime": "2026-02-04 13:00:00",
    "usedMinutes": 75,  // 已用时长
    "includedMinutes": 60,
    "overtimeMinutes": 15,
    "overtimeFee": 15.00,
    "refundAmount": 85.00,  // 应退押金
    "finalAmount": 65.00   // 最终费用（基础票价50 + 超时费15）
  },
  "timestamp": 1675584000000
}
```

---

### 4.2 发船（开始计时）

**接口**: `POST /api/v1/verification/start`

**描述**: 员工绑定船号，开始计时

**请求头**: 需要携带 Token（员工Token）

**请求参数**:
```json
{
  "orderId": 1001,
  "boatNumber": "E-001"  // 船号
}
```

**响应**:
```json
{
  "code": 200,
  "message": "发船成功，已开始计时",
  "data": {
    "orderId": 1001,
    "boatNumber": "E-001",
    "startTime": "2026-02-04 13:00:00",
    "status": "timing"
  },
  "timestamp": 1675584000000
}
```

**业务逻辑**:
1. 验证船号是否存在且状态为 `idle`
2. 更新船只状态为 `in_use`
3. 更新订单状态为 `timing`
4. 记录开始计时时间到 `orders.start_time` 和 `timing_records`
5. Redis 缓存计时信息
6. 推送服务通知给用户"计时已开始"
7. 记录核销日志（action_type: start）

---

### 4.3 收船（结束计时）

**接口**: `POST /api/v1/verification/end`

**描述**: 员工确认收船，结束计时并结算

**请求头**: 需要携带 Token（员工Token）

**请求参数**:
```json
{
  "orderId": 1001
}
```

**响应**:
```json
{
  "code": 200,
  "message": "收船成功，已结算",
  "data": {
    "orderId": 1001,
    "boatNumber": "E-001",
    "startTime": "2026-02-04 13:00:00",
    "endTime": "2026-02-04 14:15:00",
    "usedMinutes": 75,
    "overtimeMinutes": 15,
    "overtimeFee": 15.00,
    "refundAmount": 85.00,
    "finalAmount": 65.00,
    "status": "completed"
  },
  "timestamp": 1675584000000
}
```

**业务逻辑**:
1. 停止计时，计算总时长
2. 计算超时费用
3. 更新船只状态为 `idle`
4. 更新订单状态为 `ended`
5. 发起微信退款（异步）
6. 退款成功后更新订单状态为 `completed`
7. 推送服务通知给用户"订单已完成，押金已退还"
8. 记录核销日志（action_type: end）

---

### 4.4 船号反查订单

**接口**: `GET /api/v1/verification/boat/:boatNumber`

**描述**: 通过船号查找当前使用中的订单（用于游客手机没电的场景）

**请求头**: 需要携带 Token（员工Token）

**路径参数**:
- `boatNumber`: 船号（如 E-001）

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "orderId": 1001,
    "orderNo": "ORD20260204123456789",
    "boatNumber": "E-001",
    "boatTypeName": "有动力船",
    "userNickname": "张三",
    "status": "timing",
    "startTime": "2026-02-04 13:00:00",
    "usedMinutes": 75
  },
  "timestamp": 1675584000000
}
```

**异常情况**:
```json
{
  "code": 404,
  "message": "该船号当前无使用中的订单",
  "data": null,
  "timestamp": 1675584000000
}
```

---

### 4.5 强制结束订单（管理员权限）

**接口**: `POST /api/v1/verification/force-end`

**描述**: 管理员强制结束异常订单（如恶意不归还、遗忘处理等）

**请求头**: 需要携带 Token（管理员Token）

**请求参数**:
```json
{
  "orderId": 1001,
  "reason": "游客恶意不归还，船只已找回"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "订单已强制结束",
  "data": {
    "orderId": 1001,
    "status": "completed",
    "remark": "游客恶意不归还，船只已找回"
  },
  "timestamp": 1675584000000
}
```

---

### 4.6 获取待处理订单列表

**接口**: `GET /api/v1/verification/pending`

**描述**: 获取所有"计时中"的订单列表（工作台监控）

**请求头**: 需要携带 Token（员工Token）

**查询参数**: 无

**响应**:
```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "orderId": 1001,
      "orderNo": "ORD20260204123456789",
      "boatNumber": "E-001",
      "boatTypeName": "有动力船",
      "userNickname": "张三",
      "startTime": "2026-02-04 13:00:00",
      "usedMinutes": 75,
      "isOvertime": true,
      "overtimeMinutes": 15
    },
    {
      "orderId": 1002,
      "orderNo": "ORD20260204123456790",
      "boatNumber": "P-005",
      "boatTypeName": "无动力船",
      "userNickname": "李四",
      "startTime": "2026-02-04 13:30:00",
      "usedMinutes": 45,
      "isOvertime": false,
      "overtimeMinutes": 0
    }
  ],
  "timestamp": 1675584000000
}
```

---

## 5. 管理后台接口（后期扩展）

### 5.1 价格配置管理

**接口**: `POST /api/v1/admin/pricing/config`

**描述**: 创建或更新价格配置

---

### 5.2 财务报表

**接口**: `GET /api/v1/admin/report/daily`

**描述**: 获取每日财务报表

---

## 6. WebSocket 接口（实时计时推送）

### 6.1 连接地址

```
wss://api.boat-rental.com/ws/timing?token=xxx
```

### 6.2 消息格式

**服务端推送（每5秒推送一次）**:
```json
{
  "type": "timing_update",
  "data": {
    "orderId": 1001,
    "usedMinutes": 75,
    "overtimeMinutes": 15,
    "overtimeFee": 15.00,
    "estimatedTotalFee": 65.00
  }
}
```

**连接心跳**:
```json
{
  "type": "ping"
}
```

**客户端响应**:
```json
{
  "type": "pong"
}
```

---

## 7. 错误码汇总

| 错误码 | 说明                         | 解决方案                           |
| ------ | ---------------------------- | ---------------------------------- |
| 10001  | 订单不存在                   | 检查订单ID是否正确                 |
| 10002  | 订单状态不正确               | 检查订单当前状态，不能重复操作     |
| 10003  | 核销码无效或已使用           | 核销码只能使用一次                 |
| 10004  | 订单已超时（超过24小时）     | 联系管理员处理                     |
| 20001  | 支付失败                     | 重试支付或联系客服                 |
| 20002  | 退款失败                     | 系统会自动重试，或联系客服处理     |
| 30001  | 船只不存在或不可用           | 检查船号是否正确，或选择其他船只   |
| 30002  | 船只正在使用中               | 该船号已被占用，请选择其他船只     |
| 401    | Token失效或未登录            | 重新登录获取Token                  |
| 403    | 无权限（非管理员）           | 需要管理员权限才能执行该操作       |

---

## 8. 接口调用示例（小程序端）

### 8.1 用户购票流程

```javascript
// 1. 获取船型列表
const boatTypes = await wx.request({
  url: '/api/v1/boats/types',
  header: { Authorization: `Bearer ${token}` }
})

// 2. 创建订单
const order = await wx.request({
  url: '/api/v1/order/create',
  method: 'POST',
  data: { boatTypeId: 1 },
  header: { Authorization: `Bearer ${token}` }
})

// 3. 发起支付
const payment = await wx.request({
  url: '/api/v1/payment/prepay',
  method: 'POST',
  data: { orderId: order.orderId },
  header: { Authorization: `Bearer ${token}` }
})

// 4. 调起微信支付
wx.requestPayment({
  ...payment.wechatPayParams,
  success: () => {
    // 支付成功，跳转到订单详情页
    wx.navigateTo({ url: `/pages/order/detail?id=${order.orderId}` })
  }
})
```

### 8.2 员工核销流程

```javascript
// 1. 扫码
wx.scanCode({
  success: async (res) => {
    // 2. 调用核销接口
    const result = await wx.request({
      url: '/api/v1/verification/scan',
      method: 'POST',
      data: { verificationCode: res.result },
      header: { Authorization: `Bearer ${staffToken}` }
    })

    if (result.data.action === 'start') {
      // 3a. 发船：弹出输入船号
      wx.showModal({
        title: '请输入船号',
        editable: true,
        success: async (modal) => {
          await wx.request({
            url: '/api/v1/verification/start',
            method: 'POST',
            data: {
              orderId: result.data.orderId,
              boatNumber: modal.content
            },
            header: { Authorization: `Bearer ${staffToken}` }
          })
          wx.showToast({ title: '发船成功' })
        }
      })
    } else if (result.data.action === 'end') {
      // 3b. 收船：显示账单预览
      wx.showModal({
        title: '收船结算',
        content: `使用时长: ${result.data.usedMinutes}分钟\n超时费用: ${result.data.overtimeFee}元\n退款金额: ${result.data.refundAmount}元`,
        success: async () => {
          await wx.request({
            url: '/api/v1/verification/end',
            method: 'POST',
            data: { orderId: result.data.orderId },
            header: { Authorization: `Bearer ${staffToken}` }
          })
          wx.showToast({ title: '收船成功' })
        }
      })
    }
  }
})
```

---

**文档结束**

下一步请参考 [技术方案设计文档](../design/技术方案设计文档.md) 和 [数据库设计文档](../database/数据库设计文档.md) 进行后端开发。

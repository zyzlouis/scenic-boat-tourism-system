# 云函数说明

## 📁 云函数列表

### 用户端云函数
1. **getBoatTypes** - 获取船型列表
2. **createOrder** - 创建订单
3. **getOrderDetail** - 获取订单详情
4. **getOrderList** - 获取订单列表

### 员工端云函数
5. **scanCode** - 扫码核销
6. **startTrip** - 发船（开始计时）
7. **endTrip** - 收船（结束计时）
8. **findByBoatNumber** - 船号反查订单
9. **getPendingOrders** - 获取待处理订单列表
10. **login** - 员工登录

---

## 🚀 部署云函数

### 1. 在微信开发者工具中部署

1. 打开微信开发者工具
2. 右键点击云函数目录（如 `getBoatTypes`）
3. 选择 **上传并部署：云端安装依赖**
4. 等待部署完成

### 2. 批量部署所有云函数

```bash
# 在项目根目录执行
for dir in cloudfunctions/*; do
  if [ -d "$dir" ]; then
    echo "部署 $dir"
    # 使用微信开发者工具命令行工具部署
    # 或手动在开发者工具中部署
  fi
done
```

---

## 📖 云函数使用示例

### 在小程序中调用云函数

```javascript
// 调用getBoatTypes云函数
wx.cloud.callFunction({
  name: 'getBoatTypes',
  data: {}
}).then(res => {
  console.log('船型列表:', res.result.data)
}).catch(err => {
  console.error('调用失败:', err)
})

// 调用createOrder云函数
wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    boatTypeId: 'boat_type_id_here'
  }
}).then(res => {
  console.log('订单创建成功:', res.result.data)
})

// 调用scanCode云函数（员工端）
wx.cloud.callFunction({
  name: 'scanCode',
  data: {
    verificationCode: 'VF123456ABC',
    staffId: 'staff_id_here'
  }
}).then(res => {
  console.log('扫码结果:', res.result.data)
})
```

---

## 🔧 云函数配置

每个云函数都需要 `package.json` 文件：

```json
{
  "name": "functionName",
  "version": "1.0.0",
  "description": "云函数描述",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

---

## 🔐 权限说明

云函数运行在服务端，拥有完整的数据库权限，可以：
- 读写所有集合
- 不受客户端权限限制
- 保证数据安全性

---

## ⚠️ 注意事项

1. **云函数超时**：默认超时时间为 20 秒
2. **并发限制**：免费版有并发限制，按需升级
3. **内存限制**：单个云函数最大 256MB 内存
4. **冷启动**：首次调用或长时间未调用会有冷启动时间
5. **日志查看**：在云开发控制台查看云函数日志

---

## 📊 云函数监控

在云开发控制台可以查看：
- 调用次数
- 错误率
- 平均响应时间
- 日志详情

---

## 🔄 更新云函数

修改云函数代码后：
1. 右键点击云函数目录
2. 选择 **上传并部署：云端安装依赖**
3. 等待部署完成

---

## 💡 优化建议

1. **减少数据库查询次数**：使用嵌入文档减少关联查询
2. **使用缓存**：对于不常变化的数据，可以使用云存储缓存
3. **异步处理**：对于耗时操作，考虑使用异步队列
4. **错误处理**：完善错误处理和日志记录
5. **性能监控**：定期查看云函数性能指标

---

**云函数部署完成后，即可在小程序中调用！**

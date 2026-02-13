# Web 管理后台部署文档

## 📋 方案说明

### 技术架构
- **前端**: 单个 HTML 文件（Vue 3 + Element Plus + CDN）
- **数据库**: 微信云开发云数据库（通过 @cloudbase/js-sdk 直接操作）
- **部署**: 云开发静态网站托管（免费、零配置）
- **认证**: 云函数验证管理员权限

### 方案优势
- ✅ **零部署成本** - 无需服务器，完全免费
- ✅ **零运维成本** - 静态文件，无需维护
- ✅ **完全自主可控** - 源码在手，随时修改
- ✅ **安全可靠** - 管理员权限验证，数据库直连
- ✅ **现代化 UI** - Element Plus 组件库，美观易用

---

## 🚀 部署步骤

### 第一步：修改环境ID

打开 `admin-web/index.html` 文件，找到第 468 行左右：

```javascript
// 请在这里配置你的云开发环境ID
const ENV_ID = 'YOUR_ENV_ID'; // 替换为你的环境ID
```

**替换为你的云开发环境ID**，例如：
```javascript
const ENV_ID = 'cloud1-XXXXX';
```

**如何获取环境ID？**
1. 打开微信开发者工具
2. 点击左侧"云开发"按钮
3. 在云开发控制台顶部可以看到环境ID

---

### 第二步：部署云函数

在微信开发者工具中，依次部署以下云函数：

#### 1. staffLogin（已存在）
- 右键 `cloudfunctions/staffLogin`
- 选择【上传并部署：云端安装依赖】
- 等待部署完成

#### 2. createStaff（新建）
- 右键 `cloudfunctions/createStaff`
- 选择【上传并部署：云端安装依赖】
- 等待部署完成

#### 3. updateStaffPassword（新建）
- 右键 `cloudfunctions/updateStaffPassword`
- 选择【上传并部署：云端安装依赖】
- 等待部署完成

---

### 第三步：开通静态网站托管

1. 在微信开发者工具中，点击左侧"云开发"
2. 进入云开发控制台
3. 点击左侧菜单【静态网站】
4. 点击【开通】按钮（免费）
5. 等待开通完成

---

### 第四步：上传管理后台文件

#### 方法一：通过云开发控制台上传

1. 在云开发控制台，点击【静态网站】
2. 点击【文件管理】
3. 点击【上传文件】按钮
4. 选择 `admin-web/index.html` 文件
5. 上传完成后，记住文件访问链接

#### 方法二：通过命令行上传（推荐）

```bash
# 安装 cloudbase cli
npm install -g @cloudbase/cli

# 登录
cloudbase login

# 上传文件
cloudbase hosting deploy admin-web/index.html -e <你的环境ID>
```

---

### 第五步：访问管理后台

上传成功后，访问链接格式为：
```
https://<你的环境ID>.web.cdn.myqcloud.com/index.html
```

例如：
```
https://cloud1-XXXXX.web.cdn.myqcloud.com/index.html
```

---

## 🔑 登录说明

### 默认管理员账号

使用你数据库中 `staff` 集合里 `role=admin` 的账号登录。

如果还没有管理员账号，需要先在云开发控制台手动创建：

1. 打开云开发控制台
2. 点击【数据库】
3. 选择 `staff` 集合
4. 点击【添加记录】
5. 添加以下数据：

```json
{
  "username": "admin",
  "password": "$2a$10$YourBcryptHashedPassword",
  "realName": "系统管理员",
  "phone": "",
  "role": "admin",
  "enabled": true,
  "createdAt": { "$date": "2026-02-12T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-02-12T00:00:00.000Z" }
}
```

**重要提示**：密码字段需要是 bcrypt 加密后的哈希值。

### 快速创建管理员账号

**临时方案**：先创建一个测试密码，然后在管理后台修改：

1. 使用在线 bcrypt 生成器：https://bcrypt-generator.com/
2. 输入密码（例如：admin123），生成哈希值
3. 将哈希值填入数据库的 `password` 字段

---

## 📱 功能说明

### 1. 船型管理
- ✅ 查看所有船型
- ✅ 新增船型（支持图片上传）
- ✅ 编辑船型信息
- ✅ 删除船型
- ✅ 配置价格（基础票价、押金、包含时长、超时费率）

### 2. 船只管理
- ✅ 查看所有船只
- ✅ 新增船只
- ✅ 编辑船只信息
- ✅ 删除船只
- ✅ 切换船只状态（空闲/使用中/维护中）

### 3. 员工管理
- ✅ 查看所有员工
- ✅ 新增员工（自动加密密码）
- ✅ 编辑员工信息
- ✅ 修改员工密码
- ✅ 删除员工
- ✅ 配置角色（员工/管理员）

### 4. 轮播图管理
- ✅ 查看所有轮播图
- ✅ 新增轮播图（支持图片上传）
- ✅ 编辑轮播图
- ✅ 删除轮播图
- ✅ 配置跳转链接（无链接/小程序页面/外部链接）
- ✅ 排序管理

### 5. 公告管理
- ✅ 查看所有公告
- ✅ 新增公告
- ✅ 编辑公告
- ✅ 删除公告
- ✅ 配置公告类型（通知/警告/紧急）
- ✅ 设置有效期
- ✅ 控制首页显示

---

## 🔒 安全说明

### 权限控制
- ✅ 只有 `role=admin` 的员工才能登录后台
- ✅ 登录状态保存在 localStorage，关闭浏览器需要重新登录
- ✅ 员工密码使用 bcrypt 加密存储

### 数据库安全
- ⚠️ 当前方案使用 JS SDK 直接操作数据库
- ⚠️ 需要在云开发控制台配置数据库权限规则
- ⚠️ 建议生产环境使用更严格的安全规则

**推荐数据库权限配置**：

```json
{
  "read": false,
  "write": false
}
```

所有操作都通过云函数进行，JS SDK 仅作为备用方案。

---

## 🎨 自定义修改

### 修改页面标题
找到第 6 行：
```html
<title>景区游船管理后台</title>
```

### 修改侧边栏标题
找到第 132 行：
```html
<div class="sidebar-header">游船管理系统</div>
```

### 修改顶部标题
找到第 151 行：
```html
<div class="login-title">景区游船管理后台</div>
```

### 添加新的管理模块
参考现有的船型管理、船只管理等模块，复制代码并修改即可。

---

## 🐛 常见问题

### 1. 无法登录
- ✅ 检查环境ID是否配置正确
- ✅ 检查 staffLogin 云函数是否部署成功
- ✅ 检查数据库中是否有 role=admin 的员工记录

### 2. 图片上传失败
- ✅ 检查云存储是否开通
- ✅ 检查文件大小（建议小于 2MB）
- ✅ 检查文件格式（支持 jpg、png、gif）

### 3. 数据加载失败
- ✅ 打开浏览器控制台查看错误信息
- ✅ 检查云开发环境是否正常
- ✅ 检查网络连接

### 4. 修改后不生效
- ✅ 清除浏览器缓存（Ctrl+Shift+Delete）
- ✅ 强制刷新（Ctrl+F5）
- ✅ 重新上传 HTML 文件

---

## 📞 技术支持

如有问题，请参考：
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [CloudBase JS SDK 文档](https://docs.cloudbase.net/api-reference/webv2/initialization)
- [Element Plus 文档](https://element-plus.org/zh-CN/)

---

## 📝 更新日志

### v1.0.0 (2026-02-12)
- ✅ 初始版本
- ✅ 支持 6 个数据集合的 CRUD 操作
- ✅ 支持图片上传到云存储
- ✅ 支持管理员登录验证

---

**部署完成后，即可通过浏览器访问管理后台进行数据管理！**

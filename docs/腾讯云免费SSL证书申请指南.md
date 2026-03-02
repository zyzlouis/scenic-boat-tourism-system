# 腾讯云免费SSL证书申请指南

## 前提条件

- 已注册腾讯云账号（实名认证完成）
- 已购买域名（任意注册商均可，不一定要在腾讯云买）
- 域名已完成ICP备案

## 第一步：进入SSL证书控制台

1. 打开浏览器，访问 https://console.cloud.tencent.com/ssl
2. 登录你的腾讯云账号
3. 进入「SSL证书」页面

## 第二步：申请免费证书

1. 点击页面上的「申请免费证书」按钮
2. 证书类型选择「TrustAsia DV 型」（这是免费的，有效期1年）
3. 填写以下信息：
   - 域名：填你要绑定的域名，比如 `api.example.com`
   - 注意：免费证书只支持单域名，不支持通配符（`*.example.com`）
   - 如果你需要给 `api.example.com` 和 `admin.example.com` 都加SSL，需要分别申请两张证书
4. 申请人信息：填写邮箱即可
5. 点击「提交申请」

## 第三步：验证域名所有权

申请提交后，需要验证你是域名的所有者。有三种验证方式：

### 方式一：DNS验证（推荐）

1. 系统会给你一条DNS解析记录，包含：
   - 主机记录（如 `_dnsauth`）
   - 记录类型（CNAME 或 TXT）
   - 记录值（一串字符）
2. 登录你的域名管理后台（域名在哪买的就去哪）
3. 添加一条DNS解析记录，把上面的信息填进去
4. 回到腾讯云SSL页面，点击「验证」
5. DNS生效需要几分钟到几小时不等，耐心等待

### 方式二：文件验证

1. 系统会给你一个验证文件
2. 下载这个文件
3. 上传到你服务器的网站根目录下的 `.well-known/pki-validation/` 路径
4. 确保通过 `http://你的域名/.well-known/pki-validation/文件名` 能访问到
5. 回到腾讯云点击「验证」

### 方式三：自动DNS验证

如果你的域名就是在腾讯云（DNSPod）解析的，可以选择自动验证，系统会自动添加DNS记录，最省事。

## 第四步：下载证书

验证通过后（通常几分钟内），证书状态变为「已颁发」：

1. 在证书列表中找到刚申请的证书
2. 点击「下载」
3. 选择你的服务器类型：
   - Nginx（最常用）→ 下载后得到 `.pem` 和 `.key` 文件
   - Apache → 下载后得到 `.crt`、`.key`、`.chain` 文件
   - Tomcat → 下载后得到 `.jks` 文件
   - 其他 → 按需选择
4. 一般选 Nginx 就行

## 第五步：部署到服务器（以Nginx为例）

1. 把下载的证书文件上传到服务器，建议放在 `/etc/nginx/ssl/` 目录下：

```bash
# 在服务器上创建目录
mkdir -p /etc/nginx/ssl

# 把 .pem 和 .key 文件上传到这个目录
# 可以用 scp 命令或 FTP 工具上传
```

2. 修改 Nginx 配置文件，添加SSL配置：

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;  # 改成你的域名

    ssl_certificate /etc/nginx/ssl/api.example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/api.example.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;  # 转发到你的后端服务端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTP自动跳转HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}
```

3. 测试配置并重启Nginx：

```bash
# 测试配置是否正确
nginx -t

# 重启Nginx
systemctl reload nginx
```

4. 在浏览器访问 `https://api.example.com`，看到小锁图标就说明SSL部署成功了

## 常见问题

**Q：免费证书有效期多久？**
A：1年。到期前腾讯云会发邮件提醒，届时重新申请一张即可。

**Q：一个账号能申请多少张免费证书？**
A：每个主域名可申请20张免费证书。

**Q：免费证书和付费证书有什么区别？**
A：免费证书是DV型（域名验证），只验证域名所有权。付费证书有OV/EV型，会验证企业身份，浏览器地址栏显示企业名称。对于API服务来说，免费DV证书完全够用。

**Q：证书快到期了怎么办？**
A：重新申请一张新的免费证书，下载后替换服务器上的旧证书文件，重启Nginx即可。

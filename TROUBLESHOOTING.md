# 部署问题排查与解决方案

根据你之前的部署过程,这里是针对性的解决方案。

## 🔴 问题1: 端口占用

### 症状
```
Error: listen EADDRINUSE: address already in use :::3000
```

### 解决方案
```bash
# 查找占用端口的进程
lsof -i:3000
# 或
sudo netstat -tlnp | grep :3000

# 方法1: 杀死占用的进程
kill -9 <PID>

# 方法2: 停止所有 PM2 进程
pm2 delete all

# 方法3: 杀死所有 node 进程
pkill -f "node"

# 方法4: 使用修复脚本(推荐)
bash fix-deployment.sh
```

## 🔴 问题2: 构建文件缺失

### 症状
```
Error: ENOENT: no such file or directory, open '.next/prerender-manifest.json'
```

### 原因
- 没有执行 `npm run build`
- 构建过程中断或失败
- `.next` 目录被误删除

### 解决方案
```bash
cd /www/wwwroot/law-enforcement

# 1. 清理旧的构建文件
rm -rf .next
rm -rf node_modules/.cache

# 2. 确保依赖已安装
npm install

# 3. 重新构建
npm run build

# 4. 验证构建结果
ls -la .next/
cat .next/BUILD_ID

# 5. 如果构建成功,应该看到这些文件
# .next/BUILD_ID
# .next/prerender-manifest.json
# .next/routes-manifest.json
# .next/server/
```

### 如果构建失败
```bash
# 查看详细的构建日志
npm run build 2>&1 | tee build.log

# 常见构建错误:
# 1. 内存不足 - 增加 swap 空间
# 2. TypeScript 错误 - 检查代码语法
# 3. 依赖缺失 - 重新安装依赖
```

## 🔴 问题3: PM2 状态异常

### 症状
```
│ next-app │ errored │
```

### 解决方案
```bash
# 1. 查看详细错误日志
pm2 logs law-enforcement --lines 100

# 2. 删除所有 PM2 进程
pm2 delete all

# 3. 确保构建完成
npm run build

# 4. 使用正确的配置重新启动
pm2 start ecosystem.config.js

# 5. 实时监控启动过程
pm2 logs law-enforcement --lines 0

# 6. 检查状态
pm2 status
```

### 常见 PM2 错误

#### 错误: "Error: Cannot find module 'next'"
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

#### 错误: "Port already in use"
```bash
# 使用修复脚本清理端口
bash fix-deployment.sh
```

## 🔴 问题4: Nginx 502 Bad Gateway

### 症状
访问 `http://wwww.deepseek2046.com` 返回 502 错误

### 排查步骤

#### 步骤1: 检查后端应用是否运行
```bash
# 检查 PM2 状态
pm2 status

# 测试本地访问
curl http://localhost:3000
curl -I http://localhost:3000

# 应该返回 200 或 304 状态码
```

#### 步骤2: 检查 Nginx 配置
```bash
# 测试配置文件语法
sudo nginx -t

# 查看配置文件
cat /etc/nginx/sites-enabled/law-enforcement

# 重新加载配置
sudo systemctl reload nginx
```

#### 步骤3: 检查 Nginx 错误日志
```bash
# 实时查看错误日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/law-enforcement-error.log

# 常见错误信息:
# - "Connection refused" - 后端应用未运行
# - "upstream timed out" - 后端响应超时
# - "Permission denied" - SELinux 权限问题
```

### 解决方案

#### 方案1: 后端应用未运行
```bash
cd /www/wwwroot/law-enforcement
pm2 restart law-enforcement
# 或重新部署
bash fix-deployment.sh
```

#### 方案2: 端口配置错误
检查 `nginx.conf` 中的 `proxy_pass` 是否正确:
```nginx
location / {
    proxy_pass http://localhost:3000;  # 确保端口正确
}
```

如果你的应用运行在 3002 端口:
```bash
# 修改 Nginx 配置
sudo nano /etc/nginx/sites-available/law-enforcement

# 将 proxy_pass http://localhost:3000; 改为
# proxy_pass http://localhost:3002;

# 重新加载
sudo nginx -t
sudo systemctl reload nginx
```

#### 方案3: SELinux 权限问题 (CentOS/RHEL)
```bash
# 检查 SELinux 状态
getenforce

# 临时禁用测试
sudo setenforce 0

# 如果问题解决,配置 SELinux 规则
sudo setsebool -P httpd_can_network_connect 1

# 重新启用
sudo setenforce 1
```

#### 方案4: 防火墙问题
```bash
# Ubuntu (UFW)
sudo ufw allow 3000/tcp
sudo ufw reload

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 🔴 问题5: 环境变量未生效

### 症状
应用无法调用 DeepSeek API

### 解决方案
```bash
cd /www/wwwroot/law-enforcement

# 1. 检查 .env 文件
cat .env

# 2. 确保 DEEPSEEK_API_KEY 已配置
grep DEEPSEEK_API_KEY .env

# 3. 如果缺失,手动添加
echo "DEEPSEEK_API_KEY=your_actual_api_key" >> .env

# 4. 重启应用使配置生效
pm2 restart law-enforcement

# 5. 验证环境变量
pm2 env 0  # 0 是应用 ID
```

## 📋 完整修复流程

使用以下脚本一键修复所有问题:

```bash
cd /www/wwwroot/law-enforcement

# 1. 运行状态检查
bash check-server.sh

# 2. 运行修复脚本
bash fix-deployment.sh

# 3. 验证部署
curl http://localhost:3000
curl http://wwww.deepseek2046.com
```

## 🔍 调试技巧

### 查看应用日志
```bash
# PM2 日志
pm2 logs law-enforcement --lines 100

# 仅错误日志
pm2 logs law-enforcement --err

# 实时日志
pm2 logs law-enforcement --lines 0
```

### 查看 Nginx 日志
```bash
# 访问日志
sudo tail -f /var/log/nginx/law-enforcement-access.log

# 错误日志
sudo tail -f /var/log/nginx/law-enforcement-error.log
```

### 手动测试应用
```bash
cd /www/wwwroot/law-enforcement

# 停止 PM2
pm2 stop all

# 手动启动查看详细输出
npm run start

# 在另一个终端测试
curl http://localhost:3000
```

### 检查系统资源
```bash
# 内存使用
free -h

# 磁盘空间
df -h

# CPU 使用
top -bn1 | head -20

# 进程监控
pm2 monit
```

## ⚠️ 常见错误代码

| HTTP状态码 | 含义 | 可能原因 | 解决方案 |
|-----------|------|---------|---------|
| 502 | Bad Gateway | 后端应用未运行或无响应 | 检查PM2状态,重启应用 |
| 503 | Service Unavailable | 服务暂时不可用 | 检查应用是否正在启动 |
| 504 | Gateway Timeout | 后端响应超时 | 增加Nginx超时时间 |
| 500 | Internal Server Error | 应用内部错误 | 查看应用日志 |

## 🆘 紧急恢复步骤

如果一切都失败了:

```bash
# 1. 完全停止
pm2 delete all
sudo systemctl stop nginx

# 2. 清理端口
pkill -f "node"
pkill -f "next"

# 3. 清理项目
cd /www/wwwroot/law-enforcement
rm -rf .next node_modules

# 4. 重新开始
npm install
npm run build
bash fix-deployment.sh

# 5. 启动 Nginx
sudo systemctl start nginx
```

## 📞 还是无法解决?

1. 运行完整检查: `bash check-server.sh > status.txt`
2. 收集日志: `pm2 logs law-enforcement --lines 200 > app.log`
3. 提供以下信息:
   - 服务器系统版本: `cat /etc/os-release`
   - Node.js 版本: `node -v`
   - 错误日志: `status.txt` 和 `app.log`
   - Nginx 错误日志: `/var/log/nginx/error.log`
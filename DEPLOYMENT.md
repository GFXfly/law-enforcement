# 阿里云服务器部署指南

本指南将帮助你将 Law Enforcement 项目部署到阿里云服务器（wwww.deepseek2046.com）。

## 📋 前置要求

### 服务器要求
- 操作系统: Ubuntu 20.04+ 或 CentOS 7+
- 内存: 至少 2GB RAM
- 硬盘: 至少 10GB 可用空间
- 已开放端口: 80, 443 (如需 HTTPS)

### 软件要求
- Node.js 18+
- npm 9+
- PM2 (进程管理器)
- Nginx (反向代理)

## 🚀 部署步骤

### 1. 准备服务器环境

#### 1.1 SSH 登录服务器
```bash
ssh root@your_server_ip
```

#### 1.2 安装 Node.js 18+
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

#### 1.3 安装 PM2
```bash
npm install -g pm2
```

#### 1.4 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

### 2. 上传项目文件

#### 方法一: 使用 Git（推荐）
```bash
# 在服务器上创建项目目录
sudo mkdir -p /www/wwwroot/law-enforcement
sudo chown -R $USER:$USER /www/wwwroot/law-enforcement
cd /www/wwwroot/law-enforcement

# 克隆项目
git clone <your-git-repo-url> .

# 或者如果已有仓库
git pull origin main
```

#### 方法二: 使用 SCP 上传
在本地电脑上执行:
```bash
# 打包项目（排除 node_modules）
cd /Users/gaofeixiang/Desktop/law-enforcement
tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf law-enforcement.tar.gz .

# 上传到服务器
scp law-enforcement.tar.gz root@your_server_ip:/tmp/

# 在服务器上解压
ssh root@your_server_ip
sudo mkdir -p /www/wwwroot/law-enforcement
cd /www/wwwroot/law-enforcement
sudo tar -xzf /tmp/law-enforcement.tar.gz
sudo chown -R $USER:$USER /www/wwwroot/law-enforcement
```

### 3. 配置环境变量

```bash
cd /www/wwwroot/law-enforcement

# 复制生产环境配置
cp .env.production .env

# 编辑配置文件，填入真实的 DeepSeek API Key
nano .env
# 或
vi .env
```

修改 `.env` 文件中的 `DEEPSEEK_API_KEY`:
```bash
DEEPSEEK_API_KEY=your_actual_deepseek_api_key
```

### 4. 配置 Nginx

```bash
# 复制 Nginx 配置文件
sudo cp nginx.conf /etc/nginx/sites-available/law-enforcement

# 创建软链接
sudo ln -sf /etc/nginx/sites-available/law-enforcement /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 5. 运行部署脚本

```bash
cd /www/wwwroot/law-enforcement

# 给部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

部署脚本会自动:
- ✅ 检查环境
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 启动 PM2 进程
- ✅ 配置开机自启

### 6. 配置域名解析

在你的域名管理平台（如阿里云域名控制台）:

1. 添加 A 记录:
   - 主机记录: `wwww`
   - 记录类型: `A`
   - 记录值: `你的服务器IP`
   - TTL: `600`

2. 添加 www 前缀（可选）:
   - 主机记录: `www.wwww`
   - 记录类型: `CNAME`
   - 记录值: `wwww.deepseek2046.com`

等待 DNS 解析生效（通常 5-10 分钟）。

### 7. 验证部署

```bash
# 检查应用状态
pm2 status

# 查看日志
pm2 logs law-enforcement

# 测试本地访问
curl http://localhost:3000
```

在浏览器访问: `http://wwww.deepseek2046.com`

## 🔒 配置 HTTPS (可选但推荐)

### 方法一: 使用 Let's Encrypt (免费)

```bash
# 安装 Certbot
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d wwww.deepseek2046.com -d www.wwww.deepseek2046.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 方法二: 使用阿里云 SSL 证书

1. 在阿里云购买/申请免费 SSL 证书
2. 下载证书文件（Nginx 格式）
3. 上传到服务器:
```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp your_cert.crt /etc/nginx/ssl/wwww.deepseek2046.com.crt
sudo cp your_cert.key /etc/nginx/ssl/wwww.deepseek2046.com.key
sudo chmod 600 /etc/nginx/ssl/*
```

4. 启用 nginx.conf 中的 HTTPS 配置:
```bash
sudo nano /etc/nginx/sites-available/law-enforcement
# 取消注释 HTTPS server 块和 HTTP 重定向
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 常用运维命令

### PM2 管理
```bash
pm2 list                    # 查看所有应用
pm2 logs law-enforcement    # 查看日志
pm2 restart law-enforcement # 重启应用
pm2 stop law-enforcement    # 停止应用
pm2 delete law-enforcement  # 删除应用
pm2 monit                   # 监控应用
```

### 更新部署
```bash
cd /www/wwwroot/law-enforcement
git pull origin main        # 拉取最新代码
./deploy.sh                 # 重新部署
```

### 查看日志
```bash
# PM2 日志
pm2 logs law-enforcement --lines 100

# Nginx 日志
sudo tail -f /var/log/nginx/law-enforcement-access.log
sudo tail -f /var/log/nginx/law-enforcement-error.log
```

### 系统监控
```bash
# 查看系统资源
htop
# 或
top

# 查看端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

## 🐛 常见问题排查

### 1. 端口被占用
```bash
# 查找占用端口的进程
sudo lsof -i :3000
# 或
sudo netstat -tlnp | grep :3000

# 杀死进程
sudo kill -9 <PID>
```

### 2. Nginx 配置错误
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. 应用启动失败
```bash
# 查看详细日志
pm2 logs law-enforcement --err

# 检查环境变量
cat .env

# 手动启动测试
npm run start
```

### 4. 内存不足
```bash
# 查看内存使用
free -h

# 清理 PM2 日志
pm2 flush

# 增加交换空间（如需要）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 5. DeepSeek API 调用失败
```bash
# 检查 API Key
grep DEEPSEEK_API_KEY .env

# 测试 API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-reasoner","model_version":"v3.2","messages":[{"role":"user","content":"test"}]}'
```

## 🔐 安全建议

1. **配置防火墙**
```bash
# Ubuntu (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

2. **保护敏感文件**
```bash
chmod 600 .env
chmod 600 .env.production
```

3. **定期更新系统**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

4. **配置 fail2ban** (防止暴力破解)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📝 备份策略

### 自动备份脚本
创建 `/www/wwwroot/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/www/backup"
PROJECT_DIR="/www/wwwroot/law-enforcement"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/law-enforcement_$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  $PROJECT_DIR

# 只保留最近 7 天的备份
find $BACKUP_DIR -name "law-enforcement_*.tar.gz" -mtime +7 -delete
```

添加到 crontab (每天凌晨2点备份):
```bash
chmod +x /www/wwwroot/backup.sh
crontab -e
# 添加: 0 2 * * * /www/wwwroot/backup.sh
```

## 📞 获取帮助

如遇到问题:
1. 查看 PM2 日志: `pm2 logs law-enforcement`
2. 查看 Nginx 日志: `sudo tail -f /var/log/nginx/error.log`
3. 检查系统资源: `htop` 或 `free -h`
4. 验证配置文件: `sudo nginx -t`

---

**部署成功后访问**: http://wwww.deepseek2046.com

**祝部署顺利! 🎉**

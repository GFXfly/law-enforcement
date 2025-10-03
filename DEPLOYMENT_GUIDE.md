# 阿里云服务器部署指南 - www.deepseek2046.com

## 🚀 快速部署步骤

### 1. 服务器环境准备

```bash
# 登录服务器
ssh root@your_server_ip

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 上传项目文件

```bash
# 创建项目目录
sudo mkdir -p /www/wwwroot/law-enforcement
sudo chown -R $USER:$USER /www/wwwroot/law-enforcement
cd /www/wwwroot/law-enforcement

# 克隆项目（替换为你的GitHub仓库地址）
git clone https://github.com/GFXfly/law-enforcement.git .

# 或者从本地上传
# scp -r /path/to/your/project/* root@your_server_ip:/www/wwwroot/law-enforcement/
```

### 3. 配置环境变量

```bash
cd /www/wwwroot/law-enforcement

# 复制配置模板
cp env.production.template .env

# 编辑配置文件
nano .env
```

在 `.env` 文件中填入你的 DeepSeek API Key：
```bash
DEEPSEEK_API_KEY=你的真实API密钥
```

### 4. 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/law-enforcement

# 创建软链接
sudo ln -sf /etc/nginx/sites-available/law-enforcement /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 5. 部署应用

```bash
cd /www/wwwroot/law-enforcement

# 给部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 6. 验证部署

```bash
# 检查应用状态
pm2 status

# 查看日志
pm2 logs law-enforcement

# 测试访问
curl http://localhost:3002
```

在浏览器访问: `http://www.deepseek2046.com`

## 🔧 常用管理命令

```bash
# PM2 管理
pm2 list                    # 查看所有应用
pm2 logs law-enforcement    # 查看日志
pm2 restart law-enforcement # 重启应用
pm2 stop law-enforcement    # 停止应用

# 更新部署
cd /www/wwwroot/law-enforcement
git pull origin main        # 拉取最新代码
./deploy.sh                 # 重新部署
```

## 🔒 HTTPS 配置（可选）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d www.deepseek2046.com

# 自动续期
sudo certbot renew --dry-run
```

## 🐛 故障排查

### 端口被占用
```bash
sudo lsof -i :3002
sudo kill -9 <PID>
```

### 查看详细日志
```bash
pm2 logs law-enforcement --lines 100
sudo tail -f /var/log/nginx/error.log
```

### 重启服务
```bash
pm2 restart law-enforcement
sudo systemctl restart nginx
```

---

**部署完成后访问**: http://www.deepseek2046.com

#!/bin/bash

# 服务器状态检查脚本
# 使用方法: bash check-server.sh

echo "========================================="
echo "服务器状态检查"
echo "========================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Node.js
echo -e "\n${YELLOW}1. Node.js 版本:${NC}"
if command -v node &> /dev/null; then
    node -v
    echo -e "${GREEN}✓ Node.js 已安装${NC}"
else
    echo -e "${RED}✗ Node.js 未安装${NC}"
fi

# 检查 npm
echo -e "\n${YELLOW}2. npm 版本:${NC}"
if command -v npm &> /dev/null; then
    npm -v
    echo -e "${GREEN}✓ npm 已安装${NC}"
else
    echo -e "${RED}✗ npm 未安装${NC}"
fi

# 检查 PM2
echo -e "\n${YELLOW}3. PM2 版本:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 -v
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${RED}✗ PM2 未安装${NC}"
    echo "安装命令: npm install -g pm2"
fi

# 检查 Nginx
echo -e "\n${YELLOW}4. Nginx 状态:${NC}"
if command -v nginx &> /dev/null; then
    nginx -v 2>&1 | head -n1
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx 运行中${NC}"
    else
        echo -e "${RED}✗ Nginx 未运行${NC}"
    fi
else
    echo -e "${RED}✗ Nginx 未安装${NC}"
fi

# 检查端口占用
echo -e "\n${YELLOW}5. 端口占用情况:${NC}"
echo "端口 80:"
sudo lsof -i:80 2>/dev/null || echo "  未占用"
echo "端口 3000:"
lsof -i:3000 2>/dev/null || echo "  未占用"
echo "端口 3002:"
lsof -i:3002 2>/dev/null || echo "  未占用"

# 检查 PM2 进程
echo -e "\n${YELLOW}6. PM2 进程列表:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 未安装"
fi

# 检查项目目录
echo -e "\n${YELLOW}7. 项目目录检查:${NC}"
PROJECT_DIR="/www/wwwroot/law-enforcement"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${GREEN}✓ 项目目录存在: $PROJECT_DIR${NC}"
    cd $PROJECT_DIR

    # 检查关键文件
    echo -e "\n关键文件检查:"
    [ -f "package.json" ] && echo "  ✓ package.json" || echo "  ✗ package.json"
    [ -f ".env" ] && echo "  ✓ .env" || echo "  ✗ .env"
    [ -d "node_modules" ] && echo "  ✓ node_modules/" || echo "  ✗ node_modules/"
    [ -d ".next" ] && echo "  ✓ .next/" || echo "  ✗ .next/"
    [ -f ".next/BUILD_ID" ] && echo "  ✓ .next/BUILD_ID" || echo "  ✗ .next/BUILD_ID"
    [ -f "ecosystem.config.js" ] && echo "  ✓ ecosystem.config.js" || echo "  ✗ ecosystem.config.js"
else
    echo -e "${RED}✗ 项目目录不存在: $PROJECT_DIR${NC}"
fi

# 检查系统资源
echo -e "\n${YELLOW}8. 系统资源:${NC}"
echo "内存使用:"
free -h | grep -E "Mem|Swap"
echo -e "\n磁盘使用:"
df -h | grep -E "Filesystem|/dev"

# 测试本地访问
echo -e "\n${YELLOW}9. 本地访问测试:${NC}"
echo -n "  http://localhost:3000 - "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo -e "${GREEN}HTTP $HTTP_CODE ✓${NC}"
else
    echo -e "${RED}HTTP $HTTP_CODE ✗${NC}"
fi

# 检查 Nginx 配置
echo -e "\n${YELLOW}10. Nginx 配置检查:${NC}"
if [ -f "/etc/nginx/sites-enabled/law-enforcement" ]; then
    echo -e "${GREEN}✓ Nginx 配置文件存在${NC}"
    sudo nginx -t 2>&1 | tail -n 2
else
    echo -e "${RED}✗ Nginx 配置文件不存在${NC}"
fi

# 检查最近的日志
echo -e "\n${YELLOW}11. 最近的错误日志:${NC}"
if [ -f "/var/log/nginx/law-enforcement-error.log" ]; then
    echo "Nginx 错误日志(最后10行):"
    sudo tail -n 10 /var/log/nginx/law-enforcement-error.log 2>/dev/null || echo "  无错误日志"
fi

echo -e "\n${GREEN}========================================="
echo "检查完成"
echo "=========================================${NC}"
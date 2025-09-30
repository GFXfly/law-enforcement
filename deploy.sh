#!/bin/bash

# 部署脚本 - 在服务器上运行
# 使用方法: bash deploy.sh

set -e

echo "========================================="
echo "开始部署 Law Enforcement 项目"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="/www/wwwroot/law-enforcement"
APP_NAME="law-enforcement"

# 检查 Node.js
echo -e "\n${YELLOW}1. 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装 Node.js${NC}"
    echo "请先安装 Node.js 18+ 版本"
    exit 1
fi
echo -e "${GREEN}Node.js 版本: $(node -v)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未安装 npm${NC}"
    exit 1
fi
echo -e "${GREEN}npm 版本: $(npm -v)${NC}"

# 检查 PM2
echo -e "\n${YELLOW}2. 检查/安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "PM2 未安装，正在安装..."
    npm install -g pm2
fi
echo -e "${GREEN}PM2 版本: $(pm2 -v)${NC}"

# 进入项目目录
echo -e "\n${YELLOW}3. 进入项目目录...${NC}"
cd $PROJECT_DIR

# 更新代码（如果使用 Git）
# echo -e "\n${YELLOW}4. 更新代码...${NC}"
# git pull origin main

# 安装依赖
echo -e "\n${YELLOW}4. 安装依赖...${NC}"
npm ci --production=false

# 构建项目
echo -e "\n${YELLOW}5. 构建项目...${NC}"
npm run build

# 创建日志目录
echo -e "\n${YELLOW}6. 创建日志目录...${NC}"
mkdir -p logs

# 停止旧进程
echo -e "\n${YELLOW}7. 停止旧进程...${NC}"
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# 启动应用
echo -e "\n${YELLOW}8. 启动应用...${NC}"
pm2 start ecosystem.config.js

# 保存 PM2 配置
echo -e "\n${YELLOW}9. 保存 PM2 配置...${NC}"
pm2 save

# 设置 PM2 开机自启
echo -e "\n${YELLOW}10. 设置 PM2 开机自启...${NC}"
pm2 startup | grep -v "PM2" | bash || true

# 显示应用状态
echo -e "\n${YELLOW}11. 应用状态:${NC}"
pm2 list

# 显示应用日志
echo -e "\n${GREEN}========================================="
echo "部署完成！"
echo "=========================================${NC}"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs $APP_NAME"
echo "  查看状态: pm2 status"
echo "  重启应用: pm2 restart $APP_NAME"
echo "  停止应用: pm2 stop $APP_NAME"
echo ""
echo "查看实时日志:"
pm2 logs $APP_NAME --lines 50
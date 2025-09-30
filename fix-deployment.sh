#!/bin/bash

# 一键修复部署脚本
# 在服务器上运行: bash fix-deployment.sh

set -e

echo "========================================="
echo "开始修复 Law Enforcement 部署问题"
echo "========================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/www/wwwroot/law-enforcement"
APP_NAME="law-enforcement"

# 步骤1: 停止所有相关进程
echo -e "\n${YELLOW}步骤1: 停止所有相关进程...${NC}"
pm2 delete all 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 2

# 步骤2: 检查并释放端口
echo -e "\n${YELLOW}步骤2: 检查端口占用...${NC}"
PORT_3000=$(lsof -ti:3000 2>/dev/null || echo "")
PORT_3002=$(lsof -ti:3002 2>/dev/null || echo "")

if [ ! -z "$PORT_3000" ]; then
    echo "端口 3000 被占用,正在释放..."
    kill -9 $PORT_3000 2>/dev/null || true
fi

if [ ! -z "$PORT_3002" ]; then
    echo "端口 3002 被占用,正在释放..."
    kill -9 $PORT_3002 2>/dev/null || true
fi

sleep 2
echo -e "${GREEN}✓ 端口已释放${NC}"

# 步骤3: 进入项目目录
echo -e "\n${YELLOW}步骤3: 进入项目目录...${NC}"
cd $PROJECT_DIR
echo -e "${GREEN}✓ 当前目录: $(pwd)${NC}"

# 步骤4: 清理旧的构建文件
echo -e "\n${YELLOW}步骤4: 清理旧的构建文件...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✓ 清理完成${NC}"

# 步骤5: 确认依赖已安装
echo -e "\n${YELLOW}步骤5: 检查并安装依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "依赖未安装,正在安装..."
    npm install --production=false
else
    echo "依赖已存在,跳过安装"
fi
echo -e "${GREEN}✓ 依赖检查完成${NC}"

# 步骤6: 构建项目
echo -e "\n${YELLOW}步骤6: 构建项目（这可能需要几分钟）...${NC}"
npm run build

# 验证构建结果
if [ ! -f ".next/prerender-manifest.json" ]; then
    echo -e "${RED}✗ 构建失败: prerender-manifest.json 文件不存在${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 构建成功${NC}"

# 步骤7: 创建日志目录
echo -e "\n${YELLOW}步骤7: 创建日志目录...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ 日志目录已创建${NC}"

# 步骤8: 使用 PM2 启动应用
echo -e "\n${YELLOW}步骤8: 启动应用...${NC}"
pm2 start ecosystem.config.js
sleep 3

# 步骤9: 检查应用状态
echo -e "\n${YELLOW}步骤9: 检查应用状态...${NC}"
pm2 list

# 等待应用完全启动
sleep 5

# 步骤10: 测试应用
echo -e "\n${YELLOW}步骤10: 测试应用...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    echo -e "${GREEN}✓ 应用响应正常 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 应用响应异常 (HTTP $HTTP_CODE)${NC}"
    echo "查看日志:"
    pm2 logs $APP_NAME --lines 20 --nostream
    exit 1
fi

# 步骤11: 配置 Nginx
echo -e "\n${YELLOW}步骤11: 配置 Nginx...${NC}"
if [ -f "nginx.conf" ]; then
    sudo cp nginx.conf /etc/nginx/sites-available/law-enforcement
    sudo ln -sf /etc/nginx/sites-available/law-enforcement /etc/nginx/sites-enabled/

    # 测试 Nginx 配置
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Nginx 配置正确${NC}"
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Nginx 已重新加载${NC}"
    else
        echo -e "${RED}✗ Nginx 配置错误${NC}"
        sudo nginx -t
        exit 1
    fi
else
    echo -e "${YELLOW}! nginx.conf 文件不存在,跳过 Nginx 配置${NC}"
fi

# 步骤12: 保存 PM2 配置
echo -e "\n${YELLOW}步骤12: 保存 PM2 配置...${NC}"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
echo -e "${GREEN}✓ PM2 配置已保存${NC}"

# 完成
echo -e "\n${GREEN}========================================="
echo "部署修复完成！"
echo "=========================================${NC}"
echo ""
echo "应用信息:"
echo "  - 内部端口: 3000"
echo "  - 外部访问: http://wwww.deepseek2046.com"
echo ""
echo "常用命令:"
echo "  pm2 status              - 查看状态"
echo "  pm2 logs $APP_NAME      - 查看日志"
echo "  pm2 restart $APP_NAME   - 重启应用"
echo "  pm2 monit               - 实时监控"
echo ""
echo "测试访问:"
echo "  curl http://localhost:3000"
echo "  curl http://wwww.deepseek2046.com"
echo ""
echo -e "${YELLOW}查看实时日志:${NC}"
pm2 logs $APP_NAME --lines 30
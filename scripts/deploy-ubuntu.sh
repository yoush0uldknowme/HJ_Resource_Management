#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════
#  HJ 资源管理系统 — 一键部署脚本 (校园网/局域网模式)
# ═════════════════════════════════════════════════════════════
# 用法：
#   chmod +x scripts/deploy-ubuntu.sh
#   sudo bash scripts/deploy-ubuntu.sh
#
# 脚本会自动：
#   1. 安装 Node.js 22
#   2. 克隆项目 → 安装依赖 → 生成 Prisma 客户端
#   3. 创建 .env 配置（随机 JWT 密钥）
#   4. 安装 systemd 服务 → 启动 HTTPS 服务器
#   5. 配置 cron 每日备份
#   6. 输出校园网访问地址 + 使用方法
#
# 同学们只需要浏览器打开 IP:4011，点"高级 → 继续前往"即可。
# ═════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

# ── 0. 检查 root ──
if [ "$EUID" -ne 0 ]; then
  err "请用 sudo 运行：sudo bash scripts/deploy-ubuntu.sh"
fi

# ── 1. 配置变量 ──
APP_DIR="${APP_DIR:-/opt/hj-resource}"
APP_USER="${APP_USER:-www-data}"
PORT="${PORT:-4011}"
REPO_URL="https://github.com/ysh0uldknowme/HJ_Resource_Management"
REPO_BRANCH="${REPO_BRANCH:-Workbuddy_test}"

# 自动获取校园网 IP
SERVER_IP=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$SERVER_IP" ]; then
  SERVER_IP="<你的校园网IP>"
  warn "未能自动获取 IP，请手动查找"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   HJ 资源管理系统 — 校园网一键部署                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  目录:    $APP_DIR"
echo "  端口:    $PORT"
echo "  服务IP:  $SERVER_IP"
echo "  仓库:    $REPO_URL"
echo ""

read -rp "确认以上配置？[Y/n] " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then exit 0; fi

# ── 2. 系统依赖 ──
info "更新系统..."
apt update -qq && apt upgrade -y -qq
apt install -y -qq curl git sqlite3
log "系统依赖就绪"

# ── 3. Node.js 22 ──
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 22 ]; then
  info "安装 Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y -qq nodejs
fi
log "Node.js $(node -v)"

# ── 4. 克隆项目 ──
if [ -d "$APP_DIR/.git" ]; then
  warn "项目已存在，git pull 更新..."
  cd "$APP_DIR"
  git fetch origin "$REPO_BRANCH"
  git checkout "$REPO_BRANCH"
  git pull origin "$REPO_BRANCH"
else
  info "克隆项目..."
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"

# ── 5. npm 依赖 ──
info "安装项目依赖..."
su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npm install" || err "npm install 失败"

# ── 6. Prisma ──
info "生成 Prisma..."
su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npx prisma generate"

# ── 7. .env ──
if [ ! -f "$APP_DIR/.env" ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))")
  cat > "$APP_DIR/.env" << EOF
DATABASE_URL="file:./prod.db"
JWT_SECRET="$JWT_SECRET"
PORT=$PORT
HOST=0.0.0.0
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  log "已生成 .env 配置（JWT 密钥随机）"
else
  log ".env 已存在，跳过"
fi

# ── 8. 数据库 ──
if [ ! -f "$APP_DIR/prisma/prod.db" ] && [ ! -f "$APP_DIR/prisma/dev.db" ]; then
  info "初始化数据库..."
  su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npx prisma db push" 2>/dev/null || warn "db push 失败，请手动执行"
fi

# ── 9. systemd（自签 HTTPS 模式，直接监听 0.0.0.0） ──
info "创建 systemd 服务..."

cat > /etc/systemd/system/hj-resource.service << EOF
[Unit]
Description=HJ 资源管理系统
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOST=0.0.0.0

# 安全
NoNewPrivileges=yes
PrivateTmp=yes

# 日志
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hj-resource

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hj-resource
systemctl restart hj-resource
sleep 2
log "服务已启动 ($(systemctl is-active hj-resource))"

# ── 10. cron 备份 ──
info "配置每日备份..."
mkdir -p "$APP_DIR/backups"
chown "$APP_USER:$APP_USER" "$APP_DIR/backups"
BACKUP_CRON="0 3 * * * /usr/bin/node $APP_DIR/scripts/backup.js $APP_DIR/backups >> /var/log/hj-backup.log 2>&1"
(crontab -u "$APP_USER" -l 2>/dev/null | grep -v "backup.js"; echo "$BACKUP_CRON") | crontab -u "$APP_USER" -
log "每日凌晨3点自动备份"

# ── 11. 生成分享信息 ──
DESKTOP_URL="https://${SERVER_IP}:${PORT}"
MOBILE_URL="https://${SERVER_IP}:${PORT}/mobile"
SCAN_URL="https://${SERVER_IP}:${PORT}/mobile/scan"

# 尝试生成终端二维码
QR_CMD=""
if command -v qrencode &>/dev/null; then
  QR_CMD="qrencode"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║  ${BOLD}部署完成！校园网内任何设备都能访问${NC}                        "
echo "║                                                          ║"
echo "║  ${BOLD}拷贝以下链接发给同学：${NC}                                    "
echo "║                                                          ║"
echo "║  ${BOLD}管理端桌面版${NC}                                          "
echo "║  → ${CYAN}${DESKTOP_URL}${NC}                     "
echo "║                                                          ║"
echo "║  ${BOLD}手机端${NC}（适合操作员扫码出入库）                             "
echo "║  → ${CYAN}${MOBILE_URL}${NC}                 "
echo "║                                                          ║"
echo "║  ${BOLD}默认账号${NC}                                            "
echo "║  管理员: admin / admin123                                "
echo "║  操作员: operator / operator123                          "
echo "║                                                          ║"
echo "║  ${YELLOW}⚠ 首次打开浏览器会提示"不安全"，点击：${NC}                    "
echo "║  ${YELLOW}「高级」→「继续前往 ${SERVER_IP}（不安全）」即可${NC}            "
echo "║                                                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  ${BOLD}运维命令${NC}                                              "
echo "║  systemctl status hj-resource    查看服务状态             "
echo "║  journalctl -u hj-resource -f    实时日志                 "
echo "║  systemctl restart hj-resource   重启服务                 "
echo "║  node $APP_DIR/scripts/backup.js 手动备份                 "
echo "║  curl https://${SERVER_IP}:${PORT}/api/health  健康检查    "
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 如果装了 qrencode，打印二维码
if [ -n "$QR_CMD" ]; then
  echo "  手机端扫码快速访问:"
  echo ""
  qrencode -t ANSIUTF8 -m 1 -s 2 "$MOBILE_URL" 2>/dev/null && echo "" || true
fi

# ── 12. 防火墙提示 ──
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  info "检测到 ufw 防火墙，开放端口 ${PORT}..."
  ufw allow "$PORT/tcp" 2>/dev/null || warn "ufw 规则添加失败，请手动: ufw allow $PORT/tcp"
fi

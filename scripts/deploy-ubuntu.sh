#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════
#  HJ 资源管理系统 — 一键部署脚本 (Ubuntu 20.04+/22.04+/24.04)
# ═════════════════════════════════════════════════════════════
# 用法：
#   chmod +x scripts/deploy-ubuntu.sh
#   sudo bash scripts/deploy-ubuntu.sh
#
# 脚本会自动：
#   1. 安装 Node.js 22 + Caddy
#   2. 克隆项目 → 安装依赖 → 生成 Prisma 客户端
#   3. 创建 .env 配置（交互式输入）
#   4. 配置 Caddy 反向代理（自动 HTTPS）
#   5. 安装 systemd 服务 → 启动
#   6. 配置 cron 每日备份
# ═════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

echo "╔══════════════════════════════════════════════════╗"
echo "║   HJ 资源管理系统 — Ubuntu 一键部署             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 0. 检查 root ──
if [ "$EUID" -ne 0 ]; then
  err "请用 sudo 运行：sudo bash scripts/deploy-ubuntu.sh"
fi

# ── 1. 配置变量 ──
APP_DIR="${APP_DIR:-/opt/hj-resource}"
APP_USER="${APP_USER:-www-data}"
REPO_URL="${REPO_URL:-https://github.com/ysh0uldknowme/HJ_Resource_Management}"
REPO_BRANCH="${REPO_BRANCH:-Workbuddy_test}"

echo "安装配置："
echo "  目录:    $APP_DIR"
echo "  用户:    $APP_USER"
echo "  仓库:    $REPO_URL"
echo "  分支:    $REPO_BRANCH"
echo ""

read -rp "确认以上配置？[Y/n] " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
  echo "已取消"
  exit 0
fi

# ── 2. 安装系统依赖 ──
info "更新系统包..."
apt update -qq && apt upgrade -y -qq

info "安装基础依赖..."
apt install -y -qq curl git sqlite3

# ── 3. 安装 Node.js 22 ──
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 22 ]; then
  info "安装 Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y -qq nodejs
  log "Node.js $(node -v)"
else
  log "Node.js $(node -v) 已安装"
fi

# ── 4. 安装 Caddy ──
if ! command -v caddy &>/dev/null; then
  info "安装 Caddy..."
  apt install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt update -qq && apt install -y -qq caddy
  log "Caddy $(caddy version | head -1)"
else
  log "Caddy 已安装"
fi

# ── 5. 克隆/更新项目 ──
if [ -d "$APP_DIR/.git" ]; then
  warn "项目目录已存在，执行 git pull..."
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

# ── 6. 安装 npm 依赖 ──
info "安装项目依赖..."
su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npm ci --omit=dev 2>/dev/null || npm install --omit=dev" || {
  warn "npm ci 失败，尝试 npm install..."
  su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npm install"
}

# ── 7. Prisma ──
info "生成 Prisma 客户端..."
su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npx prisma generate"

# ── 8. 配置 .env ──
if [ ! -f "$APP_DIR/.env" ]; then
  info "创建 .env 配置..."
  read -rsp "JWT 密钥（回车自动生成）: " jwt_input
  echo ""
  if [ -z "$jwt_input" ]; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))")
    log "已自动生成 JWT 密钥"
  else
    JWT_SECRET="$jwt_input"
  fi

  read -rp "数据库文件路径（默认 ./prisma/prod.db）: " db_path
  DB_PATH="${db_path:-file:./prisma/prod.db}"

  cat > "$APP_DIR/.env" << EOF
DATABASE_URL="$DB_PATH"
JWT_SECRET="$JWT_SECRET"
PORT=4011
HOST=127.0.0.1
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  log ".env 配置完成"
else
  log ".env 已存在，跳过"
fi

# ── 8.5. 数据库初始化 ──
if [ ! -f "$APP_DIR/prisma/prod.db" ] && [ ! -f "$APP_DIR/prisma/dev.db" ]; then
  info "初始化数据库..."
  su -s /bin/bash "$APP_USER" -c "cd $APP_DIR && npx prisma db push --accept-data-loss" 2>/dev/null || {
    warn "db push 失败，请手动执行 prisma db push"
  }
fi

# ── 9. Caddy 配置 ──
info "配置 Caddy..."
read -rp "域名或 IP（留空用服务器 IP）: " DOMAIN
DOMAIN="${DOMAIN:-}"

if [ -n "$DOMAIN" ]; then
  CADDY_DOMAIN="$DOMAIN"
else
  CADDY_DOMAIN="localhost"
  warn "未输入域名，使用 localhost（仅限本机测试）"
fi

cat > /etc/caddy/Caddyfile << EOF
# HJ 资源管理系统 — 自动生成 by deploy-ubuntu.sh
${CADDY_DOMAIN} {
	reverse_proxy 127.0.0.1:4011

	request_body {
		max_size 10MB
	}

	log {
		output file /var/log/caddy/hj-resource.log
	}

	@uploads path /uploads/*
	header @uploads Cache-Control "public, max-age=86400"
}
EOF

systemctl reload caddy 2>/dev/null || systemctl restart caddy
log "Caddy 配置完成 → https://${CADDY_DOMAIN}"

# ── 10. systemd 服务 ──
info "安装 systemd 服务..."

sed -e "s|WorkingDirectory=/opt/hj-resource|WorkingDirectory=$APP_DIR|g" \
    -e "s|ReadWritePaths=/opt/hj-resource/prisma|ReadWritePaths=$APP_DIR/prisma|g" \
    -e "s|ReadOnlyPaths=/opt/hj-resource|ReadOnlyPaths=$APP_DIR|g" \
    "$APP_DIR/deploy/systemd/hj-resource.service" > /etc/systemd/system/hj-resource.service

systemctl daemon-reload
systemctl enable hj-resource
systemctl restart hj-resource
log "systemd 服务已启动"

# ── 11. cron 备份 ──
info "配置每日备份..."
BACKUP_CRON="0 3 * * * /usr/bin/node $APP_DIR/scripts/backup.js $APP_DIR/backups >> /var/log/hj-backup.log 2>&1"
(crontab -u "$APP_USER" -l 2>/dev/null | grep -v "backup.js"; echo "$BACKUP_CRON") | crontab -u "$APP_USER" -
log "备份 cron 已添加（每天凌晨 3:00）"

# ── 12. 完成 ──
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           部署完成！                              ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  地址:   https://${CADDY_DOMAIN}                    "
echo "║  状态:   systemctl status hj-resource              "
echo "║  日志:   journalctl -u hj-resource -f              "
echo "║  备份:   $APP_DIR/backups/                         "
echo "║  健康:   curl http://127.0.0.1:4011/api/health     "
echo "╚══════════════════════════════════════════════════╝"
echo ""

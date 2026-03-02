#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Pratek Demo Paylaşım Scripti (Cloudflare Tunnel)
# ═══════════════════════════════════════════════════════════════
# Kullanım:  ./demo.sh
#
# Bu script:
#   1. cloudflared yoksa otomatik yükler
#   2. Frontend + API sunucusunu başlatır
#   3. Cloudflare Tunnel açar → güvenli HTTPS link verir
#
# Cloudflare Tunnel avantajları:
#   - trycloudflare.com domain'i güvenilir, güvenlik duvarlarına takılmaz
#   - Ücretsiz, kayıt gerektirmez
#   - Otomatik HTTPS
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FRONTEND_PORT=5173
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
TUNNEL_LOG=$(mktemp /tmp/cloudflared-XXXXXX.log)

cleanup() {
    echo ""
    echo -e "${YELLOW}Kapatılıyor...${NC}"
    [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
    [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null
    # Alt süreçleri de temizle
    jobs -p | xargs -r kill 2>/dev/null
    rm -f "$TUNNEL_LOG"
    echo -e "${GREEN}Temizlendi. Görüşürüz!${NC}"
    exit 0
}
trap cleanup INT TERM EXIT

# ─── 1. cloudflared kontrolü ve kurulumu ───
install_cloudflared() {
    echo -e "${YELLOW}cloudflared bulunamadı, yükleniyor...${NC}"

    local ARCH
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  ARCH="amd64" ;;
        aarch64) ARCH="arm64" ;;
        armv7l)  ARCH="arm"   ;;
    esac

    local OS
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')

    local URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-${OS}-${ARCH}"

    if [[ "$OS" == "darwin" ]]; then
        # macOS: homebrew varsa onunla yükle
        if command -v brew &>/dev/null; then
            brew install cloudflared
            return
        fi
    fi

    echo -e "İndiriliyor: ${CYAN}${URL}${NC}"
    curl -fsSL "$URL" -o /tmp/cloudflared
    chmod +x /tmp/cloudflared

    # /usr/local/bin varsa ve yazılabilirse oraya, yoksa mevcut dizine
    if [ -w /usr/local/bin ]; then
        mv /tmp/cloudflared /usr/local/bin/cloudflared
        echo -e "${GREEN}cloudflared /usr/local/bin/ dizinine yüklendi${NC}"
    else
        mkdir -p "$SCRIPT_DIR/.bin"
        mv /tmp/cloudflared "$SCRIPT_DIR/.bin/cloudflared"
        export PATH="$SCRIPT_DIR/.bin:$PATH"
        echo -e "${GREEN}cloudflared .bin/ dizinine yüklendi${NC}"
    fi
}

if ! command -v cloudflared &>/dev/null; then
    # .bin dizininde var mı kontrol et
    if [ -x "$SCRIPT_DIR/.bin/cloudflared" ]; then
        export PATH="$SCRIPT_DIR/.bin:$PATH"
    else
        install_cloudflared
    fi
fi

echo -e "${GREEN}✓ cloudflared hazır: $(cloudflared --version 2>&1 | head -1)${NC}"

# ─── 2. Bağımlılıkları kontrol et ───
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}node_modules bulunamadı, npm install çalıştırılıyor...${NC}"
    cd "$FRONTEND_DIR" && npm install
fi

# ─── 3. Uygulamayı başlat ───
echo -e "${CYAN}Uygulama başlatılıyor (frontend + API)...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
APP_PID=$!

# Uygulamanın ayağa kalkmasını bekle
echo -n "Sunucu başlatılıyor"
for i in $(seq 1 30); do
    if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Uygulama hazır (port $FRONTEND_PORT)${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo ""
        echo -e "${RED}Uygulama 30 saniye içinde başlamadı!${NC}"
        exit 1
    fi
done

# ─── 4. Cloudflare Tunnel aç ───
echo -e "${CYAN}Cloudflare Tunnel açılıyor...${NC}"
cloudflared tunnel --url "http://localhost:$FRONTEND_PORT" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Tunnel URL'sini yakala
echo -n "Tunnel bağlantısı kuruluyor"
DEMO_URL=""
for i in $(seq 1 30); do
    DEMO_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
    if [ -n "$DEMO_URL" ]; then
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ -z "$DEMO_URL" ]; then
    echo -e "${RED}Tunnel URL alınamadı. Log:${NC}"
    cat "$TUNNEL_LOG"
    exit 1
fi

# ─── 5. Sonucu göster ───
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  PRATEK DEMO HAZIR${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}Demo Link:${NC}  ${CYAN}${BOLD}${DEMO_URL}${NC}"
echo ""
echo -e "  Bu linki arkadaşlarınızla paylaşabilirsiniz."
echo -e "  Cloudflare üzerinden güvenli HTTPS bağlantısı sağlanır."
echo -e "  Güvenlik duvarlarına takılmaz."
echo ""
echo -e "  ${YELLOW}Durdurmak için: Ctrl+C${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Süreçler çalıştığı sürece bekle
wait "$APP_PID" "$TUNNEL_PID" 2>/dev/null

#!/usr/bin/env bash
set -e

# Renkler
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

FRONTEND_PORT=5173

cleanup() {
    echo -e "${YELLOW}\nKapatılıyor...${NC}"
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}
trap cleanup INT TERM EXIT

echo -e "${CYAN}Pratek Uygulaması Başlatılıyor...${NC}"

# 1. Bağımlılık kontrolü
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi

# 2. Uygulamayı (API + Vite) başlat
npm run dev &
APP_PID=$!

echo -e "${YELLOW}Sunucunun hazır olması bekleniyor...${NC}"
sleep 5

# 3. Localhost.run Tünelini Aç (SSH Üzerinden)
# Hiçbir binary indirmez, ESET'e takılmaz.
echo -e "${GREEN}✓ Güvenli Tünel Açılıyor...${NC}"
echo -e "${YELLOW}UYARI: İlk kez çalıştırıyorsanız SSH bağlantısını onaylamanız (yes yazmanız) gerekebilir.${NC}"

ssh -R 80:localhost:$FRONTEND_PORT nokey@localhost.run
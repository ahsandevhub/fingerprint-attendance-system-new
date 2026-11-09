#!/usr/bin/env bash

# ==============================================================================
# 🚀 Automated 1-Click Raspberry Pi Setup Script
#    Fingerprint Attendance System (Approach A: Server-Side Storage & Matching)
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}===================================================================${NC}"
echo -e "${PURPLE}  🎓 UGV Fingerprint Attendance System - Raspberry Pi Installer     ${NC}"
echo -e "${PURPLE}     Full Server Storage & Biometric Matching (Approach A)        ${NC}"
echo -e "${CYAN}===================================================================${NC}"

# Detect Raspberry Pi architecture and IP
ARCH=$(uname -m)
PI_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}ℹ System Architecture:${NC} $ARCH"
echo -e "${BLUE}ℹ Raspberry Pi IP:${NC} $PI_IP"

# 1. Check & Configure Swap (Crucial for Pi with <= 4GB RAM during Next.js builds)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM_MB" -lt 3500 ]; then
  echo -e "${YELLOW}⚡ Low RAM detected ($TOTAL_RAM_MB MB). Ensuring 2GB Swap space...${NC}"
  if [ -f /etc/dphys-swapfile ]; then
    CURRENT_SWAP=$(grep -oP 'CONF_SWAPSIZE=\K[0-9]+' /etc/dphys-swapfile || echo "0")
    if [ "$CURRENT_SWAP" -lt 2048 ]; then
      echo -e "${YELLOW}Increasing swap to 2048MB...${NC}"
      sudo dphys-swapfile swapoff || true
      sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
      sudo dphys-swapfile setup
      sudo dphys-swapfile swapon
    fi
  fi
fi

# 2. System update & required packages
echo -e "\n${CYAN}📦 Step 1/6: Updating package list and installing utilities...${NC}"
sudo apt update -y
sudo apt install -y curl wget git jq ufw ca-certificates gnupg lsb-release build-essential

# 3. Install Docker Engine if not installed
echo -e "\n${CYAN}🐳 Step 2/6: Checking Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Installing Docker Engine via official automated script...${NC}"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  sudo usermod -aG docker "$USER"
  sudo systemctl enable docker
  sudo systemctl start docker
  echo -e "${GREEN}✓ Docker successfully installed!${NC}"
else
  echo -e "${GREEN}✓ Docker is already installed.${NC}"
fi

# Ensure docker service is running
sudo systemctl start docker

# 4. Install Node.js 22 LTS & PM2
echo -e "\n${CYAN}🟢 Step 3/6: Installing Node.js 22 LTS & PM2...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo -e "${YELLOW}Installing NodeSource repository for Node.js 22 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
  echo -e "${GREEN}✓ Node.js $(node -v) and npm $(npm -v) installed!${NC}"
else
  echo -e "${GREEN}✓ Node.js $(node -v) is already up to date.${NC}"
fi

# Install PM2 and Supabase CLI globally
echo -e "${YELLOW}Installing PM2 Process Manager & Supabase CLI...${NC}"
sudo npm install -g pm2 supabase --silent

# 5. Setup Project Environment Variables (.env.local)
echo -e "\n${CYAN}⚙️  Step 4/6: Configuring Environment Variables...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env.local ]; then
  echo -e "${YELLOW}Creating .env.local with Supabase keys...${NC}"
  cat <<EOF > .env.local
NEXT_PUBLIC_SUPABASE_URL=http://${PI_IP}:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_APP_URL=http://${PI_IP}:3000
EOF
  echo -e "${GREEN}✓ .env.local created successfully!${NC}"
else
  echo -e "${GREEN}✓ .env.local already exists. Updating IP to ${PI_IP}...${NC}"
  sed -i "s|NEXT_PUBLIC_SUPABASE_URL=http://.*:54321|NEXT_PUBLIC_SUPABASE_URL=http://${PI_IP}:54321|g" .env.local
  sed -i "s|NEXT_PUBLIC_APP_URL=http://.*:3000|NEXT_PUBLIC_APP_URL=http://${PI_IP}:3000|g" .env.local
fi

# 6. Install Project Dependencies & Start Supabase
echo -e "\n${CYAN}📦 Step 5/6: Installing npm packages and starting Supabase containers...${NC}"
npm install

echo -e "${YELLOW}Starting local Supabase container stack (PostgreSQL, Auth, Realtime, Studio)...${NC}"
# Use sudo for docker commands if current session doesn't have group refreshed yet
if groups | grep -q '\bdocker\b'; then
  npx supabase start || true
else
  sudo npx supabase start || true
fi

# 7. Build Next.js Application & Start with PM2
echo -e "\n${CYAN}🚀 Step 6/6: Building Next.js application & setting up auto-boot...${NC}"
npm run build

echo -e "${YELLOW}Configuring PM2 to run Next.js in background...${NC}"
pm2 delete attendance-system 2>/dev/null || true
pm2 start npm --name "attendance-system" -- start
pm2 save

echo -e "${YELLOW}Setting up systemd startup service for PM2...${NC}"
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -n 1 | sudo bash || true

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}  🎉 INSTALLATION & DEPLOYMENT COMPLETE!                          ${NC}"
echo -e "${GREEN}===================================================================${NC}"
echo -e "Your Raspberry Pi is now running the Fingerprint Attendance System:"
echo -e ""
echo -e "  🌐 ${CYAN}Web Dashboard:${NC}        http://${PI_IP}:3000"
echo -e "  📊 ${CYAN}Supabase Studio:${NC}      http://${PI_IP}:54323"
echo -e "  🔌 ${CYAN}Supabase REST/API:${NC}    http://${PI_IP}:54321"
echo -e ""
echo -e "  👉 ${YELLOW}ESP32 Firmware Configuration:${NC}"
echo -e "     In your FPM10A_ESP32.ino, set:"
echo -e "     ${PURPLE}const char *serverIp = \"${PI_IP}\";${NC}"
echo -e "     ${PURPLE}const int serverPort = 3000;${NC}"
echo -e ""
echo -e "  🔧 Useful Commands:"
echo -e "     - View live app logs:   ${CYAN}pm2 logs attendance-system${NC}"
echo -e "     - Restart server:       ${CYAN}pm2 restart attendance-system${NC}"
echo -e "     - Stop server:          ${CYAN}pm2 stop attendance-system${NC}"
echo -e "     - Supabase status:      ${CYAN}npx supabase status${NC}"
echo -e "${GREEN}===================================================================${NC}\n"


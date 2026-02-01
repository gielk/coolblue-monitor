#!/bin/bash

#############################################
# Coolblue Monitor - Quick Update Script
# Run met: ./scripts/update.sh
#############################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Coolblue Monitor - Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd /opt/coolblue-monitor

# Stap 1: Stash local changes
echo -e "${BLUE}→${NC} Saving local changes..."
git stash > /dev/null 2>&1 || true

# Stap 2: Pull latest
echo -e "${BLUE}→${NC} Pulling latest code..."
git pull origin main

# Stap 3: Install dependencies
echo -e "${BLUE}→${NC} Installing dependencies..."
pnpm install

# Stap 4: Install/update Playwright browsers
echo -e "${BLUE}→${NC} Installing Playwright browsers..."
pnpm exec playwright install chromium > /dev/null 2>&1 || {
    echo -e "${YELLOW}WARNING:${NC} Playwright browser installation failed (continuing anyway)"
}

# Stap 5: Build
echo -e "${BLUE}→${NC} Building application..."
pnpm run build

# Stap 6: Restart PM2
echo -e "${BLUE}→${NC} Restarting application..."
pm2 restart coolblue-monitor

echo ""
echo -e "${GREEN}✅ Update completed!${NC}"
echo ""
echo "Check status with: pm2 logs coolblue-monitor"
echo ""

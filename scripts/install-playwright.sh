#!/bin/bash

#############################################
# Install Playwright and Chromium
# Run this after main installation
#############################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Installing Playwright + Chromium${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd /opt/coolblue-monitor

# Installeer Playwright
echo -e "${BLUE}→${NC} Installing Playwright package..."
pnpm add playwright@1.48.0

# Installeer browser dependencies (voor Ubuntu/Debian)
echo -e "${BLUE}→${NC} Installing system dependencies..."
apt-get update -qq
apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    > /dev/null 2>&1

# Installeer Chromium browser voor Playwright
echo -e "${BLUE}→${NC} Installing Chromium browser (dit kan even duren)..."
npx playwright install chromium

# Herstart applicatie
echo -e "${BLUE}→${NC} Rebuilding application..."
pnpm run build > /dev/null 2>&1

echo -e "${BLUE}→${NC} Restarting app..."
pm2 restart coolblue-monitor

echo ""
echo -e "${GREEN}✅ Playwright installed successfully!${NC}"
echo ""
echo "The scraper will now use Playwright for more reliable scraping."
echo ""

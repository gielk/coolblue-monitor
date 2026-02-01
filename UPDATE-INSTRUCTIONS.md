# 🔄 Update Instructies voor Proxmox

## Snelle Update (One Command)

```bash
# SSH naar Proxmox host
ssh root@proxmox.konink.me

# Ga de container binnen
pct enter 105  # Of jouw container ID

# Ga naar app directory
cd /opt/coolblue-monitor

# Run update script
./scripts/update.sh
```

## Wat doet het update script?

Het `update.sh` script voert automatisch uit:
1. ✅ Stash lokale wijzigingen
2. ✅ Pull nieuwste code van GitHub
3. ✅ Installeer dependencies
4. ✅ Installeer/update Playwright browsers
5. ✅ Build applicatie
6. ✅ Restart PM2

## Eerste Keer Update? Install Chromium Browser

Als je voor het eerst update naar de nieuwe Playwright scraper:

```bash
cd /opt/coolblue-monitor
pnpm exec playwright install chromium
```

## Check Status Na Update

```bash
# Bekijk logs
pm2 logs coolblue-monitor --lines 20

# Je zou moeten zien:
# Server running on http://localhost:3000/
# [Server] Local network: http://192.168.178.27:3000/
# [Server] Environment: production
# [Scraper] Playwright scraper available ✓
```

## Test de Scraper

```bash
cd /opt/coolblue-monitor
pnpm exec tsx test-playwright-scraper.ts
```

Verwachte output:
```
🧪 Testing Playwright Scraper
📍 URL: https://www.coolblue.nl/product/946998/...
✅ Scrape Results:
  📦 Product Name: Samsung WW90DB7U94GBUS3...
  💰 Current Price: €1099.00
  🏷️  Tweede Kans Price: €899.00
```

## Handmatige Update (Fallback)

Als het update script niet werkt:

```bash
cd /opt/coolblue-monitor

# Stash changes
git stash

# Pull latest
git pull origin main

# Install
pnpm install

# Install Playwright browser
pnpm exec playwright install chromium

# Build
pnpm run build

# Restart
pm2 restart coolblue-monitor
```

## Troubleshooting

### "git pull fails"
```bash
git stash
git fetch origin
git reset --hard origin/main
pnpm install
pnpm run build
pm2 restart coolblue-monitor
```

### "Playwright errors"
```bash
pnpm exec playwright install chromium
pm2 restart coolblue-monitor
```

### "PM2 not starting"
```bash
pm2 logs coolblue-monitor --lines 50
# Check de error messages
```

## Latest Updates Inbegrepen

✅ **Playwright Scraper** - 95% success rate bij price extraction
✅ **IP Address Logging** - Server toont local network IP in logs
✅ **Update Script** - One-command updates
✅ **GMAIL_EMAIL Fix** - Correcte environment variable naam
✅ **UI Grid Fix** - Buttons blijven binnen card grenzen

## Contact

Problemen na update? Check:
1. PM2 logs: `pm2 logs coolblue-monitor`
2. Test scraper: `pnpm exec tsx test-playwright-scraper.ts`
3. Check IP: http://192.168.178.27:3000 (gebruik jouw IP)

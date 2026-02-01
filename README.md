# Coolblue Tweede Kans Monitor

Een elegante web applicatie voor het monitoren van Coolblue producten op Tweede Kans beschikbaarheid met e-mailnotificaties.

## Functies

- **Product Monitoring**: Voeg Coolblue product links toe om automatisch te monitoren
- **Configureerbare Controle-Intervallen**: Kies hoe vaak het product gecontroleerd wordt (15 min, 30 min, 1 uur, tot 1 dag)
- **E-mailNotificaties**: Ontvang instant e-mails wanneer een Tweede Kans product beschikbaar wordt
- **Elegant Dashboard**: Beheer al je monitored producten op één plek
- **Gedetailleerde Info**: Zie originele prijs, Tweede Kans prijs en directe link naar product
- **Check History**: Volg de controlegeschiedenis van elk product

## Technologie Stack

- **Frontend**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL/TiDB met Drizzle ORM
- **Authentication**: Manus OAuth
- **Scraping**: Axios + Cheerio
- **Testing**: Vitest

## Architectuur

### Database Schema

**monitored_products**
- Slaat de producten op die gebruikers monitoren
- Bevat URL, e-mail, controle-interval, en status informatie
- Linked aan users table voor multi-user support

**check_history**
- Volgt alle controles van producten
- Slaat beschikbaarheid, prijzen en status op
- Helpt bij debugging en analyse

**users**
- Standaard user table met Manus OAuth integration

### Backend Services

**Scraper** (`server/scraper.ts`)
- Haalt Coolblue productpagina's op
- Detecteert Tweede Kans beschikbaarheid
- Extraheert product info (naam, afbeelding, prijzen)

**Jobs** (`server/jobs.ts`)
- Background job scheduler
- Controleert producten op basis van ingestelde intervallen
- Stuurt e-mailnotificaties wanneer beschikbaarheid verandert

**Email** (`server/email.ts`)
- Genereert professionele e-mail templates
- Bevat product details en prijsinformatie
- Klaar voor integratie met email services (Resend, SendGrid, etc.)

### Frontend Pages

**Home** (`client/src/pages/Home.tsx`)
- Landing page met feature overview
- Call-to-action voor login
- Hoe het werkt sectie

**Dashboard** (`client/src/pages/Dashboard.tsx`)
- Overzicht van alle monitored producten
- Product toevoegen dialog
- Status indicators (beschikbaar/niet beschikbaar)
- Controle-interval instellingen
- Product beheer (activeren, pauzeren, verwijderen)

## API Routes

### Products Router

- `products.list` - Haal alle producten van gebruiker op
- `products.add` - Voeg nieuw product toe
- `products.update` - Update product instellingen
- `products.delete` - Verwijder product
- `products.getById` - Haal specifiek product op

## Setup & Development

### Vereisten

- Node.js 22+
- pnpm 10+
- MySQL/TiDB database

### Installatie

```bash
# Dependencies installeren
pnpm install

# Database migraties uitvoeren
pnpm db:push

# Dev server starten
pnpm dev

# Tests uitvoeren
pnpm test
```

### Environment Variables

Kopieer `.env.example` naar `.env` en configureer:

```bash
cp .env.example .env
nano .env
```

Belangrijkste variabelen:
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Session signing secret (genereer met: `openssl rand -base64 32`)
- `GMAIL_EMAIL` - Gmail email adres voor notificaties
- `GMAIL_APP_PASSWORD` - Gmail app-specific password
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

## 🚀 Deployment

De applicatie kan op meerdere manieren gehost worden:

### Quick Deploy Opties

**0. Proxmox (Self-hosted - €0/maand) 🏠**
```bash
# Maak LXC container met Ubuntu 22.04
# Volg de complete PROXMOX-DEPLOYMENT.md guide
```
Perfect voor homelab! Zie **[PROXMOX-DEPLOYMENT.md](./PROXMOX-DEPLOYMENT.md)**

**1. Railway (Cloud - Makkelijkst) ☁️**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Voeg MySQL database toe via Railway dashboard en configureer environment variabelen.

**2. Docker 🐳**
```bash
docker-compose up -d
```
Start applicatie met MySQL database in containers.

**3. VPS (Full Control)**
```bash
# Build en start op Ubuntu/Debian server
pnpm install
pnpm run build
pm2 start npm --name coolblue-monitor -- start
```

### Gedetailleerde Deployment Guide

Zie **[DEPLOYMENT.md](./DEPLOYMENT.md)** voor complete instructies voor:
- Railway, Render, DigitalOcean App Platform
- VPS setup (Nginx, SSL, PM2)
- Docker deployment
- Database configuratie
- Monitoring en maintenance

## 🔄 Updating

### Proxmox / VPS Update (One-Command)

```bash
# SSH naar je server
ssh root@your-server

# Ga de container binnen (Proxmox LXC)
pct enter 105  # Of jouw container ID

# Run update script
./scripts/update.sh
```

Dit script doet automatisch:
- ✅ Pull nieuwste code
- ✅ Install dependencies
- ✅ Install/update Playwright browsers
- ✅ Build applicatie
- ✅ Restart PM2

### Handmatige Update

```bash
cd /opt/coolblue-monitor
git stash
git pull origin main
pnpm install
pnpm exec playwright install chromium
pnpm run build
pm2 restart coolblue-monitor
```

### Check Logs na Update

```bash
pm2 logs coolblue-monitor --lines 20
```

Je zou het IP adres en omgeving moeten zien:
```
Server running on http://localhost:3000/
[Server] Local network: http://192.168.178.27:3000/
[Server] Environment: production
[Server] Configuring Gmail for email notifications
```

## Toekomstige Verbeteringen

- [ ] Email service integratie (Resend/SendGrid)
- [ ] Mac app notificaties
- [ ] Product price history charts
- [ ] Bulk product import
- [ ] Telegram/Discord notificaties
- [ ] Advanced filtering en sorting
- [ ] Product comparison
- [ ] Wishlist sharing

## Licentie

MIT

## Support

Voor vragen of problemen, neem contact op via het dashboard.

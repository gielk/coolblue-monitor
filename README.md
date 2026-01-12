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

De volgende environment variables worden automatisch ingesteld:
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Session signing secret
- `VITE_APP_ID` - Manus OAuth app ID
- `OAUTH_SERVER_URL` - OAuth server URL

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

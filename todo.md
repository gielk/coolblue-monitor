# Coolblue Tweede Kans Monitor - TODO

## Phase 1: Database & Schema
- [x] Design database schema (products, monitoring configs, check history)
- [x] Create Drizzle ORM schema with tables
- [x] Run database migrations

## Phase 2: Dashboard UI
- [x] Design elegant dashboard layout
- [x] Build product add form with URL input and email field
- [x] Build product list with status indicators
- [x] Build monitoring settings UI (check intervals)
- [x] Build home page with features overview
- [x] Implement responsive design

## Phase 3: Coolblue Scraper
- [x] Analyze Coolblue page structure for Tweede Kans detection
- [x] Build scraper utility to fetch product data
- [x] Extract Tweede Kans availability and pricing
- [x] Extract product name, image, original price, Tweede Kans price

## Phase 4: Background Job System
- [x] Implement job scheduler for periodic checks
- [x] Create monitoring check logic
- [x] Track check history and status
- [x] Handle check intervals (15m, 30m, 1h, custom)

## Phase 5: Email Notifications
- [x] Create email template for Tweede Kans availability
- [x] Implement email sending logic
- [x] Include product details in emails
- [ ] Setup actual email service integration (Resend/SendGrid)

## Phase 6: Edit Functionality
- [x] Add edit procedure to tRPC router
- [x] Build edit modal in Dashboard UI
- [x] Add refresh status functionality
- [x] Show current status when editing
- [x] Improve Tweede Kans detection in scraper
- [x] Test scraper with provided product URLs

## Phase 7: Testing & Optimization
- [x] Write vitest tests for scraper
- [x] Write vitest tests for auth logout
- [ ] Test email notifications
- [ ] Performance optimization

## Phase 8: Deployment
- [ ] Final testing
- [ ] Create checkpoint
- [ ] Deploy to production


## New Issues & Fixes
- [x] Fix scraper prijs-extractie (huidige prijs vs Tweede Kans prijs)
- [x] Voeg email settings pagina toe
- [x] Implementeer email configuratie (SMTP/API keys)
- [x] Voeg email test functionaliteit toe


## Phase 3: Email & Background Jobs & Price Tracking
- [ ] Implementeer Google Gmail SMTP email service
- [ ] Voeg nodemailer package toe
- [ ] Maak email templates voor Tweede Kans notificaties
- [ ] Implementeer background job scheduler
- [ ] Test email verzending met Google app wachtwoord
- [ ] Voeg prijs tracking database schema toe
- [ ] Implementeer prijs tracking logica in jobs
- [ ] Voeg prijs grafiek toe aan dashboard
- [ ] Test volledige workflow end-to-end


## Phase 3: Email & Background Jobs - Completed
- [x] Installeer nodemailer package
- [x] Implementeer Google Gmail SMTP email service
- [x] Maak email templates voor Tweede Kans notificaties
- [x] Voeg prijs tracking database schema toe
- [x] Implementeer prijs tracking logica in jobs
- [x] Implementeer background job scheduler (elke 5 minuten)
- [x] Voeg Gmail credentials validation test toe
- [x] Integreer monitoring scheduler in server startup
- [x] Voeg prijs grafiek component toe (PriceChart)
- [x] Integreer PriceChart in Dashboard
- [x] Voeg grafiek knop toe aan product cards
- [x] Alle tests slagen (7 tests)


## Phase 4: Custom Notifications System - Completed
- [x] Voeg notifications tabel toe aan database schema
- [x] Voeg notificationPreferences tabel toe
- [x] Implementeer notificatie query helpers in db.ts
- [x] Maak notificatie service (createNotification, markAsRead, etc)
- [x] Voeg tRPC procedures toe voor notificaties
- [x] Bouw NotificationCenter component
- [x] Integreer NotificationCenter in Dashboard
- [x] Voeg notificatie voorkeuren tab toe aan Settings
- [x] Alle tests slagen (7 tests)


## Phase 5: Bug Fixes & UI Improvements - Completed
- [x] Repareer scraper prijs-extractie (huidige prijs €998 wordt €300)
- [x] Repareer product foto extractie (verkeerde afbeelding)
- [x] Verbeter dashboard product card UI layout
- [x] Test scraper met Samsung DV90DB7845GBU3 product
- [x] Alle 12 tests slagen


## Phase 6: Playwright Scraper Integration
- [x] Integreer Playwright scraper van GitHub
- [x] Repareer TypeScript import errors
- [x] Installeer Playwright browsers
- [x] Alle 12 tests slagen
- [ ] Test Playwright scraper met Samsung producten
- [ ] Valideer prijs-extractie (normale prijs, Tweede Kans prijs)

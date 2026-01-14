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

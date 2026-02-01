# Coolblue Monitor - Deployment Guide

Deze guide laat je zien hoe je de Coolblue Monitor applicatie kunt hosten op verschillende platformen.

## 📋 Vereisten

De applicatie heeft nodig:
- **Node.js** 18+ (met pnpm)
- **MySQL** database (versie 8.0+)
- **Environment variabelen** (zie hieronder)
- **Server met continue uptime** voor background jobs

---

## 🔧 Environment Variabelen

Maak een `.env` bestand in de root met:

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/coolblue_monitor"

# Email (Gmail bijvoorbeeld)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-specific-password"

# Server
NODE_ENV="production"
PORT=3000

# JWT Secret (genereer met: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here"

# Optional: Analytics
VITE_ANALYTICS_ENDPOINT=""
VITE_ANALYTICS_WEBSITE_ID=""
```

**Gmail App Password aanmaken:**
1. Ga naar Google Account → Security
2. Activeer 2-Step Verification
3. Ga naar "App passwords"
4. Genereer een nieuwe app password voor "Mail"
5. Gebruik deze in `GMAIL_APP_PASSWORD`

---

## 🚀 Hosting Opties

### Optie 0: **Proxmox** (Self-hosted - Beste voor homelab)

Heb je een Proxmox server? Perfect! Self-hosting geeft volledige controle zonder maandelijkse kosten.

**Zie de gedetailleerde [PROXMOX-DEPLOYMENT.md](./PROXMOX-DEPLOYMENT.md) guide voor:**
- LXC container deployment (lightweight, aanbevolen)
- Docker in LXC deployment
- Complete setup met MySQL, PM2, Nginx
- Backup strategieën met Proxmox
- Security hardening
- Network configuratie

**Snel overzicht:**
```bash
# Maak Ubuntu LXC container (2GB RAM, 2 cores, 10GB disk)
# Install Node.js, MySQL, PM2
# Clone repo, configure .env, build app
# Setup automatic backups
```

**Kosten:** €0/maand (alleen stroom) + volledige controle! 🎯

---

### Optie 1: **Railway** (Aanbevolen - Makkelijkst Cloud)

Railway is ideaal voor full-stack apps met database.

**Stappen:**
1. Maak account op [railway.app](https://railway.app)
2. Installeer Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login en deploy:
   ```bash
   railway login
   railway init
   railway up
   ```
4. Voeg MySQL toe via Railway dashboard:
   - Click "+ New" → Database → MySQL
   - Railway geeft automatisch `DATABASE_URL`
5. Voeg environment variabelen toe in Railway dashboard
6. Deploy succesvol! Railway geeft je een URL.

**Kosten:** ~$5-10/maand (gratis tier beschikbaar met beperking)

---

### Optie 2: **Render** (Gratis tier beschikbaar)

**Stappen:**
1. Push code naar GitHub
2. Ga naar [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect je GitHub repo
5. Configureer:
   - **Build Command:** `pnpm install && pnpm run build`
   - **Start Command:** `pnpm start`
   - **Environment:** Node
6. Voeg PostgreSQL/MySQL toe (of gebruik externe database zoals PlanetScale)
7. Voeg environment variabelen toe in Settings
8. Deploy!

**Kosten:** Gratis tier beschikbaar (spin down na inactiviteit), betaald vanaf $7/maand

---

### Optie 3: **DigitalOcean App Platform**

**Stappen:**
1. Push code naar GitHub
2. Ga naar [DigitalOcean](https://www.digitalocean.com)
3. Create → Apps → Deploy from GitHub
4. Selecteer repo
5. DigitalOcean detecteert automatisch Node.js
6. Voeg Managed MySQL Database toe ($15/maand)
7. Configure environment variabelen
8. Deploy!

**Kosten:** App $5/maand + Database $15/maand = ~$20/maand

---

### Optie 4: **VPS (DigitalOcean Droplet / Hetzner)**

Voor meer controle, gebruik een VPS server.

**Setup op Ubuntu 22.04 VPS:**

```bash
# 1. Update server
sudo apt update && sudo apt upgrade -y

# 2. Installeer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Installeer pnpm
npm install -g pnpm

# 4. Installeer MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# 5. Maak database aan
sudo mysql
CREATE DATABASE coolblue_monitor;
CREATE USER 'coolblue'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON coolblue_monitor.* TO 'coolblue'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 6. Clone project
cd /var/www
sudo git clone https://github.com/jouw-username/coolblue-monitor.git
cd coolblue-monitor

# 7. Install dependencies
pnpm install

# 8. Create .env file
sudo nano .env
# (paste environment variabelen en save)

# 9. Build applicatie
pnpm run build

# 10. Setup database
pnpm run db:push

# 11. Installeer PM2 voor process management
npm install -g pm2

# 12. Start applicatie
pm2 start npm --name "coolblue-monitor" -- start
pm2 save
pm2 startup

# 13. Installeer Nginx als reverse proxy
sudo apt install -y nginx

# 14. Configureer Nginx
sudo nano /etc/nginx/sites-available/coolblue-monitor
```

**Nginx configuratie:**
```nginx
server {
    listen 80;
    server_name jouw-domein.nl;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/coolblue-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Installeer SSL met Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jouw-domein.nl
```

**Kosten:**
- Hetzner: €4.50/maand (CX22)
- DigitalOcean: $6/maand (Basic Droplet)

---

### Optie 5: **Docker Deployment**

De applicatie kan ook via Docker gedeployed worden (zie `Dockerfile` en `docker-compose.yml`).

```bash
# Build en start met docker-compose
docker-compose up -d

# Logs bekijken
docker-compose logs -f

# Stoppen
docker-compose down
```

Deploy Docker container naar:
- **Google Cloud Run** (serverless, pay-per-use)
- **AWS ECS/Fargate**
- **Azure Container Instances**
- Elke VPS met Docker support

---

## 🗄️ Database Opties

### Managed Database Services (Aanbevolen):
1. **PlanetScale** (MySQL, gratis tier) - [planetscale.com](https://planetscale.com)
2. **Railway MySQL** (makkelijk, automatisch backup)
3. **DigitalOcean Managed Database** ($15/maand)
4. **AWS RDS** (schaalbaar, vanaf $15/maand)

### Zelf hosten:
- MySQL op dezelfde VPS als applicatie
- Let op: maak **dagelijkse backups**!
  ```bash
  # Backup script
  mysqldump -u coolblue -p coolblue_monitor > backup_$(date +%Y%m%d).sql
  ```

---

## 📊 Monitoring & Maintenance

### Process Management:
```bash
# PM2 status
pm2 status

# Herstart app
pm2 restart coolblue-monitor

# Logs bekijken
pm2 logs coolblue-monitor

# Monitor CPU/Memory
pm2 monit
```

### Database Backups:
```bash
# Automatische backups met cron
crontab -e

# Voeg toe (dagelijks om 2:00 AM):
0 2 * * * /usr/bin/mysqldump -u coolblue -p'password' coolblue_monitor > /backups/db_$(date +\%Y\%m\%d).sql
```

### Updates:
```bash
cd /var/www/coolblue-monitor
git pull origin main
pnpm install
pnpm run build
pm2 restart coolblue-monitor
```

---

## 🔒 Beveiliging

1. **Firewall instellen:**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **SSL Certificaat** (gratis met Let's Encrypt)

3. **Environment variabelen** nooit committen naar Git

4. **Sterke wachtwoorden** voor database en JWT_SECRET

5. **Reguliere updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 💡 Aanbeveling per Situatie

| Situatie | Aanbeveling |
|----------|-------------|
| **Beginnen/Prototypen** | Railway of Render (gratis tier) |
| **Productie, laag budget** | Hetzner VPS (€4.50/maand) |
| **Wil geen server beheer** | Railway ($5-10/maand) |
| **Veel traffic verwacht** | DigitalOcean App + Managed DB |
| **Enterprise/Schaalbaar** | AWS/Google Cloud met Docker |

---

## 🆘 Troubleshooting

### App start niet:
```bash
# Check logs
pm2 logs coolblue-monitor

# Test handmatig
node dist/index.js
```

### Database connectie errors:
```bash
# Test MySQL connectie
mysql -u coolblue -p -h localhost coolblue_monitor

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Port already in use:
```bash
# Vind process op poort 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Scraper werkt niet (403 errors):
- Dit is normaal op sommige hosting providers met strikte proxies
- Overweeg gebruik van rotating proxies service zoals ScrapingBee
- Of host op dedicated VPS met unieke IP

---

## 📞 Support

Vragen? Open een issue op GitHub of check de docs van je hosting provider.

Veel succes met je deployment! 🚀

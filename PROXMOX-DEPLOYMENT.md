# Coolblue Monitor - Proxmox Deployment Guide

Deze guide laat je zien hoe je de Coolblue Monitor applicatie op Proxmox kunt hosten.

## 🎯 Voordelen Proxmox Deployment

- ✅ **Geen maandelijkse kosten** (behalve stroom)
- ✅ **Volledige controle** over je data en infrastructuur
- ✅ **Uitstekende performance** met dedicated resources
- ✅ **Eenvoudige backups** met Proxmox Backup Server
- ✅ **Schaalbaar** - voeg resources toe wanneer nodig

---

## 📋 Vereisten

- Proxmox VE 7.x of 8.x
- Minimaal 2GB RAM beschikbaar
- 10GB disk space
- Internet verbinding voor de container/VM
- (Optioneel) Domeinnaam voor HTTPS

---

## 🚀 Optie 1: LXC Container (Aanbevolen)

LXC containers zijn lightweight en perfect voor Node.js applicaties.

### Stap 1: Download Ubuntu LXC Template

```bash
# In Proxmox shell
pveam update
pveam available | grep ubuntu
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst
```

### Stap 2: Maak LXC Container

**Via Proxmox Web UI:**
1. Click "Create CT"
2. Configuratie:
   - **Hostname:** `coolblue-monitor`
   - **Unprivileged container:** ✓ (aangevinkt)
   - **Password:** Kies een sterk wachtwoord
   - **Template:** ubuntu-22.04-standard
   - **Disk:** 10 GB
   - **CPU:** 2 cores
   - **Memory:** 2048 MB
   - **Swap:** 512 MB
   - **Network:** Bridge (vmbr0), DHCP of Static IP
3. Click "Finish"

**Of via CLI:**
```bash
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname coolblue-monitor \
  --memory 2048 \
  --swap 512 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --storage local-lvm \
  --rootfs local-lvm:10 \
  --unprivileged 1 \
  --features nesting=1

# Start de container
pct start 100
```

### Stap 3: Container Toegang

```bash
# Enter de container
pct enter 100

# Of via SSH (als je een static IP hebt)
ssh root@<container-ip>
```

### Stap 4: Installeer Dependencies

```bash
# Update systeem
apt update && apt upgrade -y

# Installeer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Installeer pnpm
npm install -g pnpm

# Installeer MySQL
apt install -y mysql-server

# Beveilig MySQL
mysql_secure_installation
# Volg de prompts:
# - Root password: JA, kies sterk wachtwoord
# - Remove anonymous users: JA
# - Disallow root login remotely: JA
# - Remove test database: JA
# - Reload privilege tables: JA
```

### Stap 5: Configureer Database

```bash
# Login in MySQL
mysql -u root -p

# Voer SQL commands uit:
```

```sql
CREATE DATABASE coolblue_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'coolblue'@'localhost' IDENTIFIED BY 'jouw_sterke_wachtwoord_hier';
GRANT ALL PRIVILEGES ON coolblue_monitor.* TO 'coolblue'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Stap 6: Deploy Applicatie

```bash
# Maak app directory
mkdir -p /opt/coolblue-monitor
cd /opt/coolblue-monitor

# Clone repository
git clone https://github.com/jouw-username/coolblue-monitor.git .

# Installeer dependencies
pnpm install

# Maak .env bestand
nano .env
```

Plak deze configuratie in `.env`:
```env
# Database
DATABASE_URL="mysql://coolblue:jouw_sterke_wachtwoord_hier@localhost:3306/coolblue_monitor"

# Server
NODE_ENV=production
PORT=3000

# JWT Secret (genereer met: openssl rand -base64 32)
JWT_SECRET=<plak-hier-gegenereerde-secret>

# Gmail (voor notificaties)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Genereer JWT secret:
```bash
openssl rand -base64 32
# Kopieer output naar JWT_SECRET in .env
```

### Stap 7: Build en Setup Database

```bash
# Build applicatie
pnpm run build

# Run database migraties
pnpm run db:push
```

### Stap 8: Installeer PM2 voor Process Management

```bash
# Installeer PM2 globaal
npm install -g pm2

# Start applicatie met PM2
pm2 start npm --name "coolblue-monitor" -- start

# Sla PM2 configuratie op
pm2 save

# Setup PM2 om te starten bij boot
pm2 startup

# Copy-paste de gegenereerde command en voer uit
```

### Stap 9: (Optioneel) Nginx Reverse Proxy

Als je HTTPS wilt of een subdomain:

```bash
# Installeer Nginx
apt install -y nginx certbot python3-certbot-nginx

# Maak Nginx config
nano /etc/nginx/sites-available/coolblue-monitor
```

Plak deze configuratie:
```nginx
server {
    listen 80;
    server_name coolblue.jouwdomain.nl;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activeer site:
```bash
# Enable site
ln -s /etc/nginx/sites-available/coolblue-monitor /etc/nginx/sites-enabled/

# Test configuratie
nginx -t

# Restart Nginx
systemctl restart nginx

# Installeer SSL certificaat (gratis met Let's Encrypt)
certbot --nginx -d coolblue.jouwdomain.nl
# Volg de prompts
```

### Stap 10: Firewall Configuratie

```bash
# Installeer ufw (uncomplicated firewall)
apt install -y ufw

# Allow SSH (BELANGRIJK - voorkom lockout!)
ufw allow 22/tcp

# Allow HTTP/HTTPS (als je Nginx gebruikt)
ufw allow 80/tcp
ufw allow 443/tcp

# Of allow alleen poort 3000 (als geen Nginx)
ufw allow 3000/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### ✅ Container Klaar!

Je applicatie draait nu op:
- **Direct:** `http://<container-ip>:3000`
- **Met Nginx:** `https://coolblue.jouwdomain.nl`

---

## 🐳 Optie 2: Docker in LXC Container

Voor een Docker deployment in Proxmox LXC.

### Stap 1: Maak Docker-Ready LXC Container

```bash
# Maak container met nesting enabled (voor Docker)
pct create 101 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname coolblue-docker \
  --memory 3072 \
  --swap 512 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --storage local-lvm \
  --rootfs local-lvm:15 \
  --unprivileged 1 \
  --features nesting=1,keyctl=1

# Start container
pct start 101
pct enter 101
```

### Stap 2: Installeer Docker

```bash
# Update en installeer dependencies
apt update && apt upgrade -y
apt install -y curl git

# Installeer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installeer Docker Compose
apt install -y docker-compose-plugin

# Verify installatie
docker --version
docker compose version
```

### Stap 3: Deploy met Docker Compose

```bash
# Clone repository
mkdir -p /opt/coolblue-monitor
cd /opt/coolblue-monitor
git clone https://github.com/jouw-username/coolblue-monitor.git .

# Maak .env bestand
cp .env.example .env
nano .env
# Configureer environment variabelen
```

Belangrijke environment variabelen voor Docker:
```env
# MySQL (Docker Compose gebruikt deze automatisch)
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_DATABASE=coolblue_monitor
MYSQL_USER=coolblue
MYSQL_PASSWORD=secure_user_password

# App
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://coolblue:secure_user_password@db:3306/coolblue_monitor
JWT_SECRET=<genereer-met-openssl-rand-base64-32>
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

```bash
# Start met Docker Compose
docker compose up -d

# Check logs
docker compose logs -f

# Check status
docker compose ps
```

### ✅ Docker Deployment Klaar!

Applicatie draait op: `http://<container-ip>:3000`

---

## 💾 Backup Strategieën

### Proxmox Backup (Aanbevolen)

**LXC Container Backup:**
```bash
# Via Proxmox Web UI:
# Datacenter → Backup → Add → Configure backup schedule

# Of via CLI:
vzdump 100 --mode snapshot --compress zstd --storage local
```

**Backup Schedule instellen:**
1. Datacenter → Backup
2. Add backup job
3. Selecteer container (100 of 101)
4. Schedule: Dagelijks om 2:00 AM
5. Retention: 7 daily, 4 weekly, 12 monthly

### Database Backup Script

Maak een backup script in de container:

```bash
nano /root/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="coolblue"
MYSQL_PASS="jouw_wachtwoord"
MYSQL_DB="coolblue_monitor"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Behoud alleen laatste 7 backups
ls -t $BACKUP_DIR/db_*.sql.gz | tail -n +8 | xargs rm -f

echo "Backup completed: db_$DATE.sql.gz"
```

Maak executable en schedule met cron:
```bash
chmod +x /root/backup-db.sh

# Voeg toe aan crontab
crontab -e

# Voeg regel toe (dagelijks om 3:00 AM):
0 3 * * * /root/backup-db.sh >> /var/log/db-backup.log 2>&1
```

---

## 🔧 Onderhoud & Management

### Container Monitoren

```bash
# PM2 status
pm2 status
pm2 monit  # Real-time monitoring

# Logs bekijken
pm2 logs coolblue-monitor

# Herstart app
pm2 restart coolblue-monitor

# Resource gebruik
htop  # Installeer met: apt install htop
```

### Updates Installeren

```bash
cd /opt/coolblue-monitor

# Pull laatste code
git pull origin main

# Installeer dependencies
pnpm install

# Build opnieuw
pnpm run build

# Run database migraties (indien nodig)
pnpm run db:push

# Herstart applicatie
pm2 restart coolblue-monitor
```

### Docker Updates

```bash
cd /opt/coolblue-monitor

# Pull laatste code
git pull origin main

# Rebuild en herstart containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Bekijk logs
docker compose logs -f
```

---

## 🌐 Netwerk Configuratie

### Static IP Toewijzen (Aanbevolen)

**Methode 1: Via Proxmox Web UI**
1. Stop de container
2. Container → Network → Edit
3. Wijzig van DHCP naar Static
4. IP: `192.168.1.100/24` (pas aan voor jouw netwerk)
5. Gateway: `192.168.1.1` (jouw router IP)
6. Start container

**Methode 2: In container /etc/network/interfaces**
```bash
nano /etc/network/interfaces
```

```
auto eth0
iface eth0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

```bash
# Herstart netwerk
systemctl restart networking
```

### Port Forwarding (Externe Toegang)

Als je de app van buiten je netwerk wilt benaderen:

1. **Router configureren:**
   - Externe poort: 8080 (of andere)
   - Interne IP: `<container-ip>`
   - Interne poort: 3000 (of 80/443 met Nginx)

2. **Firewall rules in Proxmox:**
```bash
# In Proxmox host shell
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination <container-ip>:3000
```

3. **Gebruik DynDNS** (als je geen static WAN IP hebt):
   - DuckDNS.org (gratis)
   - No-IP.com
   - DynDNS.com

---

## 🔒 Security Best Practices

### 1. Firewall
- ✅ Gebruik UFW in de container
- ✅ Allow alleen benodigde poorten
- ✅ Overweeg Proxmox firewall voor extra laag

### 2. Auto-updates
```bash
# Installeer unattended-upgrades
apt install -y unattended-upgrades

# Enable
dpkg-reconfigure --priority=low unattended-upgrades
```

### 3. SSH Hardening
```bash
nano /etc/ssh/sshd_config
```
```
PermitRootLogin no
PasswordAuthentication no  # Gebruik SSH keys
Port 2222  # Wijzig default poort
```

### 4. Fail2Ban (tegen brute force)
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 Resource Allocatie Aanbevelingen

| Scenario | RAM | CPU | Disk |
|----------|-----|-----|------|
| **Minimaal** (1-10 producten) | 1GB | 1 core | 8GB |
| **Aanbevolen** (10-50 producten) | 2GB | 2 cores | 10GB |
| **Heavy** (50+ producten) | 4GB | 4 cores | 15GB |

**Monitoring toevoegen:**
- Prometheus + Grafana
- Netdata (simpel, real-time)
- Glances (terminal-based)

---

## 🆘 Troubleshooting

### Container start niet
```bash
# Check container status
pct status 100

# Check logs
journalctl -u pve-container@100 -n 50
```

### App crashed
```bash
# Check PM2 logs
pm2 logs coolblue-monitor --lines 100

# Restart app
pm2 restart coolblue-monitor
```

### Database connectie problemen
```bash
# Test MySQL connectie
mysql -u coolblue -p coolblue_monitor

# Check MySQL status
systemctl status mysql

# Restart MySQL
systemctl restart mysql
```

### Out of memory
```bash
# Check memory usage
free -h

# Increase container memory in Proxmox UI:
# Container → Resources → Memory → Edit

# Of via CLI:
pct set 100 -memory 4096
```

### Disk vol
```bash
# Check disk usage
df -h

# Cleanup oude logs
pm2 flush
journalctl --vacuum-time=7d

# Resize disk in Proxmox UI:
# Container → Resources → Root Disk → Resize Disk
```

---

## 🎯 Production Checklist

- [ ] LXC container aangemaakt met voldoende resources
- [ ] Static IP toegewezen aan container
- [ ] MySQL geïnstalleerd en beveiligd
- [ ] Database aangemaakt met sterke wachtwoorden
- [ ] Applicatie geïnstalleerd en gebuild
- [ ] Environment variabelen correct geconfigureerd
- [ ] Database migraties uitgevoerd
- [ ] PM2 geïnstalleerd en app draait
- [ ] PM2 startup enabled voor auto-start
- [ ] (Optioneel) Nginx reverse proxy geconfigureerd
- [ ] (Optioneel) SSL certificaat geïnstalleerd
- [ ] Firewall geconfigureerd (UFW)
- [ ] Backup schedule ingesteld (Proxmox + DB)
- [ ] Monitoring opgezet (PM2/htop)
- [ ] Updates automatisch (unattended-upgrades)
- [ ] Health check endpoint werkt (`/health`)
- [ ] Email notificaties getest

---

## 💡 Extra Tips

### Meerdere Apps Hosten
- Gebruik verschillende containers per app
- Bridge netwerk voor inter-container communicatie
- Gedeelde MySQL container mogelijk (maar aparte databases)

### Resource Limits
```bash
# CPU limit
pct set 100 -cpulimit 2

# Memory limit + swap
pct set 100 -memory 2048 -swap 512
```

### Custom DNS
```bash
# In container
nano /etc/resolv.conf
```
```
nameserver 1.1.1.1
nameserver 8.8.8.8
```

### Monitoring Dashboard
Installeer Netdata voor mooie real-time monitoring:
```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Toegankelijk via: http://<container-ip>:19999
```

---

## 🎉 Klaar!

Je Coolblue Monitor draait nu op Proxmox met:
- ✅ Professionele setup
- ✅ Automatische backups
- ✅ Auto-restart bij crashes
- ✅ Production-ready configuratie
- ✅ Volledige controle

Vragen? Check de troubleshooting sectie of open een GitHub issue!

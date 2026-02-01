#!/bin/bash

#############################################
# Coolblue Monitor - Proxmox LXC Installer
# Geautomatiseerd installatiescript
#############################################

set -e  # Stop bij errors

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functie voor mooie output
print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

#############################################
# Configuratie
#############################################

print_step "Coolblue Monitor - Automatische Installatie"
echo ""

# Vraag om GitHub repo URL
read -p "GitHub repository URL (bijv. https://github.com/gielk/coolblue-monitor.git): " REPO_URL
if [ -z "$REPO_URL" ]; then
    REPO_URL="https://github.com/gielk/coolblue-monitor.git"
    echo "Gebruik default: $REPO_URL"
fi

# Vraag om Gmail configuratie
echo ""
print_step "Email configuratie voor notificaties"
read -p "Gmail adres: " GMAIL_USER
read -sp "Gmail App Password (16 karakters): " GMAIL_APP_PASSWORD
echo ""

# Genereer JWT secret
print_step "Genereer JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
print_success "JWT secret gegenereerd"

# Genereer MySQL wachtwoorden
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)
MYSQL_USER_PASSWORD=$(openssl rand -base64 16)

print_success "MySQL wachtwoorden gegenereerd"

#############################################
# Stap 1: Update systeem
#############################################

print_step "Stap 1/10: Update systeem..."
apt update -qq
apt upgrade -y -qq
print_success "Systeem geüpdatet"

#############################################
# Stap 2: Installeer Node.js 20
#############################################

print_step "Stap 2/10: Installeer Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs git > /dev/null 2>&1
print_success "Node.js $(node --version) geïnstalleerd"

#############################################
# Stap 3: Installeer pnpm
#############################################

print_step "Stap 3/10: Installeer pnpm..."
npm install -g pnpm > /dev/null 2>&1
print_success "pnpm $(pnpm --version) geïnstalleerd"

#############################################
# Stap 4: Installeer MySQL
#############################################

print_step "Stap 4/10: Installeer MySQL..."
export DEBIAN_FRONTEND=noninteractive
debconf-set-selections <<< "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD"
debconf-set-selections <<< "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD"
apt install -y mysql-server > /dev/null 2>&1
systemctl enable mysql > /dev/null 2>&1
systemctl start mysql
print_success "MySQL geïnstalleerd en gestart"

#############################################
# Stap 5: Configureer MySQL database
#############################################

print_step "Stap 5/10: Configureer database..."

# Maak database en user
mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE coolblue_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'coolblue'@'localhost' IDENTIFIED BY '$MYSQL_USER_PASSWORD';
GRANT ALL PRIVILEGES ON coolblue_monitor.* TO 'coolblue'@'localhost';
FLUSH PRIVILEGES;
EOF

print_success "Database 'coolblue_monitor' aangemaakt"

#############################################
# Stap 6: Clone repository
#############################################

print_step "Stap 6/10: Clone repository..."
mkdir -p /opt/coolblue-monitor
cd /opt/coolblue-monitor

# Clone repo (stil als het al bestaat)
if [ -d ".git" ]; then
    print_warning "Repository bestaat al, pull latest changes..."
    git pull origin main > /dev/null 2>&1 || git pull origin master > /dev/null 2>&1
else
    git clone "$REPO_URL" . > /dev/null 2>&1
fi

print_success "Repository gecloned naar /opt/coolblue-monitor"

#############################################
# Stap 7: Installeer dependencies
#############################################

print_step "Stap 7/10: Installeer dependencies (dit kan even duren)..."
pnpm install --frozen-lockfile > /dev/null 2>&1
print_success "Dependencies geïnstalleerd"

#############################################
# Stap 8: Configureer environment variabelen
#############################################

print_step "Stap 8/10: Configureer environment..."

cat > .env <<EOF
# Database
DATABASE_URL="mysql://coolblue:$MYSQL_USER_PASSWORD@localhost:3306/coolblue_monitor"

# Server
NODE_ENV=production
PORT=3000

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Email Notifications
GMAIL_USER=$GMAIL_USER
GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD

# Optional Analytics
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
EOF

chmod 600 .env
print_success "Environment variabelen geconfigureerd"

#############################################
# Stap 9: Build applicatie
#############################################

print_step "Stap 9/10: Build applicatie..."
pnpm run build > /dev/null 2>&1
print_success "Applicatie gebuild"

#############################################
# Stap 10: Setup database
#############################################

print_step "Stap 10/10: Run database migraties..."
pnpm run db:push > /dev/null 2>&1
print_success "Database schema geïnitialiseerd"

#############################################
# Installeer PM2
#############################################

print_step "Installeer PM2 process manager..."
npm install -g pm2 > /dev/null 2>&1

# Start applicatie met PM2
pm2 delete coolblue-monitor > /dev/null 2>&1 || true
pm2 start npm --name "coolblue-monitor" -- start
pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

print_success "PM2 geïnstalleerd en applicatie gestart"

#############################################
# Installeer UFW Firewall
#############################################

print_step "Configureer firewall..."
apt install -y ufw > /dev/null 2>&1

# Allow SSH (belangrijk!)
ufw allow 22/tcp > /dev/null 2>&1

# Allow app port
ufw allow 3000/tcp > /dev/null 2>&1

# Enable firewall (automatisch ja)
echo "y" | ufw enable > /dev/null 2>&1

print_success "Firewall geconfigureerd (poort 22 en 3000 open)"

#############################################
# Installeer unattended-upgrades
#############################################

print_step "Setup automatische updates..."
apt install -y unattended-upgrades > /dev/null 2>&1
dpkg-reconfigure --priority=low unattended-upgrades > /dev/null 2>&1
print_success "Automatische security updates ingeschakeld"

#############################################
# Maak backup script
#############################################

print_step "Maak database backup script..."

cat > /root/backup-coolblue.sh <<'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/root/backups/coolblue"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="coolblue"
MYSQL_PASS="MYSQL_PASSWORD_PLACEHOLDER"
MYSQL_DB="coolblue_monitor"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $MYSQL_USER -p"$MYSQL_PASS" $MYSQL_DB | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup .env en app config
cp /opt/coolblue-monitor/.env $BACKUP_DIR/env_$DATE.backup

# Behoud alleen laatste 7 backups
ls -t $BACKUP_DIR/db_*.sql.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "Backup completed: db_$DATE.sql.gz"
BACKUP_SCRIPT

# Vervang wachtwoord placeholder
sed -i "s/MYSQL_PASSWORD_PLACEHOLDER/$MYSQL_USER_PASSWORD/g" /root/backup-coolblue.sh

chmod +x /root/backup-coolblue.sh

# Setup cron job voor dagelijkse backup om 3:00 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-coolblue.sh >> /var/log/coolblue-backup.log 2>&1") | crontab -

print_success "Backup script geïnstalleerd (dagelijks om 3:00 AM)"

#############################################
# Sla credentials op
#############################################

print_step "Sla credentials op..."

cat > /root/coolblue-credentials.txt <<EOF
#############################################
# Coolblue Monitor - Credentials
# BEWAAR DIT BESTAND VEILIG!
#############################################

MySQL Root Password: $MYSQL_ROOT_PASSWORD
MySQL User: coolblue
MySQL User Password: $MYSQL_USER_PASSWORD
MySQL Database: coolblue_monitor

JWT Secret: $JWT_SECRET

Gmail User: $GMAIL_USER
Gmail App Password: $GMAIL_APP_PASSWORD

Application URL: http://$(hostname -I | awk '{print $1}'):3000

#############################################
# Handige commando's
#############################################

# App status bekijken:
pm2 status

# Logs bekijken:
pm2 logs coolblue-monitor

# App herstarten:
pm2 restart coolblue-monitor

# Database backup maken:
/root/backup-coolblue.sh

# MySQL inloggen:
mysql -u coolblue -p'$MYSQL_USER_PASSWORD' coolblue_monitor

#############################################
EOF

chmod 600 /root/coolblue-credentials.txt

print_success "Credentials opgeslagen in /root/coolblue-credentials.txt"

#############################################
# Test applicatie
#############################################

print_step "Test applicatie..."
sleep 3

# Check of app draait
if pm2 list | grep -q "coolblue-monitor.*online"; then
    print_success "Applicatie draait!"
else
    print_error "Applicatie start niet correct. Check logs met: pm2 logs coolblue-monitor"
    exit 1
fi

# Test health endpoint
CONTAINER_IP=$(hostname -I | awk '{print $1}')
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_success "Health check succesvol"
else
    print_warning "Health endpoint reageert niet (dit kan normaal zijn tijdens opstarten)"
fi

#############################################
# Installatie voltooid!
#############################################

echo ""
echo "========================================"
echo -e "${GREEN}✓ Installatie voltooid!${NC}"
echo "========================================"
echo ""
echo "Applicatie draait op:"
echo -e "${BLUE}http://$CONTAINER_IP:3000${NC}"
echo ""
echo "Credentials opgeslagen in:"
echo "/root/coolblue-credentials.txt"
echo ""
echo "Handige commando's:"
echo "  pm2 status                    - Bekijk app status"
echo "  pm2 logs coolblue-monitor     - Bekijk logs"
echo "  pm2 restart coolblue-monitor  - Herstart app"
echo "  cat /root/coolblue-credentials.txt - Bekijk credentials"
echo ""
echo "Database backups:"
echo "  Dagelijks om 3:00 AM in /root/backups/coolblue/"
echo ""
echo "Next steps:"
echo "  1. Open http://$CONTAINER_IP:3000 in je browser"
echo "  2. Setup port forwarding in je router (optioneel)"
echo "  3. Configureer Proxmox backup schedule"
echo ""
echo "Veel plezier met Coolblue Monitor! 🚀"
echo ""

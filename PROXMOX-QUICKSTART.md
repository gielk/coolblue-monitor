# 🚀 Coolblue Monitor - Proxmox Quick Start

Complete geautomatiseerde installatie in 3 stappen!

---

## 📋 Wat je nodig hebt

✅ Proxmox server (jouw setup: `proxmox.konink.me`)
✅ Gmail account voor notificaties
✅ Gmail App Password (ik help je dit aan te maken)
✅ 10 minuten tijd

---

## 🎯 Stap 1: Maak Gmail App Password

**Voordat we beginnen**, maak eerst een Gmail App Password aan:

1. Ga naar [Google Account → Security](https://myaccount.google.com/security)
2. Zorg dat **2-Step Verification** aan staat
   - Zo niet: klik "2-Step Verification" → Activeer
3. Ga naar **App passwords** (onderaan "Signing in to Google")
4. Klik "Create" of "Generate app password"
5. Selecteer:
   - **App:** Mail
   - **Device:** Other (Custom name) → typ "Coolblue Monitor"
6. Klik "Generate"
7. **Kopieer de 16-character password** (xxxx-xxxx-xxxx-xxxx)
8. Bewaar deze - je hebt hem zo nodig! ✍️

---

## 🎯 Stap 2: Maak LXC Container

### Optie A: Automatisch (Aanbevolen)

**In Proxmox Web UI → Shell (of SSH naar Proxmox host):**

```bash
# Download het container creator script
wget https://raw.githubusercontent.com/gielk/coolblue-monitor/main/scripts/create-container.sh

# Maak executable
chmod +x create-container.sh

# Run het script
./create-container.sh
```

Het script vraagt om:
- ✅ Netwerk configuratie (DHCP of Static IP - kies Static: **192.168.178.105**)
- ✅ Gateway: **192.168.178.1** (jouw router)
- ✅ Root password voor de container (kies iets sterks)

### Optie B: Handmatig

**In Proxmox Web UI:**

1. Klik **"Create CT"** (rechtsboven)
2. **General:**
   - Node: (jouw node)
   - CT ID: **105**
   - Hostname: **coolblue-monitor**
   - Password: (kies sterk wachtwoord)
   - ✅ Unprivileged container

3. **Template:**
   - Storage: **local**
   - Template: **ubuntu-22.04-standard**
   - (Als template nog niet gedownload is: Download eerst via Templates → Download)

4. **Disks:**
   - Storage: **local-lvm**
   - Disk size: **10 GB**

5. **CPU:**
   - Cores: **2**

6. **Memory:**
   - Memory: **2048 MB**
   - Swap: **512 MB**

7. **Network:**
   - Bridge: **vmbr0**
   - IPv4: **Static**
   - IPv4/CIDR: **192.168.178.105/24**
   - Gateway: **192.168.178.1**
   - IPv6: (leeglaten of DHCP)

8. **DNS:**
   - Use host settings: ✅

9. **Confirm:**
   - ✅ Start after created
   - Klik **Finish**

---

## 🎯 Stap 3: Run Installatiescript

### 3.1 Enter de Container

**In Proxmox Web UI:**
- Selecteer container **105 (coolblue-monitor)**
- Klik **"Console"** of **">_ Console"** knop

**Of via SSH:**
```bash
pct enter 105
```

Je bent nu in de container! 🎉

### 3.2 Download en Run Installatiescript

**Kopieer en plak deze commando's:**

```bash
# Download installatiescript
wget https://raw.githubusercontent.com/gielk/coolblue-monitor/main/scripts/proxmox-install.sh

# Maak executable
chmod +x proxmox-install.sh

# Run installatiescript
./proxmox-install.sh
```

### 3.3 Beantwoord de vragen

Het script vraagt om:

1. **GitHub repository URL:**
   ```
   https://github.com/gielk/coolblue-monitor.git
   ```
   (Of druk Enter voor default)

2. **Gmail adres:**
   ```
   jouw-email@gmail.com
   ```

3. **Gmail App Password:**
   ```
   xxxx-xxxx-xxxx-xxxx
   ```
   (De 16-character password die je in Stap 1 hebt gemaakt)

### 3.4 Wacht op installatie

Het script doet nu automatisch:
- ✅ Systeem updaten
- ✅ Node.js 20 installeren
- ✅ pnpm installeren
- ✅ MySQL installeren en configureren
- ✅ Database aanmaken
- ✅ Repository clonen
- ✅ Dependencies installeren
- ✅ Applicatie builden
- ✅ Database migraties runnen
- ✅ PM2 installeren en app starten
- ✅ Firewall configureren
- ✅ Automatische updates instellen
- ✅ Backup script maken

**Dit duurt ~5-8 minuten** ⏱️

---

## ✅ Klaar!

Als alles goed is gegaan zie je:

```
========================================
✓ Installatie voltooid!
========================================

Applicatie draait op:
http://192.168.178.105:3000

Credentials opgeslagen in:
/root/coolblue-credentials.txt
```

---

## 🌐 Open de Applicatie

Open in je browser:
```
http://192.168.178.105:3000
```

Je zou nu het Coolblue Monitor dashboard moeten zien! 🎉

---

## 📝 Credentials Bekijken

Alle wachtwoorden en configuratie staan in:

```bash
cat /root/coolblue-credentials.txt
```

Dit bevat:
- MySQL root password
- MySQL user password
- JWT secret
- Gmail configuratie
- Handige commando's

**Bewaar dit bestand veilig!**

---

## 🔧 Handige Commando's

```bash
# App status bekijken
pm2 status

# Logs live bekijken
pm2 logs coolblue-monitor

# App herstarten
pm2 restart coolblue-monitor

# App stoppen
pm2 stop coolblue-monitor

# Database backup maken
/root/backup-coolblue.sh

# MySQL console openen
mysql -u coolblue -p
# (wachtwoord staat in /root/coolblue-credentials.txt)
```

---

## 🔄 Proxmox Backups Instellen (Aanbevolen)

**In Proxmox Web UI:**

1. Ga naar **Datacenter → Backup**
2. Klik **Add** (rechtsboven)
3. Configureer:
   - **Storage:** local (of jouw backup storage)
   - **Schedule:** Daily
   - **Selection Mode:** Include selected VMs
   - **Selecteer:** 105 (coolblue-monitor) ✅
   - **Send email to:** (jouw email)
   - **Compression:** ZSTD
   - **Mode:** Snapshot
   - **Retention:** Keep last: **7**
4. Klik **Create**

Nu wordt je container elke dag automatisch gebackupped! 💾

---

## 🌍 Externe Toegang (Optioneel)

Wil je de app van buitenaf bereiken?

### Optie 1: Port Forwarding (Simpel)

**In je router:**
1. Ga naar Port Forwarding settings
2. Voeg toe:
   - **External Port:** 8080 (of andere)
   - **Internal IP:** 192.168.178.105
   - **Internal Port:** 3000
   - **Protocol:** TCP

Nu is je app bereikbaar via: `http://je-externe-ip:8080`

### Optie 2: Nginx Reverse Proxy + SSL (Professioneel)

Zie **[PROXMOX-DEPLOYMENT.md](./PROXMOX-DEPLOYMENT.md)** sectie "Stap 9: Nginx Reverse Proxy"

Hiermee krijg je:
- ✅ HTTPS met gratis SSL certificaat
- ✅ Custom domain (bijv. coolblue.jouwdomein.nl)
- ✅ Betere security

---

## 🆘 Troubleshooting

### Applicatie start niet

```bash
# Check logs
pm2 logs coolblue-monitor

# Check of MySQL draait
systemctl status mysql

# Herstart MySQL
systemctl restart mysql

# Herstart app
pm2 restart coolblue-monitor
```

### Kan applicatie niet bereiken

```bash
# Check firewall
ufw status

# Check of app luistert op poort 3000
netstat -tulpn | grep 3000

# Check container IP
ip addr show eth0
```

### Database errors

```bash
# Check MySQL status
systemctl status mysql

# Test MySQL connectie
mysql -u coolblue -p
# (wachtwoord uit /root/coolblue-credentials.txt)

# Run database migraties opnieuw
cd /opt/coolblue-monitor
pnpm run db:push
```

### Gmail notificaties werken niet

Check of je App Password correct is:
```bash
cat /root/coolblue-credentials.txt | grep GMAIL
```

Test Gmail settings in de app na het toevoegen van een product.

---

## 📊 Monitoring

**Real-time monitoring** met PM2:
```bash
pm2 monit
```

**Resource gebruik** bekijken:
```bash
# Installeer htop
apt install htop

# Run htop
htop
```

**Netdata** (Advanced - Optioneel):
```bash
# Installeer Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Toegankelijk via:
http://192.168.178.105:19999
```

---

## 🎉 Volgende Stappen

1. ✅ Open http://192.168.178.105:3000
2. ✅ Login (of maak account aan)
3. ✅ Voeg een Coolblue product toe
4. ✅ Test of je email notificaties ontvangt
5. ✅ Stel Proxmox backups in
6. ✅ (Optioneel) Configureer externe toegang

**Veel plezier met je Coolblue Monitor!** 🚀

---

## 📞 Hulp Nodig?

- Bekijk **[PROXMOX-DEPLOYMENT.md](./PROXMOX-DEPLOYMENT.md)** voor gedetailleerde info
- Check **[DEPLOYMENT.md](./DEPLOYMENT.md)** voor algemene deployment tips
- Open een issue op GitHub bij problemen

---

## 🔐 Security Checklist

- ✅ Sterke wachtwoorden gebruikt
- ✅ Firewall ingeschakeld (UFW)
- ✅ Automatische security updates actief
- ✅ Gmail App Password (niet je normale wachtwoord!)
- ✅ Credentials opgeslagen in `/root/` (alleen root toegang)
- ✅ Backups ingesteld
- [ ] (Optioneel) SSL/HTTPS met Let's Encrypt
- [ ] (Optioneel) Fail2Ban tegen brute force

Geniet van je self-hosted Coolblue Monitor! 🏠💻

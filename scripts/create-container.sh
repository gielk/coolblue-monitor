#!/bin/bash

#############################################
# Coolblue Monitor - Proxmox Container Creator
# Voer dit uit in de Proxmox host shell
#############################################

set -e

# Kleuren
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Coolblue Monitor - Container Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuratie
CTID=105
HOSTNAME="coolblue-monitor"
TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
STORAGE="local-lvm"
MEMORY=2048
SWAP=512
CORES=2
DISK_SIZE=10
NETWORK="vmbr0"

# Check of container ID al bestaat
if pct status $CTID &>/dev/null; then
    echo -e "${YELLOW}Container $CTID bestaat al!${NC}"
    read -p "Wil je deze verwijderen en opnieuw maken? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stop en verwijder container $CTID..."
        pct stop $CTID 2>/dev/null || true
        pct destroy $CTID
    else
        echo "Geannuleerd."
        exit 1
    fi
fi

# Download Ubuntu template als deze nog niet bestaat
echo -e "${BLUE}→${NC} Check Ubuntu template..."
if ! pveam list local | grep -q "$TEMPLATE"; then
    echo "Download Ubuntu 22.04 template..."
    pveam update
    pveam download local "$TEMPLATE"
fi

# Vraag om IP configuratie
echo ""
echo "Netwerk configuratie:"
echo "1) DHCP (automatisch IP)"
echo "2) Static IP (handmatig IP instellen)"
read -p "Keuze (1 of 2): " -n 1 -r
echo ""

if [[ $REPLY == "2" ]]; then
    read -p "Static IP (bijv. 192.168.178.105/24): " STATIC_IP
    read -p "Gateway (bijv. 192.168.178.1): " GATEWAY
    NETWORK_CONFIG="name=eth0,bridge=$NETWORK,ip=$STATIC_IP,gw=$GATEWAY"
else
    NETWORK_CONFIG="name=eth0,bridge=$NETWORK,ip=dhcp"
fi

# Vraag om root password
echo ""
read -sp "Root password voor container: " ROOT_PASSWORD
echo ""

# Maak container
echo -e "${BLUE}→${NC} Maak LXC container..."
pct create $CTID local:vztmpl/$TEMPLATE \
  --hostname $HOSTNAME \
  --password "$ROOT_PASSWORD" \
  --memory $MEMORY \
  --swap $SWAP \
  --cores $CORES \
  --net0 "$NETWORK_CONFIG" \
  --storage $STORAGE \
  --rootfs $STORAGE:$DISK_SIZE \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 1

echo -e "${GREEN}✓${NC} Container $CTID aangemaakt"

# Start container
echo -e "${BLUE}→${NC} Start container..."
pct start $CTID
sleep 5

echo -e "${GREEN}✓${NC} Container gestart"

# Haal IP adres op
CONTAINER_IP=$(pct exec $CTID -- hostname -I | awk '{print $1}')

# Download installatie script naar container
echo -e "${BLUE}→${NC} Download installatiescript naar container..."
pct exec $CTID -- bash -c "mkdir -p /root/setup && apt update -qq && apt install -y curl wget > /dev/null 2>&1"

# Toon instructies
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Container succesvol aangemaakt!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Container ID: $CTID"
echo "Hostname: $HOSTNAME"
echo "IP adres: $CONTAINER_IP"
echo "Resources: ${MEMORY}MB RAM, ${CORES} cores, ${DISK_SIZE}GB disk"
echo ""
echo -e "${YELLOW}Volgende stap:${NC}"
echo ""
echo "1. Enter de container:"
echo -e "   ${BLUE}pct enter $CTID${NC}"
echo ""
echo "2. Download en run het installatiescript:"
echo -e "   ${BLUE}curl -sSL https://raw.githubusercontent.com/jouw-username/coolblue-monitor/main/scripts/proxmox-install.sh | bash${NC}"
echo ""
echo "   Of handmatig:"
echo -e "   ${BLUE}wget https://raw.githubusercontent.com/jouw-username/coolblue-monitor/main/scripts/proxmox-install.sh${NC}"
echo -e "   ${BLUE}chmod +x proxmox-install.sh${NC}"
echo -e "   ${BLUE}./proxmox-install.sh${NC}"
echo ""
echo -e "${YELLOW}Alternatief (als je repo lokaal hebt):${NC}"
echo "   Kopieer proxmox-install.sh naar de container en run:"
echo -e "   ${BLUE}pct push $CTID /pad/naar/proxmox-install.sh /root/install.sh${NC}"
echo -e "   ${BLUE}pct enter $CTID${NC}"
echo -e "   ${BLUE}chmod +x /root/install.sh && /root/install.sh${NC}"
echo ""


#!/bin/bash

echo "Felsökning och reparation av NEEA Flask Server"
echo "=============================="

# Funktion för att sätta färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Definiera kritiska kataloger och filer
BASE_DIR="/var/www/neea.fun/listener/neea"
REPO_DIR="$BASE_DIR/logkeeper-guardian"
VENV_DIR="$BASE_DIR/venv"
SERVER_PY="$BASE_DIR/server.py"
INSTRUCTIONS_PY="$BASE_DIR/instructions.py"
STATIC_DIR="$BASE_DIR/static"
LOGS_DIR="$BASE_DIR/data/logs"
CLIENT_LOGS_DIR="$LOGS_DIR/clients"
CONFIG_DIR="$BASE_DIR/config"
TEMPLATES_DIR="$BASE_DIR/templates"

log_info "Kontrollerar systemkrav..."
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 är inte installerat. Installera med 'apt-get install python3 python3-venv'"
    exit 1
fi

log_info "Kontrollerar om systemd-tjänsten finns..."
systemctl status neea-flask.service || log_warning "Tjänsten existerar inte eller körs inte"

log_info "Skapar nödvändiga kataloger..."
mkdir -p $LOGS_DIR
mkdir -p $CLIENT_LOGS_DIR
mkdir -p $CONFIG_DIR
mkdir -p $STATIC_DIR
mkdir -p $TEMPLATES_DIR

log_info "Kontrollerar om Flask-serverfiler finns..."
if [ ! -f "$SERVER_PY" ]; then
    log_warning "server.py saknas, kopierar från repository..."
    cp "$REPO_DIR/src/scripts/server.py" "$SERVER_PY" || log_error "Kunde inte kopiera server.py"
else
    log_success "server.py hittades"
fi

if [ ! -f "$INSTRUCTIONS_PY" ]; then
    log_warning "instructions.py saknas, kopierar från repository..."
    cp "$REPO_DIR/src/scripts/instructions.py" "$INSTRUCTIONS_PY" || log_error "Kunde inte kopiera instructions.py"
else
    log_success "instructions.py hittades"
fi

log_info "Kontrollerar frontend-filer..."
if [ -d "$REPO_DIR/dist" ] && [ "$(ls -A $REPO_DIR/dist 2>/dev/null)" ]; then
    log_info "Kopierar byggda frontend-filer från repository..."
    cp -r "$REPO_DIR/dist"/* "$STATIC_DIR/" || log_warning "Kunde inte kopiera frontend-filer"
    log_success "Frontend-filer kopierade"
else
    log_warning "Inga byggda frontend-filer hittades i repository"
fi

log_info "Skapar och konfigurerar virtuell miljö..."
if [ -d "$VENV_DIR" ]; then
    log_info "Tar bort befintlig virtuell miljö..."
    rm -rf "$VENV_DIR"
fi

log_info "Installerar python3-venv om det behövs..."
apt-get update && apt-get install -y python3-venv python3.10-venv

log_info "Skapar ny virtuell miljö..."
python3 -m venv "$VENV_DIR" || log_error "Kunde inte skapa virtuell miljö"

if [ ! -f "$VENV_DIR/bin/python" ]; then
    log_error "Virtuell miljö skapades inte korrekt. Försöker med alternativa metoder..."
    
    if command -v python3.10 &> /dev/null; then
        log_info "Provar med Python 3.10 specifikt..."
        python3.10 -m venv "$VENV_DIR" || log_error "Kunde inte skapa virtuell miljö med Python 3.10"
    else
        log_error "Python 3.10 är inte tillgängligt"
    fi
    
    if [ ! -f "$VENV_DIR/bin/python" ]; then
        log_error "Kunde inte skapa virtuell miljö. Avbryter."
        exit 1
    fi
fi

log_info "Uppgraderar pip och installerar beroenden..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install wheel
"$VENV_DIR/bin/pip" install flask flask-cors

log_success "Paket installerade:"
"$VENV_DIR/bin/pip" list | grep -E 'flask|cors'

log_info "Uppdaterar systemd-servicefil..."
cat > /etc/systemd/system/neea-flask.service << EOF
[Unit]
Description=NEEA Flask Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$BASE_DIR
ExecStart=$VENV_DIR/bin/python $SERVER_PY
Environment="PYTHONUNBUFFERED=1"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=neea-flask
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

log_info "Sätter korrekta rättigheter..."
chown -R www-data:www-data "$BASE_DIR"
chmod -R 755 "$BASE_DIR"

log_info "Laddar om systemd och startar om tjänsten..."
systemctl daemon-reload
systemctl restart neea-flask.service
sleep 3

if systemctl is-active --quiet neea-flask.service; then
    log_success "NEEA Flask Server startad framgångsrikt!"
else
    log_error "Flask-servern startade inte. Kontrollerar loggar..."
    journalctl -u neea-flask.service -n 20
    
    log_info "Försöker med enkel server som fallback..."
    cp "$REPO_DIR/src/scripts/simple_server.py" "$SERVER_PY"
    systemctl restart neea-flask.service
    sleep 3
    
    if systemctl is-active --quiet neea-flask.service; then
        log_success "Enkel server startad framgångsrikt som fallback!"
    else
        log_error "Även enkel server misslyckades. Kritiskt fel."
        journalctl -u neea-flask.service -n 20
    fi
fi

log_info "Kontrollerar om servern svarar..."
if curl -s http://localhost:8000/api/status > /dev/null; then
    log_success "Servern svarar på port 8000!"
else
    log_warning "Servern svarar inte på port 8000. Kontrollerar om processen lyssnar..."
    netstat -tulpn | grep 8000 || log_error "Ingen process lyssnar på port 8000"
fi

log_success "Felsökning och reparation slutförd."
echo ""
echo "Om problem kvarstår, kör 'bash $REPO_DIR/src/scripts/debug_commands.sh' för detaljerad felsökningsinformation."

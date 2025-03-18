
#!/bin/bash

# Set color variables
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

# Sätt variabler för viktiga kataloger
BASE_DIR="/var/www/neea.fun/listener/neea"
FRONTEND_DIR="$BASE_DIR/logkeeper-guardian/dist"
SCRIPT_DIR="$BASE_DIR/logkeeper-guardian/src/scripts"

# Kopiera WSGI-filen
log_info "Kopierar WSGI-filen till rätt plats..."
cp "$SCRIPT_DIR/neea.wsgi" "$BASE_DIR/neea.wsgi"
chmod 644 "$BASE_DIR/neea.wsgi"
chown www-data:www-data "$BASE_DIR/neea.wsgi"
log_success "WSGI-filen har kopierats"

# Kopiera statiska frontend-filer
log_info "Kopierar frontend-filer från $FRONTEND_DIR till $BASE_DIR/static..."
if [ -d "$FRONTEND_DIR" ] && [ "$(ls -A $FRONTEND_DIR 2>/dev/null)" ]; then
    mkdir -p "$BASE_DIR/static"
    cp -r "$FRONTEND_DIR"/* "$BASE_DIR/static/"
    chmod -R 755 "$BASE_DIR/static"
    chown -R www-data:www-data "$BASE_DIR/static"
    log_success "Frontend-filer har kopierats"
else
    log_warning "Inga frontend-filer hittades i $FRONTEND_DIR"
fi

# Säkerställ att server.py finns på plats
log_info "Kontrollerar att server.py finns..."
if [ -f "$SCRIPT_DIR/server.py" ] && [ ! -f "$BASE_DIR/server.py" ]; then
    cp "$SCRIPT_DIR/server.py" "$BASE_DIR/server.py"
    chmod 644 "$BASE_DIR/server.py"
    chown www-data:www-data "$BASE_DIR/server.py"
    log_success "server.py har kopierats"
elif [ -f "$BASE_DIR/server.py" ]; then
    log_info "server.py finns redan"
else
    log_error "Kunde inte hitta server.py!"
    exit 1
fi

# Säkerställ att instructions.py finns
log_info "Kontrollerar att instructions.py finns..."
if [ ! -f "$BASE_DIR/instructions.py" ]; then
    log_error "instructions.py saknas! Detta behövs för servern."
    exit 1
fi

# Verifiera Apache-konfigurationen
log_info "Verifierar Apache-konfigurationen..."
if apache2ctl configtest; then
    log_success "Apache-konfigurationen är korrekt"
else
    log_error "Problem med Apache-konfigurationen!"
    exit 1
fi

log_info "Startar om Apache..."
systemctl restart apache2

log_info "Kontrollerar om Apache körs..."
if systemctl is-active --quiet apache2; then
    log_success "Apache startades om korrekt"
else
    log_error "Apache kunde inte startas om! Kontrollera loggarna: 'journalctl -u apache2'"
    exit 1
fi

log_info "Kontrollerar om webbservern svarar..."
if curl -s --head http://localhost | grep "HTTP/" > /dev/null; then
    log_success "Webbservern svarar"
else
    log_warning "Webbservern svarar inte på port 80"
fi

log_info "Konfigurationen är klar. Du bör nu kunna komma åt din webbapplikation på: https://neea.fun"
log_info "Om du har problem, kontrollera följande loggar:"
log_info "- Apache-loggar: /var/log/apache2/neea.fun_error.log"
log_info "- WSGI-loggar: $BASE_DIR/wsgi_errors.log"
log_info "- Flask-loggar: $BASE_DIR/neea_server.log"


#!/bin/bash

echo "Skapar virtuell miljö med beroenden..."

# Skapa kataloger om de inte finns
mkdir -p /var/www/neea.fun/listener/neea/data/logs/clients
mkdir -p /var/www/neea.fun/listener/neea/config
mkdir -p /var/www/neea.fun/listener/neea/static
mkdir -p /var/www/neea.fun/listener/neea/templates

# Kopiera frontend-filer
cp -r /var/www/neea.fun/listener/neea/logkeeper-guardian/dist/* /var/www/neea.fun/listener/neea/static/ 2>/dev/null || echo "Inga frontend-filer hittades"

# Ta bort tidigare virtuell miljö om den finns
rm -rf /var/www/neea.fun/listener/neea/venv

# Skapa en ny virtuell miljö med Python 3.10
echo "Skapar virtuell miljö..."
python3.10 -m venv /var/www/neea.fun/listener/neea/venv || python3 -m venv /var/www/neea.fun/listener/neea/venv

# Kontrollera om venv skapades
if [ ! -f /var/www/neea.fun/listener/neea/venv/bin/python ]; then
    echo "VARNING: Misslyckades med att skapa virtuell miljö. Försöker installera python3-venv..."
    apt-get update && apt-get install -y python3-venv python3.10-venv
    python3.10 -m venv /var/www/neea.fun/listener/neea/venv || python3 -m venv /var/www/neea.fun/listener/neea/venv
    
    if [ ! -f /var/www/neea.fun/listener/neea/venv/bin/python ]; then
        echo "KRITISKT FEL: Kan inte skapa virtuell miljö. Avbryter."
        exit 1
    fi
fi

echo "Installerar paket i virtuell miljö..."
# Aktivera virtuell miljö och installera paket
/var/www/neea.fun/listener/neea/venv/bin/pip install --upgrade pip
/var/www/neea.fun/listener/neea/venv/bin/pip install wheel
/var/www/neea.fun/listener/neea/venv/bin/pip install flask flask-cors

# Visa installerade paket
echo "Installerade paket:"
/var/www/neea.fun/listener/neea/venv/bin/pip list

# Sätt korrekta rättigheter
echo "Sätter korrekta rättigheter..."
chown -R www-data:www-data /var/www/neea.fun/listener/neea/
chmod -R 755 /var/www/neea.fun/listener/neea/

echo "Virtuell miljö skapad och konfigurerad."

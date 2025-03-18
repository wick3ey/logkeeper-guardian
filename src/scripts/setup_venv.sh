
#!/bin/bash

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
python3.10 -m venv /var/www/neea.fun/listener/neea/venv || python3 -m venv /var/www/neea.fun/listener/neea/venv

# Aktivera virtuell miljö och installera paket
/var/www/neea.fun/listener/neea/venv/bin/pip install flask flask-cors

# Sätt korrekta rättigheter
chown -R www-data:www-data /var/www/neea.fun/listener/neea/
chmod -R 755 /var/www/neea.fun/listener/neea/

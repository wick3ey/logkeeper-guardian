
#!/bin/bash

echo "Felsökning av NEEA Flask Server"
echo "=============================="

echo -e "\n1. Kontrollerar nuvarande status..."
systemctl status neea-flask.service || echo "Service not found"

echo -e "\n2. Kontrollerar om server.py finns..."
if [ ! -f /var/www/neea.fun/listener/neea/server.py ]; then
    echo "server.py saknas, kopierar från repository..."
    cp /var/www/neea.fun/listener/neea/logkeeper-guardian/src/scripts/server.py /var/www/neea.fun/listener/neea/
fi

echo -e "\n3. Kontrollerar om instructions.py finns..."
if [ ! -f /var/www/neea.fun/listener/neea/instructions.py ]; then
    echo "instructions.py saknas, kopierar från repository..."
    cp /var/www/neea.fun/listener/neea/logkeeper-guardian/src/scripts/instructions.py /var/www/neea.fun/listener/neea/
fi

echo -e "\n4. Skapar virtuell miljö och installerar beroenden..."
mkdir -p /var/www/neea.fun/listener/neea/data/logs/clients
mkdir -p /var/www/neea.fun/listener/neea/config
mkdir -p /var/www/neea.fun/listener/neea/static
mkdir -p /var/www/neea.fun/listener/neea/templates

rm -rf /var/www/neea.fun/listener/neea/venv
python3 -m venv /var/www/neea.fun/listener/neea/venv
/var/www/neea.fun/listener/neea/venv/bin/pip install flask flask-cors

echo -e "\n5. Kopierar frontend-filer..."
cp -r /var/www/neea.fun/listener/neea/logkeeper-guardian/dist/* /var/www/neea.fun/listener/neea/static/ 2>/dev/null || echo "Inga frontend-filer hittades"

echo -e "\n6. Uppdaterar systemd-service filen..."
cat > /etc/systemd/system/neea-flask.service << 'EOF'
[Unit]
Description=NEEA Flask Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/neea.fun/listener/neea
ExecStart=/var/www/neea.fun/listener/neea/venv/bin/python /var/www/neea.fun/listener/neea/server.py
Environment="PYTHONUNBUFFERED=1"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=neea-flask
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo -e "\n7. Sätter korrekta rättigheter..."
chown -R www-data:www-data /var/www/neea.fun/listener/neea/
chmod -R 755 /var/www/neea.fun/listener/neea/

echo -e "\n8. Laddar om systemd och startar om tjänsten..."
systemctl daemon-reload
systemctl restart neea-flask.service
sleep 3
systemctl status neea-flask.service

echo -e "\n9. Kontrollerar om servern svarar..."
curl -s http://localhost:8000/api/status || echo "Servern svarar inte på port 8000"

echo -e "\n10. Om servern fortfarande inte fungerar, försöker med enkel server..."
if ! curl -s http://localhost:8000/api/status > /dev/null; then
    echo "Använder enkel server som fallback..."
    cp /var/www/neea.fun/listener/neea/logkeeper-guardian/src/scripts/simple_server.py /var/www/neea.fun/listener/neea/server.py
    systemctl restart neea-flask.service
    sleep 3
    systemctl status neea-flask.service
    curl -s http://localhost:8000/api/status || echo "Även enkel server misslyckades"
fi

echo -e "\nFelsökning klar. Kontrollera status och loggar för mer information."

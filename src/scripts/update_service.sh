
#!/bin/bash

echo "Uppdaterar systemd service för NEEA Flask Server..."

# Skapa uppdaterad servicefil med bättre loggar
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
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

# Ladda om systemd och starta om tjänsten
echo "Laddar om systemd och startar om tjänsten..."
systemctl daemon-reload
systemctl restart neea-flask.service
sleep 2
systemctl status neea-flask.service

# Kontrollera om tjänsten körs
if systemctl is-active --quiet neea-flask.service; then
    echo "NEEA Flask Server startad framgångsrikt!"
else
    echo "VARNING: NEEA Flask Server startade inte. Kontrollera loggar för mer information."
    echo "Senaste loggmeddelanden:"
    journalctl -u neea-flask.service -n 20
fi

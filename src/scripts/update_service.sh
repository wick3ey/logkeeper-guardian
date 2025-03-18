
#!/bin/bash

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
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Ladda om systemd och starta om tjänsten
systemctl daemon-reload
systemctl restart neea-flask.service
systemctl status neea-flask.service

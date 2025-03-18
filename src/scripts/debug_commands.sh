
#!/bin/bash

echo "=== NEEA Flask Server Debug Information ==="
echo "Körs $(date)"
echo

echo "1. Systemd Service Status:"
systemctl status neea-flask.service
echo

echo "2. Process Information (port 8000):"
netstat -tulpn | grep 8000 || echo "Ingen process lyssnar på port 8000"
echo

echo "3. Python Versions Available:"
which python3
python3 --version
echo

echo "4. Virtual Environment Status:"
if [ -f /var/www/neea.fun/listener/neea/venv/bin/python ]; then
    echo "Virtuell miljö finns"
    /var/www/neea.fun/listener/neea/venv/bin/python --version
    echo "Installerade paket:"
    /var/www/neea.fun/listener/neea/venv/bin/pip list | grep -E 'flask|cors'
else
    echo "Virtuell miljö saknas eller är skadad"
fi
echo

echo "5. File Existence Check:"
echo "server.py: $([ -f /var/www/neea.fun/listener/neea/server.py ] && echo 'Finns' || echo 'Saknas')"
echo "instructions.py: $([ -f /var/www/neea.fun/listener/neea/instructions.py ] && echo 'Finns' || echo 'Saknas')"
echo "static directory: $([ -d /var/www/neea.fun/listener/neea/static ] && echo 'Finns' || echo 'Saknas')"
echo

echo "6. Server Recent Logs:"
journalctl -u neea-flask.service -n 20
echo

echo "7. Apache Status (for proxy):"
systemctl status apache2 || echo "Apache status kunde inte hämtas"
echo

echo "8. Quick Test:"
curl -s http://localhost:8000/api/status || echo "Server svarar inte på port 8000"
echo

echo "=== Slut på felsökningsinformation ==="

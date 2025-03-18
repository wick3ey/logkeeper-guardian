
#!/bin/bash

# Kontrollera service-status med mer detaljer
systemctl status neea-flask.service

# Visa de senaste loggarna från tjänsten
journalctl -u neea-flask.service -n 50

# Se vilka processer som lyssnar på port 8000
netstat -tulpn | grep 8000

# Starta om servicen för att se om det hjälper
systemctl restart neea-flask.service

# Kontrollera service-status igen
systemctl status neea-flask.service

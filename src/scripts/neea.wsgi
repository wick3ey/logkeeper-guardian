
import sys
import os
import logging

# Konfigurera loggning för WSGI
logging.basicConfig(
    filename='/var/www/neea.fun/listener/neea/wsgi_errors.log',
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logging.info("WSGI-skriptet startar")

# Lägg till applikationsmapparna i sökvägarna
base_dir = '/var/www/neea.fun/listener/neea'
sys.path.insert(0, base_dir)
sys.path.insert(0, '/var/www/neea.fun/listener/neea/logkeeper-guardian/src/scripts')

# Sätt miljövariabel för att indikera att vi kör via WSGI
os.environ['FLASK_ENV'] = 'production'
os.environ['PYTHONUNBUFFERED'] = '1'

try:
    # Importera Flask-applikationen
    from server import app as application
    logging.info("Flask-applikationen laddades framgångsrikt")
except Exception as e:
    logging.error(f"Fel vid laddning av applikationen: {str(e)}")
    import traceback
    logging.error(traceback.format_exc())
    # Återkasta undantaget så att Apache kan logga det
    raise

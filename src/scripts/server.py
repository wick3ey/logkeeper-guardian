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

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIRECTORY, "server.log")),
        logging.StreamHandler(sys.stdout)
    ]
)

# Global variables for auto-ping thread
auto_ping_thread = None
auto_ping_running = False

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
    try:
        if not os.path.exists(TEMPLATES_DIRECTORY):
            os.makedirs(TEMPLATES_DIRECTORY, exist_ok=True)
            logging.info(f"Skapade mallkatalog: {TEMPLATES_DIRECTORY}")
            
        # Skapa grundläggande mallfiler om de saknas
        for template_name, template_content in {
            "login.html": """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Neea Server - Login</title>
                <link rel="stylesheet" href="/static/style.css">
            </head>
            <body>
                <div class="login-container">
                    <h1>Neea Server</h1>
                    <form method="post">
                        <div class="form-group">
                            <label for="username">Användarnamn:</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Lösenord:</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        {% if error %}
                        <div class="error">{{ error }}</div>
                        {% endif %}
                        <button type="submit">Logga in</button>
                    </form>
                </div>
            </body>
            </html>
            """,
            "viewer.html": """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Neea Server - Client Viewer</title>
                <link rel="stylesheet" href="/static/style.css">
                <script src="/static/script.js"></script>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>Neea Client Viewer</h1>
                        <div class="header-actions">
                            <a href="{{ url_for('viewer') }}?logout=1" class="btn btn-logout">Logga ut</a>
                        </div>
                    </header>
                    <div class="dashboard">
                        <div class="widget">
                            <div class="widget-title">Totalt antal klienter</div>
                            <div class="widget-value">{{ total_clients }}</div>
                        </div>
                        <div class="widget">
                            <div class="widget-title">Aktiva klienter</div>
                            <div class="widget-value">{{ active_clients }}</div>
                        </div>
                        <div class="widget">
                            <div class="widget-title">Totalt antal loggar</div>
                            <div class="widget-value">{{ total_logs }}</div>
                        </div>
                        <div class="widget">
                            <div class="widget-title">Lagring använd</div>
                            <div class="widget-value">{{ storage_used }}</div>
                        </div>
                        <div class="widget">
                            <div class="widget-title">Senaste aktivitet</div>
                            <div class="widget-value">{{ latest_activity }}</div>
                        </div>
                    </div>
                    <div class="main-content">
                        <div class="sidebar">
                            <h2>Klienter</h2>
                            <div class="client-list">
                                {% for client in sorted_clients %}
                                <a href="{{ url_for('viewer') }}?client={{ client.id }}" class="client-item {% if client.id == selected_client %}active{% endif %} {% if client.is_active %}online{% else %}offline{% endif %}">
                                    <div class="client-name">{{ client.name }}</div>
                                    <div class="client-info">{{ client.os }}</div>
                                    <div class="client-status">{{ "Online" if client.is_active else "Offline" }}</div>
                                </a>
                                {% else %}
                                <div class="no-clients">Inga klienter registrerade</div>
                                {% endfor %}
                            </div>
                        </div>
                        <div class="content">
                            {% if selected_client %}
                            <div class="client-details">
                                <h2>Klientinformation</h2>
                                <div class="client-info-grid">
                                    <div class="info-item">
                                        <div class="info-label">Klient-ID</div>
                                        <div class="info-value">{{ selected_client }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Namn</div>
                                        <div class="info-value">{{ client_info.name }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">OS</div>
                                        <div class="info-value">{{ client_info.os }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Status</div>
                                        <div class="info-value status-{{ 'online' if client_info.is_active else 'offline' }}">
                                            {{ "Online" if client_info.is_active else "Offline" }}
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Senaste aktivitet</div>
                                        <div class="info-value">{{ client_info.last_activity }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">IP-adress</div>
                                        <div class="info-value">{{ client_info.ip }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Publik IP</div>
                                        <div class="info-value">{{ client_info.public_ip }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Instruktion</div>
                                        <div class="info-value">{{ client_info.instruction }}</div>
                                    </div>
                                </div>

                                <div class="client-actions">
                                    <h3>Åtgärder</h3>
                                    <div class="action-buttons">
                                        <a href="#" class="btn" onclick="pingClient('{{ selected_client }}'); return false;">Ping</a>
                                        <a href="#" class="btn" onclick="clearLogs('{{ selected_client }}'); return false;">Rensa loggar</a>
                                        
                                        <form class="instruction-form">
                                            <select id="instruction-select">
                                                {% for inst_type in instruction_types %}
                                                <option value="{{ inst_type }}" {% if client_info.instruction == inst_type %}selected{% endif %}>{{ inst_type }}</option>
                                                {% endfor %}
                                            </select>
                                            <button type="button" onclick="setInstruction('{{ selected_client }}'); return false;" class="btn">Uppdatera instruktion</button>
                                        </form>
                                    </div>
                                </div>

                                <div class="log-section">
                                    <div class="log-header">
                                        <h3>Loggar</h3>
                                        <div class="log-filter">
                                            <label for="sort-order">Sortera:</label>
                                            <select id="sort-order" onchange="changeSortOrder('{{ selected_client }}', this.value)">
                                                <option value="newest" {% if sort_order == 'newest' %}selected{% endif %}>Nyast först</option>
                                                <option value="oldest" {% if sort_order == 'oldest' %}selected{% endif %}>Äldst först</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="log-viewer" id="log-content">
                                        {{ log_content|safe }}
                                    </div>
                                </div>
                            </div>
                            {% else %}
                            <div class="no-selection">
                                <h2>Ingen klient vald</h2>
                                <p>Välj en klient från listan för att visa information och loggar.</p>
                            </div>
                            {% endif %}
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
        }.items():
            template_path = os.path.join(TEMPLATES_DIRECTORY, template_name)
            if not os.path.exists(template_path):
                with open(template_path, "w", encoding="utf-8") as f:
                    f.write(template_content)
                logging.info(f"Skapade mall: {template_name}")
        
        # Skapa CSS och JS-filer om de saknas
        if not os.path.exists(STATIC_DIRECTORY):
            os.makedirs(STATIC_DIRECTORY, exist_ok=True)
            logging.info(f"Skapade statisk katalog: {STATIC_DIRECTORY}")
            
        for static_file, static_content in {
            "style.css": """
            /* Grundläggande stilar */
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
                color: #333;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #ddd;
                margin-bottom: 20px;
            }
            
            h1, h2, h3 {
                margin-top: 0;
            }
            
            /* Login */
            .login-container {
                max-width: 400px;
                margin: 100px auto;
                padding: 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            label {
                display: block;
                margin-bottom: 5px;
            }
            
            input[type="text"],
            input[type="password"],
            select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .error {
                color: red;
                margin: 10px 0;
            }
            
            /* Knappar */
            .btn {
                display: inline-block;
                padding: 8px 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                font-size: 14px;
            }
            
            .btn:hover {
                background-color: #45a049;
            }
            
            .btn-logout {
                background-color: #f44336;
            }
            
            .btn-logout:hover {
                background-color: #d32f2f;
            }
            
            /* Dashboard widgets */
            .dashboard {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .widget {
                flex: 1;
                min-width: 200px;
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .widget-title {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .widget-value {
                font-size: 24px;
                font-weight: bold;
            }
            
            /* Huvudinnehåll */
            .main-content {
                display: flex;
                gap: 20px;
            }
            
            .sidebar {
                width: 300px;
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .content {
                flex: 1;
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            /* Klientlista */
            .client-list {
                max-height: 500px;
                overflow-y: auto;
            }
            
            .client-item {
                display: block;
                padding: 10px;
                margin-bottom: 5px;
                border-radius: 4px;
                text-decoration: none;
                color: #333;
                border-left: 4px solid transparent;
            }
            
            .client-item:hover {
                background-color: #f0f0f0;
            }
            
            .client-item.active {
                background-color: #e6f7ff;
                border-left-color: #1890ff;
            }
            
            .client-item.online {
                border-left-color: #52c41a;
            }
            
            .client-item.offline {
                border-left-color: #f5222d;
            }
            
            .client-name {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .client-info {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .client-status {
                font-size: 12px;
                display: inline-block;
                padding: 2px 6px;
                border-radius: 10px;
                background-color: #f0f0f0;
            }
            
            .client-item.online .client-status {
                background-color: #f6ffed;
                color: #52c41a;
            }
            
            .client-item.offline .client-status {
                background-color: #fff1f0;
                color: #f5222d;
            }
            
            .no-clients {
                color: #999;
                padding: 20px;
                text-align: center;
            }
            
            /* Klientinformation */
            .client-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .info-item {
                border: 1px solid #eee;
                padding: 10px;
                border-radius: 4px;
            }
            
            .info-label {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .info-value {
                font-weight: bold;
            }
            
            .status-online {
                color: #52c41a;
            }
            
            .status-offline {
                color: #f5222d;
            }
            
            /* Loggvisare */
            .log-section {
                margin-top: 20px;
            }
            
            .log-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .log-filter {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .log-viewer {
                background-color: #2c2c2c;
                color: #f0f0f0;
                padding: 15px;
                border-radius: 4px;
                font-family: monospace;
                white-space: pre-wrap;
                overflow-x: auto;
                height: 400px;
                overflow-y: auto;
            }
            
            /* Klientåtgärder */
            .client-actions {
                margin: 20px 0;
            }
            
            .action-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .instruction-form {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            /* Ingen val-meddelande */
            .no-selection {
                text-align: center;
                padding: 50px 0;
                color: #999;
            }
            """,
            "script.js": """
            // Function to ping a client
            function pingClient(clientId) {
                if (!clientId) return;
                
                fetch(`/api/ping_client/${clientId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert('Ping skickad till klienten');
                        // Uppdatera sidan för att visa den senaste pingstatus
                        window.location.reload();
                    } else {
                        alert('Fel vid ping av klienten: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Fel vid kommunikation med servern: ' + error);
                });
            }
            
            // Function to clear logs for a client
            function clearLogs(clientId) {
                if (!clientId || !confirm('Är du säker på att du vill rensa loggarna för denna klient?')) return;
                
                fetch(`/api/clear_logs/${clientId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert('Loggar rensade');
                        // Uppdatera loggvisaren
                        document.getElementById('log-content').innerHTML = '<span style="color:orange">Loggarna har rensats.</span>';
                    } else {
                        alert('Fel vid rensning av loggar: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Fel vid kommunikation med servern: ' + error);
                });
            }
            
            // Function to change the sort order of logs
            function changeSortOrder(clientId, sortOrder) {
                if (!clientId) return;
                
                // Uppdatera URL med ny sorteringsordning
                const url = new URL(window.location.href);
                url.searchParams.set('sort', sortOrder);
                
                // Hämta bara logginnehåll
                fetch(`${url.pathname}?client=${clientId}&sort=${sortOrder}&partial=1`)
                .then(response => response.text())
                .then(html => {
                    document.getElementById('log-content').innerHTML = html;
                })
                .catch(error => {
                    alert('Fel vid hämtning av sorterade loggar: ' + error);
                });
            }
            
            // Function to set instruction for a client
            function setInstruction(clientId) {
                if (!clientId) return;
                
                const instruction = document.getElementById('instruction-select').value;
                
                fetch(`/api/set_instruction/${clientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ instruction: instruction })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert(`Instruktion satt till: ${instruction}`);
                        // Uppdatera sidan för att visa den nya instruktionen
                        window.location.reload();
                    } else {
                        alert('Fel vid inställning av instruktion: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Fel vid kommunikation med servern: ' + error);
                });
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Viewer page loaded');
            });
            """
        }.items():
            static_path = os.path.join(STATIC_DIRECTORY, static_file)
            if not os.path.exists(static_path):
                with open(static_path, "w", encoding="utf-8") as f:
                    f.write(static_content)
                logging.info(f"Skapade statisk fil: {static_file}")
                
        logging.info("Statiska filer installerade")
    except Exception as e:
        logging.error(f"Fel vid installation av statiska filer: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")

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
        
        return jsonify({
            "status": "success", 
            "message": f"Klient {client_id} registrerad", 
            "instruction": instruction_name,
            "code": instruction_code
        })
            
    except Exception as e:
        logging.error(f"Fel vid registrering av klient: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({
            "status": "error", 
            "message": f"Registreringsfel: {str(e)}"
        }), 500

@app.route("/api/heartbeat/<client_id>", methods=["POST"])
def api_heartbeat(client_id):
    """API för klientheartbeat."""
    ip_address = request.remote_addr
    logging.debug(f"Heartbeat från klient {client_id} på IP {ip_address}")
    
    try:
        # Kontrollera om klienten finns, annars returnera fel
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        if client_id not in client_index:
            logging.warning(f"Heartbeat för okänd klient {client_id}")
            return jsonify({"status": "error", "message": "Okänd klient"}), 404
        
        # Uppdatera senaste aktivitet
        client_index[client_id]["last_activity"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        client_index[client_id]["ip"] = ip_address
        
        # Uppdatera andra fält om tillhandahållet
        additional_data = {}
        if request.is_json:
            additional_data = request.get_json()
        elif request.form:
            additional_data = request.form.to_dict()
            
        for key, value in additional_data.items():
            if key not in ["id", "last_activity", "first_seen"]:
                client_index[client_id][key] = value
                
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
            
        logging.debug(f"Heartbeat uppdaterad för klient {client_id}")
        
        # Hämta aktiv instruktion att skicka tillbaka
        instruction_name = client_index[client_id].get

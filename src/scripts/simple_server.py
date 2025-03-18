
#!/usr/bin/python3
import os
import sys
import json
import logging
from flask import Flask, request, jsonify, send_file

# Konfigurera baskataloger
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
LOG_DIR = os.path.join(BASE_DIR, "data", "logs")

# Skapa kataloger om de inte finns
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Konfigurera loggning
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "simple_server.log")),
        logging.StreamHandler(sys.stdout)
    ]
)

# Skapa Flask-app
app = Flask(__name__, static_url_path='/static', static_folder=STATIC_DIR)

# Hantera CORS om modulen finns
try:
    from flask_cors import CORS
    CORS(app)
    logging.info("CORS support enabled")
except ImportError:
    logging.warning("CORS support disabled - flask_cors not found")

# Grundläggande rutter
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    logging.info(f"Serving path: {path}")
    if path == "" or path == "/" or not os.path.exists(os.path.join(STATIC_DIR, path)):
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        else:
            return "NEEA Server Running - Index file not found", 200
    return send_file(os.path.join(STATIC_DIR, path))

@app.route('/api/status')
def status():
    return jsonify({
        "status": "running",
        "version": "1.0.0",
        "static_files": os.listdir(STATIC_DIR) if os.path.exists(STATIC_DIR) else []
    })

# Starta servern om den körs direkt
if __name__ == "__main__":
    print(f"Starting simple server on port 8000")
    print(f"Base directory: {BASE_DIR}")
    print(f"Static directory: {STATIC_DIR}")
    print(f"Log directory: {LOG_DIR}")
    
    try:
        app.run(host='0.0.0.0', port=8000, debug=True)
    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        sys.exit(1)

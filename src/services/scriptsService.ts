
// Mock scripts data to use when API is not available
export interface ScriptsData {
  [key: string]: string;
}

// Sample scripts data
const mockScriptsData: ScriptsData = {
  "instructions.py": `# Python script for client instructions
import os
import json
import logging

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.FileHandler("client.log"), logging.StreamHandler()]
    )
    return logging.getLogger("client")

def get_instructions():
    """Fetch instructions from the server."""
    try:
        # Implementation for fetching instructions
        return {
            "collect_logs": True,
            "take_screenshots": False,
            "reporting_interval": 60,
            "custom_scripts": ["system_info.py", "log_collector.py"]
        }
    except Exception as e:
        logging.error(f"Failed to get instructions: {e}")
        return {}`,
  
  "server.py": `# Server implementation for the LogKeeper Guardian
from flask import Flask, request, jsonify
import os
import json
import logging
import time
from pathlib import Path

app = Flask(__name__)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("server.log"), logging.StreamHandler()]
)
logger = logging.getLogger("server")

# Data directories
DATA_DIR = Path("./data")
CLIENTS_DIR = DATA_DIR / "clients"
LOGS_DIR = DATA_DIR / "logs"
SCREENSHOTS_DIR = DATA_DIR / "screenshots"
CLIENT_INDEX = DATA_DIR / "client_index.json"

# Create necessary directories
for directory in [DATA_DIR, CLIENTS_DIR, LOGS_DIR, SCREENSHOTS_DIR]:
    directory.mkdir(exist_ok=True, parents=True)

# Initialize client index if it doesn't exist
if not CLIENT_INDEX.exists():
    with open(CLIENT_INDEX, 'w') as f:
        json.dump({}, f)

def get_client_index():
    with open(CLIENT_INDEX, 'r') as f:
        return json.load(f)

def update_client_index(client_id, data):
    index = get_client_index()
    if client_id not in index:
        index[client_id] = {}
    
    # Update with new data
    index[client_id].update(data)
    
    # Add last seen timestamp
    index[client_id]['last_seen'] = time.time()
    
    with open(CLIENT_INDEX, 'w') as f:
        json.dump(index, f, indent=2)

@app.route('/api/register', methods=['POST'])
def register_client():
    client_data = request.json
    client_id = client_data.get('client_id')
    
    if not client_id:
        return jsonify({"error": "No client_id provided"}), 400
    
    # Create client directory if it doesn't exist
    client_dir = CLIENTS_DIR / client_id
    client_dir.mkdir(exist_ok=True)
    
    # Update client index
    update_client_index(client_id, {
        'hostname': client_data.get('hostname', 'Unknown'),
        'ip_address': client_data.get('ip_address', 'Unknown'),
        'os': client_data.get('os', 'Unknown'),
        'registered_at': time.time()
    })
    
    logger.info(f"Client registered: {client_id}")
    return jsonify({"status": "registered"})

@app.route('/api/instructions', methods=['GET'])
def get_instructions():
    # Default instructions all clients should follow
    instructions = {
        "collect_logs": True,
        "take_screenshots": True,
        "reporting_interval": 60,
        "custom_scripts": []
    }
    return jsonify(instructions)

@app.route('/api/upload/logs', methods=['POST'])
def upload_logs():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    client_id = request.form.get('client_id')
    
    if not client_id:
        return jsonify({"error": "No client_id provided"}), 400
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Save the log file
    log_dir = LOGS_DIR / client_id
    log_dir.mkdir(exist_ok=True)
    
    file_path = log_dir / file.filename
    file.save(file_path)
    
    # Update client index
    update_client_index(client_id, {
        'last_log_upload': time.time(),
        'log_count': len(list(log_dir.glob('*')))
    })
    
    logger.info(f"Log uploaded for client {client_id}: {file.filename}")
    return jsonify({"status": "uploaded"})

@app.route('/api/upload/screenshot', methods=['POST'])
def upload_screenshot():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    client_id = request.form.get('client_id')
    
    if not client_id:
        return jsonify({"error": "No client_id provided"}), 400
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Save the screenshot
    screenshot_dir = SCREENSHOTS_DIR / client_id
    screenshot_dir.mkdir(exist_ok=True)
    
    file_path = screenshot_dir / file.filename
    file.save(file_path)
    
    # Update client index
    update_client_index(client_id, {
        'last_screenshot': time.time(),
        'screenshot_count': len(list(screenshot_dir.glob('*')))
    })
    
    logger.info(f"Screenshot uploaded for client {client_id}: {file.filename}")
    return jsonify({"status": "uploaded"})

@app.route('/api/clients', methods=['GET'])
def get_clients():
    return jsonify(get_client_index())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)`,
  
  "runserver.py": `# Script to run the LogKeeper Guardian server
import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("setup.log"), logging.StreamHandler()]
)
logger = logging.getLogger("setup")

def check_python_version():
    """Check if Python version is 3.7 or higher."""
    if sys.version_info < (3, 7):
        logger.error("Python 3.7 or higher is required.")
        sys.exit(1)
    logger.info(f"Python version: {sys.version}")

def check_dependencies():
    """Check if required packages are installed."""
    required_packages = ['flask', 'requests', 'pillow']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"Package {package} is installed.")
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.warning(f"Missing packages: {', '.join(missing_packages)}")
        install = input("Do you want to install missing packages? (y/n): ")
        if install.lower() == 'y':
            for package in missing_packages:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                logger.info(f"Installed {package}")
        else:
            logger.error("Cannot continue without required packages.")
            sys.exit(1)

def setup_environment():
    """Create necessary directories for the server."""
    directories = ["data", "data/clients", "data/logs", "data/screenshots"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Created directory: {directory}")

def run_server():
    """Run the Flask server."""
    logger.info("Starting LogKeeper Guardian server...")
    try:
        import server
        server.app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Initializing LogKeeper Guardian server...")
    check_python_version()
    check_dependencies()
    setup_environment()
    run_server()`,
  
  "system_info.py": `# Script to collect system information
import platform
import os
import socket
import json
import logging
import psutil
from datetime import datetime

logger = logging.getLogger("system_info")

def get_system_info():
    """Collect detailed system information."""
    info = {
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "ram": f"{round(psutil.virtual_memory().total / (1024.0 **3))} GB",
        "python_version": platform.python_version(),
        "timestamp": datetime.now().isoformat()
    }
    
    # Get disk information
    disks = []
    for partition in psutil.disk_partitions(all=False):
        if os.name == 'nt':
            if 'cdrom' in partition.opts or partition.fstype == '':
                continue
        usage = psutil.disk_usage(partition.mountpoint)
        disk_info = {
            "device": partition.device,
            "mountpoint": partition.mountpoint,
            "fstype": partition.fstype,
            "total_size": f"{usage.total / (1024.0 ** 3):.2f} GB",
            "used": f"{usage.used / (1024.0 ** 3):.2f} GB",
            "free": f"{usage.free / (1024.0 ** 3):.2f} GB",
            "percent": f"{usage.percent}%"
        }
        disks.append(disk_info)
    
    info["disks"] = disks
    
    # Get network information
    network_info = []
    for interface_name, interface_addresses in psutil.net_if_addrs().items():
        for address in interface_addresses:
            if str(address.family) == 'AddressFamily.AF_INET':
                network_info.append({
                    "interface": interface_name,
                    "ip": address.address,
                    "netmask": address.netmask,
                    "broadcast": address.broadcast
                })
    
    info["network"] = network_info
    
    return info

def save_system_info(output_file="system_info.json"):
    """Save system information to a file."""
    try:
        info = get_system_info()
        with open(output_file, 'w') as f:
            json.dump(info, f, indent=2)
        logger.info(f"System information saved to {output_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to save system information: {e}")
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    save_system_info()`,
  
  "log_collector.py": `# Script to collect and analyze logs
import os
import re
import glob
import logging
import gzip
import json
from datetime import datetime, timedelta

logger = logging.getLogger("log_collector")

# Common log directories by OS
LOG_DIRS = {
    "Windows": ["C:\\Windows\\Logs", "C:\\Windows\\System32\\winevt\\Logs"],
    "Linux": ["/var/log", "/var/log/syslog", "/var/log/auth.log"],
    "Darwin": ["/var/log", "/Library/Logs"]
}

# Common log patterns to search for
PATTERNS = {
    "error": re.compile(r'error|exception|fail|critical', re.IGNORECASE),
    "warning": re.compile(r'warning|warn', re.IGNORECASE),
    "authentication": re.compile(r'login|logon|auth|password', re.IGNORECASE),
    "network": re.compile(r'network|connection|connect|disconnect|ip|tcp|udp', re.IGNORECASE)
}

def get_os_type():
    """Determine the operating system type."""
    import platform
    return platform.system()

def find_log_files(days=1):
    """Find log files modified in the last 'days' days."""
    os_type = get_os_type()
    log_files = []
    
    # Get directories for the current OS
    directories = LOG_DIRS.get(os_type, [])
    
    # Calculate the cutoff time
    cutoff_time = datetime.now() - timedelta(days=days)
    
    for directory in directories:
        if not os.path.exists(directory):
            continue
            
        # Search for log files (including compressed ones)
        for extension in ["*.log", "*.log.*", "*.gz"]:
            pattern = os.path.join(directory, "**", extension)
            files = glob.glob(pattern, recursive=True)
            
            for file in files:
                try:
                    mtime = datetime.fromtimestamp(os.path.getmtime(file))
                    if mtime >= cutoff_time:
                        log_files.append(file)
                except Exception as e:
                    logger.warning(f"Error accessing file {file}: {e}")
    
    return log_files

def analyze_log_file(file_path):
    """Analyze a log file for patterns of interest."""
    results = {pattern: [] for pattern in PATTERNS}
    
    try:
        # Check if file is gzipped
        if file_path.endswith('.gz'):
            opener = gzip.open
            mode = 'rt'  # Text mode for gzip
        else:
            opener = open
            mode = 'r'
            
        with opener(file_path, mode, encoding='utf-8', errors='ignore') as f:
            for line_number, line in enumerate(f, 1):
                for pattern_name, pattern_regex in PATTERNS.items():
                    if pattern_regex.search(line):
                        # Limit the number of matches per pattern
                        if len(results[pattern_name]) < 10:
                            results[pattern_name].append({
                                "line": line.strip(),
                                "line_number": line_number
                            })
    except Exception as e:
        logger.error(f"Error analyzing {file_path}: {e}")
    
    return results

def collect_logs(output_file="log_analysis.json", days=1):
    """Collect and analyze logs, saving results to a file."""
    log_files = find_log_files(days)
    logger.info(f"Found {len(log_files)} log files from the last {days} days")
    
    results = {}
    for file_path in log_files:
        logger.info(f"Analyzing {file_path}")
        analysis = analyze_log_file(file_path)
        
        # Only include files with matches
        has_matches = any(len(matches) > 0 for matches in analysis.values())
        if has_matches:
            results[file_path] = analysis
    
    # Save results
    try:
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Log analysis saved to {output_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to save log analysis: {e}")
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    collect_logs()`
};

/**
 * Get scripts data
 * @returns {Promise<ScriptsData>} The scripts data
 */
export const getScripts = async (): Promise<ScriptsData> => {
  try {
    const response = await fetch('/api/scripts');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("API returned non-JSON response, using mock data instead");
      return mockScriptsData;
    }
  } catch (error) {
    console.warn("Failed to fetch from API, using mock data instead:", error);
    return mockScriptsData;
  }
};

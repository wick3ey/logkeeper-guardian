
#!/usr/bin/python
import subprocess
import sys
import os

def main():
    """
    Startar en server.py med korrekt Python-miljö och beroenden.
    """
    print("Startar Neea Server...")
    
    # Säkerställ att nödvändiga kataloger finns
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Kör server.py med Python
    try:
        subprocess.run([sys.executable, os.path.join(script_dir, "server.py")])
    except Exception as e:
        print(f"Fel vid start av server: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

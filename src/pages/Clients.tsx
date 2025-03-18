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
import { toast } from "sonner";

const fetchClients = async () => {
  try {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    return await response.json();
  } catch (error) {
    toast.error("Kunde inte hämta klientdata");
    throw error;
  }
};

export default function Clients() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    placeholderData: { clients: [] }
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
    console.error("Error loading clients:", error);
    return <div className="p-6">Fel vid hämtning av klientdata</div>;
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

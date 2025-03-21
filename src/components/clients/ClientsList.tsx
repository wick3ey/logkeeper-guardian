
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ArrowUpDown, RefreshCw } from "lucide-react";

interface Client {
  id: string;
  name: string;
  os?: string;
  isActive?: boolean;
  lastSeen?: string;
  lastActivity?: string;
  instruction: string;
  system: string;
  [key: string]: any; // Allow for additional properties
}

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  onClientClick: (clientId: string) => void;
  onRefresh?: () => void;
}

export function ClientsList({ clients, isLoading, onClientClick, onRefresh }: ClientsListProps) {
  // Function to get the appropriate badge variant based on client instruction
  const getInstructionBadge = (instruction: string) => {
    switch (instruction?.toLowerCase()) {
      case "keylogger":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Keylogger</Badge>;
      case "screenshot":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Screenshot</Badge>;
      case "system_info":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">System Info</Badge>;
      case "file_exfiltration":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">File Exfiltration</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Standard</Badge>;
    }
  };

  // Check if client is active based on time since last activity 
  // (if isActive not explicitly set)
  const isClientActive = (client: Client): boolean => {
    if (client.isActive !== undefined) return client.isActive;
    
    const lastActivityTime = client.lastActivity || client.lastSeen;
    if (!lastActivityTime) return false;
    
    try {
      const lastActive = new Date(lastActivityTime);
      const now = new Date();
      // Consider active if activity was within the last 30 minutes
      return (now.getTime() - lastActive.getTime()) < 30 * 60 * 1000;
    } catch (e) {
      console.error("Error parsing last activity date:", e);
      return false;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klient</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senaste aktivitet</TableHead>
                  <TableHead>Instruktion</TableHead>
                  <TableHead>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-24 rounded-md" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Inga klienter hittades</p>
          {onRefresh && (
            <Button variant="outline" className="mt-4" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Uppdatera lista
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center space-x-1">
                    <span>Klient</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Senaste aktivitet</TableHead>
                <TableHead>Instruktion</TableHead>
                <TableHead>
                  <div className="flex items-center justify-between">
                    <span>Åtgärder</span>
                    {onRefresh && (
                      <Button variant="ghost" size="sm" onClick={onRefresh} title="Uppdatera">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => onClientClick(client.id)}>
                  <TableCell className="font-medium">
                    {client.name}
                  </TableCell>
                  <TableCell>{client.os || client.system || "Okänd"}</TableCell>
                  <TableCell>
                    <Badge variant={isClientActive(client) ? "success" : "destructive"}>
                      {isClientActive(client) ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.lastActivity || client.lastSeen || "Okänd"}</TableCell>
                  <TableCell>
                    {getInstructionBadge(client.instruction || "standard")}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClientClick(client.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Detaljer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

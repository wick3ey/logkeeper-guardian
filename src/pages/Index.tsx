
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

// Fallback dashboard data in case of API failure
const fallbackData = {
  totalClients: 0,
  activeClients: 0,
  storageUsed: "0 GB",
  recentActivities: [],
  activityData: [
    { name: "00:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "04:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "08:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "12:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "16:00", keystrokes: 0, screenshots: 0, clipboard: 0 },
    { name: "20:00", keystrokes: 0, screenshots: 0, clipboard: 0 }
  ]
};

const Index = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['indexDashboardData'],
    queryFn: async () => {
      console.log("Fetching dashboard data from API");
      
      try {
        // Get clients from the server API
        const clients = await getClients();
        
        if (!clients || clients.length === 0) {
          console.log("No clients found, using fallback data");
          return fallbackData;
        }
        
        // Calculate active clients (active within last 30 minutes)
        const activeClients = clients.filter(client => {
          if (!client.lastActivity) return false;
          const lastActive = new Date(client.lastActivity);
          return (new Date().getTime() - lastActive.getTime()) < 30 * 60 * 1000;
        }).length;
        
        console.log(`Found ${clients.length} total clients, ${activeClients} active`);
        
        // Generate activity data based on real client data
        // This should be fetched from a real API endpoint in production
        const activityData = generateActivityData();
        
        // Calculate storage used based on client count
        // In production, this should come from a real API endpoint
        const storageSize = (clients.length * 0.1).toFixed(1);
        
        // Create recent activities from client data
        const recentActivities = clients.slice(0, 3).map((client, index) => ({
          id: index + 1,
          client: client.name,
          type: ["keystrokes", "screenshot", "clipboard"][index % 3],
          timestamp: client.lastActivity || new Date().toISOString()
        }));
        
        console.log("Dashboard data generated successfully");
        
        return {
          totalClients: clients.length,
          activeClients,
          storageUsed: `${storageSize} GB`,
          recentActivities,
          activityData
        };
      } catch (error) {
        console.error("Error generating dashboard data:", error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000 // 1 minute
  });

  // Generate activity data for the chart
  const generateActivityData = () => {
    const hours = [0, 4, 8, 12, 16, 20];
    return hours.map(hour => {
      const hourStr = hour.toString().padStart(2, '0') + ":00";
      // Generate some random data based on the hour
      // In a real implementation, you would fetch this from the server
      const activityLevel = hour >= 8 && hour <= 16 ? 
        Math.floor(Math.random() * 50) + 50 : 
        Math.floor(Math.random() * 25);
        
      return {
        name: hourStr,
        keystrokes: activityLevel,
        screenshots: Math.floor(activityLevel / 10),
        clipboard: Math.floor(activityLevel / 12)
      };
    });
  };

  if (error) {
    console.error("Error fetching dashboard data:", error);
    toast.error("Kunde inte hämta dashboard-data");
  }

  // Use data with fallback to empty values if API fails
  const dashboardData = data || fallbackData;

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

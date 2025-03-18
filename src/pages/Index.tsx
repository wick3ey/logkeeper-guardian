
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ClientCountWidget } from "@/components/dashboard/ClientCountWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { StorageWidget } from "@/components/dashboard/StorageWidget";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  // Mock data for development purposes
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      // In a real app, this would be an API call
      return {
        totalClients: 8,
        activeClients: 5,
        storageUsed: "32.5 MB",
        recentActivities: [
          { id: 1, client: "john_laptop", type: "keystrokes", timestamp: "2023-03-21 14:35:22" },
          { id: 2, client: "emma_desktop", type: "screenshot", timestamp: "2023-03-21 14:30:15" },
          { id: 3, client: "david_pc", type: "clipboard", timestamp: "2023-03-21 14:28:10" }
        ],
        activityData: [
          { name: "00:00", keystrokes: 20, screenshots: 5, clipboard: 8 },
          { name: "04:00", keystrokes: 0, screenshots: 5, clipboard: 0 },
          { name: "08:00", keystrokes: 120, screenshots: 15, clipboard: 30 },
          { name: "12:00", keystrokes: 200, screenshots: 20, clipboard: 45 },
          { name: "16:00", keystrokes: 180, screenshots: 25, clipboard: 38 },
          { name: "20:00", keystrokes: 100, screenshots: 15, clipboard: 25 }
        ]
      };
    },
    placeholderData: {
      totalClients: 0,
      activeClients: 0,
      storageUsed: "0 B",
      recentActivities: [],
      activityData: []
    }
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 pb-16">
        <DashboardHeader />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ClientCountWidget 
            isLoading={isLoading} 
            totalClients={data.totalClients} 
            activeClients={data.activeClients} 
          />
          <StorageWidget 
            isLoading={isLoading} 
            storageUsed={data.storageUsed} 
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityChart data={data.activityData} />
          <RecentActivityWidget 
            activities={data.recentActivities} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;

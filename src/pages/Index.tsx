
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ClientCountWidget } from "@/components/dashboard/ClientCountWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { StorageWidget } from "@/components/dashboard/StorageWidget";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Index = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Server responded with an error');
        }
        return await response.json();
      } catch (err) {
        toast.error("Kunde inte hämta dashboard-data");
        throw err;
      }
    },
    placeholderData: {
      totalClients: 0,
      activeClients: 0,
      storageUsed: "0 B",
      recentActivities: [],
      activityData: []
    }
  });

  if (error) {
    console.error("Error fetching dashboard data:", error);
  }

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

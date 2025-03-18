
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ClientCountWidget } from "@/components/dashboard/ClientCountWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { StorageWidget } from "@/components/dashboard/StorageWidget";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

const Index = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 pb-16">
        <DashboardHeader />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ClientCountWidget />
          <StorageWidget />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityChart />
          <RecentActivityWidget />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;

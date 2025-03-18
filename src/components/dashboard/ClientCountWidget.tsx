
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor } from "lucide-react";

interface ClientCountWidgetProps {
  isLoading: boolean;
  totalClients: number;
  activeClients: number;
}

export function ClientCountWidget({ isLoading, totalClients, activeClients }: ClientCountWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Aktiva klienter</CardTitle>
        <Monitor className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <div className="flex items-baseline space-x-1">
            <div className="text-2xl font-bold">{activeClients}</div>
            <div className="text-lg text-muted-foreground">/{totalClients}</div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {isLoading ? (
            <Skeleton className="h-3 w-32" />
          ) : (
            `${Math.round((activeClients / (totalClients || 1)) * 100)}% anslutna`
          )}
        </p>
      </CardContent>
    </Card>
  );
}

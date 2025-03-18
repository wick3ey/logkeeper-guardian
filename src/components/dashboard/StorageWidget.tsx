
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "lucide-react";

interface StorageWidgetProps {
  isLoading: boolean;
  storageUsed: string;
}

export function StorageWidget({ isLoading, storageUsed }: StorageWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Lagringsutrymme</CardTitle>
        <Database className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <div className="text-2xl font-bold">{storageUsed}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">Använt lagringsutrymme</p>
      </CardContent>
    </Card>
  );
}


import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  id: number;
  client: string;
  type: string;
  timestamp: string;
}

interface RecentActivityWidgetProps {
  activities: Activity[];
  isLoading: boolean;
}

export function RecentActivityWidget({ activities, isLoading }: RecentActivityWidgetProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "keystrokes":
        return <div className="bg-blue-100 text-blue-700 rounded-full p-1.5 dark:bg-blue-900 dark:text-blue-200">⌨️</div>;
      case "screenshot":
        return <div className="bg-green-100 text-green-700 rounded-full p-1.5 dark:bg-green-900 dark:text-green-200">📷</div>;
      case "clipboard":
        return <div className="bg-yellow-100 text-yellow-700 rounded-full p-1.5 dark:bg-yellow-900 dark:text-yellow-200">📋</div>;
      default:
        return <div className="bg-gray-100 text-gray-700 rounded-full p-1.5 dark:bg-gray-800 dark:text-gray-200">📄</div>;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case "keystrokes":
        return `${activity.client} skrev text`;
      case "screenshot":
        return `Skärmdump tagen från ${activity.client}`;
      case "clipboard":
        return `${activity.client} kopierade till urklipp`;
      default:
        return `Aktivitet på ${activity.client}`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[280px] overflow-y-auto">
      {activities.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Ingen aktivitet än</p>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            {getActivityIcon(activity.type)}
            <div>
              <p className="text-sm font-medium">{getActivityText(activity)}</p>
              <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

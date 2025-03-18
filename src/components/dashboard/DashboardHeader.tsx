
import React from "react";

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Översikt över klienter, loggar och systemstatus
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {new Date().toLocaleString('sv-SE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );
}

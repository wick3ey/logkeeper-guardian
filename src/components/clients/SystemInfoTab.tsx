import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemInfoTabProps {
  client: any;
}

export function SystemInfoTab({ client }: SystemInfoTabProps) {
  // Fetch detailed system info for this client
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', client.id, 'system-info'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${client.id}/system-info`);
      if (!response.ok) {
        throw new Error('Failed to fetch system info');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Systeminformation</CardTitle>
            <CardDescription>
              Hämtar detaljerad information...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Systeminformation</CardTitle>
            <CardDescription className="text-red-500">
              Det gick inte att hämta systeminformation
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const systemInfo = data || {};
  
  // Calculate RAM usage percentage
  const ramUsagePercent = systemInfo.ramTotal && systemInfo.ramAvailable
    ? Math.round(((parseFloat(systemInfo.ramTotal) - parseFloat(systemInfo.ramAvailable)) / parseFloat(systemInfo.ramTotal)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Systeminformation</CardTitle>
          <CardDescription>
            Detaljerad information om klientens system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Operativsystem</h3>
              <p>{systemInfo.os} {systemInfo.osVersion}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Datornamn</h3>
              <p>{systemInfo.system}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Användare</h3>
              <p>{systemInfo.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">MAC-adress</h3>
              <p>{systemInfo.mac}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Tidszon</h3>
              <p>{systemInfo.timezone}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Lokal tid</h3>
              <p>{systemInfo.localTime}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">CPU</h3>
              <p>{systemInfo.cpu}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">CPU-kärnor</h3>
              <p>{systemInfo.cpuCores}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">RAM-minne</h3>
            <div className="flex items-center gap-4">
              <Progress value={ramUsagePercent} className="h-2 flex-1" />
              <span className="text-sm w-32 text-right">
                {systemInfo.ramAvailable} / {systemInfo.ramTotal}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="disks">
        <TabsList>
          <TabsTrigger value="disks">Diskar</TabsTrigger>
          <TabsTrigger value="network">Nätverk</TabsTrigger>
          <TabsTrigger value="wifi">Wi-Fi</TabsTrigger>
          <TabsTrigger value="programs">Program</TabsTrigger>
          <TabsTrigger value="email">E-post</TabsTrigger>
        </TabsList>
        
        {/* Disks Tab */}
        <TabsContent value="disks">
          <Card>
            <CardHeader>
              <CardTitle>Diskinformation</CardTitle>
              <CardDescription>
                Lagringsutrymme och partitioner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enhet</TableHead>
                    <TableHead>Monteringspunkt</TableHead>
                    <TableHead>Filsystem</TableHead>
                    <TableHead>Total storlek</TableHead>
                    <TableHead>Använt</TableHead>
                    <TableHead>Ledigt</TableHead>
                    <TableHead>Användning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemInfo.disks.map((disk, index) => (
                    <TableRow key={index}>
                      <TableCell>{disk.device}</TableCell>
                      <TableCell>{disk.mountpoint}</TableCell>
                      <TableCell>{disk.fstype}</TableCell>
                      <TableCell>{disk.total}</TableCell>
                      <TableCell>{disk.used}</TableCell>
                      <TableCell>{disk.free}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={disk.percent} className="h-2 w-24" />
                          <span className="text-sm">{disk.percent}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Network Tab */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Nätverksinformation</CardTitle>
              <CardDescription>
                IP-adresser och nätverksgränssnitt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gränssnitt</TableHead>
                    <TableHead>IP-adress</TableHead>
                    <TableHead>Nätmask</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemInfo.network.map((net, index) => (
                    <TableRow key={index}>
                      <TableCell>{net.interface}</TableCell>
                      <TableCell>{net.ip}</TableCell>
                      <TableCell>{net.netmask}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Publik IP-adress</h4>
                <p>{systemInfo.publicIp}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* WiFi Tab */}
        <TabsContent value="wifi">
          <Card>
            <CardHeader>
              <CardTitle>Wi-Fi-nätverk</CardTitle>
              <CardDescription>
                Tillgängliga trådlösa nätverk nära klienten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SSID</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Kvalitet</TableHead>
                    <TableHead>Kryptering</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemInfo.wifi.map((wifi, index) => (
                    <TableRow key={index}>
                      <TableCell>{wifi.ssid}</TableCell>
                      <TableCell>{wifi.signal}</TableCell>
                      <TableCell>{wifi.quality}</TableCell>
                      <TableCell>
                        {wifi.encrypted ? wifi.encryption : "Ingen"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Programs Tab */}
        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>Installerade program</CardTitle>
              <CardDescription>
                Mjukvara installerad på klienten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemInfo.programs.map((program, index) => (
                    <TableRow key={index}>
                      <TableCell>{program.name}</TableCell>
                      <TableCell>{program.version}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>E-postfiler</CardTitle>
              <CardDescription>
                Outlook och andra e-postfiler på systemet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemInfo.emailFiles.length === 0 ? (
                <p className="text-muted-foreground">Inga e-postfiler hittades</p>
              ) : (
                <ul className="list-disc list-inside space-y-2">
                  {systemInfo.emailFiles.map((file, index) => (
                    <li key={index} className="text-sm">{file}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

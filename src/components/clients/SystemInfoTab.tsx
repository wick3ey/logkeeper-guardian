
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface SystemInfoTabProps {
  client: any;
}

export function SystemInfoTab({ client }: SystemInfoTabProps) {
  // Mock data for development - in a real implementation, this would come from the client object
  const mockData = {
    cpu: client.cpu,
    cpuCores: client.cpuCores,
    ramTotal: client.ramTotal,
    ramAvailable: client.ramAvailable,
    timezone: client.timezone,
    localTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    mac: client.mac,
    disks: [
      { device: "C:", mountpoint: "C:", fstype: "NTFS", total: "512 GB", used: "256 GB", free: "256 GB", percent: 50 },
      { device: "D:", mountpoint: "D:", fstype: "NTFS", total: "1 TB", used: "800 GB", free: "200 GB", percent: 80 }
    ],
    network: [
      { interface: "Wi-Fi", ip: client.ip, netmask: "255.255.255.0" },
      { interface: "Ethernet", ip: "192.168.1.150", netmask: "255.255.255.0" }
    ],
    wifi: [
      { ssid: "HomeNetwork", signal: "-65 dBm", quality: "70%", encrypted: true, encryption: "WPA2" },
      { ssid: "OfficeWiFi", signal: "-75 dBm", quality: "50%", encrypted: true, encryption: "WPA2" },
      { ssid: "GuestNetwork", signal: "-80 dBm", quality: "30%", encrypted: false, encryption: null }
    ],
    programs: [
      { name: "Google Chrome", version: "105.0.5195.127" },
      { name: "Microsoft Office", version: "16.0.15427.20148" },
      { name: "Adobe Acrobat Reader DC", version: "22.002.20191" },
      { name: "Mozilla Firefox", version: "104.0.2" },
      { name: "7-Zip", version: "21.07" },
      { name: "VLC media player", version: "3.0.17.4" },
      { name: "Notepad++", version: "8.4.6" },
      { name: "Java 8 Update 341", version: "8.0.3410.10" }
    ],
    emailFiles: [
      "C:\\Users\\John\\AppData\\Local\\Microsoft\\Outlook\\john.smith@example.com.ost",
      "C:\\Users\\John\\AppData\\Local\\Microsoft\\Outlook\\Archive.pst"
    ]
  };

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
              <p>{client.os} {client.osVersion}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Datornamn</h3>
              <p>{client.system}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Användare</h3>
              <p>{client.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">MAC-adress</h3>
              <p>{mockData.mac}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Tidszon</h3>
              <p>{mockData.timezone}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Lokal tid</h3>
              <p>{mockData.localTime}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">CPU</h3>
              <p>{mockData.cpu}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">CPU-kärnor</h3>
              <p>{mockData.cpuCores}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">RAM-minne</h3>
            <div className="flex items-center gap-4">
              <Progress value={50} className="h-2 flex-1" />
              <span className="text-sm w-32 text-right">
                {mockData.ramAvailable} / {mockData.ramTotal}
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
                  {mockData.disks.map((disk, index) => (
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
                  {mockData.network.map((net, index) => (
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
                <p>{client.publicIp}</p>
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
                  {mockData.wifi.map((wifi, index) => (
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
                  {mockData.programs.map((program, index) => (
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
              {mockData.emailFiles.length === 0 ? (
                <p className="text-muted-foreground">Inga e-postfiler hittades</p>
              ) : (
                <ul className="list-disc list-inside space-y-2">
                  {mockData.emailFiles.map((file, index) => (
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

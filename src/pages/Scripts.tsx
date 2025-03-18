
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CodePreview } from "@/components/scripts/CodePreview";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Define a type for script data
interface ScriptsData {
  [key: string]: string;
}

const fetchScripts = async (): Promise<ScriptsData> => {
  console.log("Fetching scripts from API...");
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Fetched scripts:", data);
    return data;
  } catch (error) {
    console.error("Error fetching scripts:", error);
    throw error; // Rethrow to be handled by React Query
  }
};

export default function Scripts() {
  const [activeScript, setActiveScript] = useState<string>("");
  const [isAddScriptOpen, setIsAddScriptOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptContent, setNewScriptContent] = useState("");
  const queryClient = useQueryClient();

  const { data: scripts, isLoading, isError, error } = useQuery({
    queryKey: ['scripts'],
    queryFn: fetchScripts,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addScriptMutation = useMutation({
    mutationFn: async (scriptData: { name: string; content: string }) => {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scriptData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add script');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] });
      toast.success("Script tillagt");
      setIsAddScriptOpen(false);
      setNewScriptName("");
      setNewScriptContent("");
    },
    onError: (error: Error) => {
      console.error("Error adding script:", error);
      toast.error(`Kunde inte lägga till script: ${error.message}`);
    },
  });

  const handleAddScript = () => {
    if (!newScriptName.trim() || !newScriptContent.trim()) {
      toast.error("Både namn och innehåll krävs");
      return;
    }
    
    addScriptMutation.mutate({
      name: newScriptName,
      content: newScriptContent
    });
  };

  // Get script types (keys) from the scripts object
  const scriptTypes = scripts ? Object.keys(scripts) : [];
  
  // Set active script to first one if none selected and scripts are available
  React.useEffect(() => {
    if (!activeScript && scriptTypes.length > 0 && !isLoading) {
      setActiveScript(scriptTypes[0]);
    }
  }, [activeScript, scriptTypes, isLoading]);

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Scripts</h2>
        <Button onClick={() => setIsAddScriptOpen(true)}>Lägg till script</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tillgängliga Scripts</CardTitle>
            <CardDescription>
              Välj ett script för att se dess kod
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scriptnamn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
                        Laddar scripts...
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell className="text-destructive">
                        Fel vid hämtning av scripts: {(error as Error)?.message || "Okänt fel"}
                      </TableCell>
                    </TableRow>
                  ) : scriptTypes.length === 0 ? (
                    <TableRow>
                      <TableCell>Inga scripts tillgängliga</TableCell>
                    </TableRow>
                  ) : (
                    scriptTypes.map((scriptType) => (
                      <TableRow 
                        key={scriptType}
                        className={activeScript === scriptType ? "bg-secondary" : ""}
                        onClick={() => setActiveScript(scriptType)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-medium">{scriptType}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Script Kod: {activeScript || "Inget script valt"}</CardTitle>
            <CardDescription>
              Innehåll i det valda scriptet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Laddar kod...
                </div>
              ) : isError ? (
                <div className="text-destructive p-4">
                  Fel vid hämtning av kod: {(error as Error)?.message || "Okänt fel"}
                </div>
              ) : !activeScript ? (
                <div className="text-center p-4 text-muted-foreground">
                  Inget script valt eller inga scripts tillgängliga
                </div>
              ) : (
                <CodePreview code={scripts && scripts[activeScript] ? scripts[activeScript] : ""} />
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddScriptOpen} onOpenChange={setIsAddScriptOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lägg till nytt script</DialogTitle>
            <DialogDescription>
              Skapa ett nytt script som kan distribueras till klienter
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scriptName" className="text-right">Scriptnamn</Label>
              <Input 
                id="scriptName" 
                value={newScriptName} 
                onChange={(e) => setNewScriptName(e.target.value)} 
                className="col-span-3"
                placeholder="t.ex. custom_logger"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scriptContent" className="text-right">Script Kod</Label>
              <Textarea 
                id="scriptContent" 
                value={newScriptContent} 
                onChange={(e) => setNewScriptContent(e.target.value)} 
                className="col-span-3 min-h-[300px] font-mono"
                placeholder="# Python kod här..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScriptOpen(false)} disabled={addScriptMutation.isPending}>
              Avbryt
            </Button>
            <Button 
              onClick={handleAddScript} 
              disabled={addScriptMutation.isPending}
            >
              {addScriptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                "Spara script"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

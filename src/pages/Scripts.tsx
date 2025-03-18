
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

const fetchScripts = async () => {
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) {
      throw new Error('Failed to fetch scripts');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return {}; // Return empty object instead of throwing error
  }
};

export default function Scripts() {
  const [activeScript, setActiveScript] = useState("");
  const [isAddScriptOpen, setIsAddScriptOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptContent, setNewScriptContent] = useState("");
  const queryClient = useQueryClient();

  const { data: scripts = {}, isLoading } = useQuery({
    queryKey: ['scripts'],
    queryFn: fetchScripts,
    placeholderData: {}
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
        throw new Error('Failed to add script');
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
    onError: (error) => {
      console.error("Error adding script:", error);
      toast.error("Kunde inte lägga till script");
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

  const scriptTypes = Object.keys(scripts || {});
  
  if (!activeScript && scriptTypes.length > 0 && !isLoading) {
    setActiveScript(scriptTypes[0]);
  }

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
                      <TableCell>Laddar scripts...</TableCell>
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
                <div>Laddar kod...</div>
              ) : !activeScript ? (
                <div className="text-center p-4 text-muted-foreground">
                  Inget script valt eller inga scripts tillgängliga
                </div>
              ) : (
                <CodePreview code={scripts[activeScript] || ""} />
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
            <Button variant="outline" onClick={() => setIsAddScriptOpen(false)}>Avbryt</Button>
            <Button onClick={handleAddScript}>Spara script</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

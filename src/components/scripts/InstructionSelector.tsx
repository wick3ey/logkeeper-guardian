
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { InstructionType, ClientInstruction, getInstructionTypes, getClients, updateClientInstruction } from "@/services/scriptsService";
import { CodePreview } from "./CodePreview";

export function InstructionSelector() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedInstruction, setSelectedInstruction] = useState<string>("");
  const [previewCode, setPreviewCode] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: instructionTypes, isLoading: isLoadingInstructions, refetch: refetchInstructions } = useQuery({
    queryKey: ['instructionTypes'],
    queryFn: getInstructionTypes,
  });

  const { data: clients, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const updateInstructionMutation = useMutation({
    mutationFn: async ({ clientId, instructionId }: { clientId: string; instructionId: string }) => {
      return updateClientInstruction(clientId, instructionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Klientinstruktion uppdaterad");
      setSelectedClient("");
      setSelectedInstruction("");
      setPreviewCode("");
    },
    onError: (error: Error) => {
      console.error("Error updating instruction:", error);
      toast.error(`Kunde inte uppdatera instruktion: ${error.message}`);
    },
  });

  // Update preview code when instruction changes
  useEffect(() => {
    if (selectedInstruction && instructionTypes) {
      const instruction = instructionTypes.find(inst => inst.id === selectedInstruction);
      if (instruction) {
        setPreviewCode(instruction.code);
      } else {
        setPreviewCode("");
      }
    } else {
      setPreviewCode("");
    }
  }, [selectedInstruction, instructionTypes]);

  const handleUpdateInstruction = () => {
    if (!selectedClient || !selectedInstruction) {
      toast.error("Välj både klient och instruktion");
      return;
    }
    
    updateInstructionMutation.mutate({
      clientId: selectedClient,
      instructionId: selectedInstruction,
    });
  };

  const handleRefresh = () => {
    refetchClients();
    refetchInstructions();
    toast.info("Uppdaterar data...");
  };

  // Find the currently selected instruction for description display
  const selectedInstructionData = instructionTypes?.find(inst => inst.id === selectedInstruction);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Uppdatera klientinstruktioner</CardTitle>
            <CardDescription>
              Välj en klient och en instruktion för att ändra klientens beteende.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Uppdatera data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Välj klient</Label>
              <Select 
                value={selectedClient} 
                onValueChange={setSelectedClient}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="-- Välj klient --" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClients ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Laddar klienter...
                    </div>
                  ) : clients && clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.system})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Inga klienter tillgängliga</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instruction">Välj instruktion</Label>
              <Select 
                value={selectedInstruction} 
                onValueChange={setSelectedInstruction}
              >
                <SelectTrigger id="instruction">
                  <SelectValue placeholder="-- Välj instruktion --" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingInstructions ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Laddar instruktioner...
                    </div>
                  ) : instructionTypes && instructionTypes.length > 0 ? (
                    instructionTypes.map((instruction) => (
                      <SelectItem key={instruction.id} value={instruction.id}>
                        {instruction.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Inga instruktioner tillgängliga</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedInstructionData && (
              <div className="space-y-2 p-4 border rounded-md bg-muted">
                <p className="font-medium">Instruktion beskrivning:</p>
                <p>{selectedInstructionData.description}</p>
              </div>
            )}

            <Button 
              onClick={handleUpdateInstruction} 
              disabled={!selectedClient || !selectedInstruction || updateInstructionMutation.isPending}
              className="mt-4"
            >
              {updateInstructionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uppdaterar...
                </>
              ) : (
                "Uppdatera instruktion"
              )}
            </Button>
          </div>

          {previewCode && (
            <div className="mt-4 space-y-2">
              <Label>Förhandsgranskning av kod</Label>
              <div className="max-h-[300px] overflow-auto">
                <CodePreview code={previewCode} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruktionsöversikt</CardTitle>
          <CardDescription>
            Klienterna och deras nuvarande instruktioner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Klient</th>
                  <th scope="col" className="px-6 py-3">System</th>
                  <th scope="col" className="px-6 py-3">Nuvarande instruktion</th>
                  <th scope="col" className="px-6 py-3">Senaste aktivitet</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingClients ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                      Laddar klienter...
                    </td>
                  </tr>
                ) : clients && clients.length > 0 ? (
                  clients.map((client) => (
                    <tr key={client.id} className="bg-card border-b">
                      <td className="px-6 py-4 font-medium">{client.name}</td>
                      <td className="px-6 py-4">{client.system}</td>
                      <td className="px-6 py-4">{client.currentInstruction}</td>
                      <td className="px-6 py-4">{client.lastActivity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">Inga klienter tillgängliga</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

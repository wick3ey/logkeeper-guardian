
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ScreenshotsTabProps {
  client: any;
}

interface Screenshot {
  id: number;
  timestamp: string;
  thumbnail: string;
  fullImage: string;
}

export function ScreenshotsTab({ client }: ScreenshotsTabProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");

  // Fetch screenshots for this client
  const { data, isLoading } = useQuery({
    queryKey: ['clients', client.id, 'screenshots'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${client.id}/screenshots`);
        if (!response.ok) {
          throw new Error('Failed to fetch screenshots');
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching screenshots:", error);
        return { screenshots: [] };
      }
    }
  });

  const screenshots: Screenshot[] = data?.screenshots || [];

  // Sort screenshots based on sortOrder
  const sortedScreenshots = [...screenshots].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const handleScreenshotClick = (id: number) => {
    setSelectedScreenshot(id);
    setLightboxOpen(true);
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await fetch(`/api/clients/${client.id}/screenshots/${id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download screenshot');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot_${client.id}_${id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Nedladdning startad");
    } catch (error) {
      console.error("Error downloading screenshot:", error);
      toast.error("Kunde inte ladda ner skärmdump");
    }
  };

  const handlePrevious = () => {
    if (selectedScreenshot !== null && selectedScreenshot > 0) {
      setSelectedScreenshot(selectedScreenshot - 1);
    }
  };

  const handleNext = () => {
    if (selectedScreenshot !== null && selectedScreenshot < screenshots.length - 1) {
      setSelectedScreenshot(selectedScreenshot + 1);
    }
  };

  const selectedScreenshotData = selectedScreenshot !== null 
    ? screenshots.find(s => s.id === selectedScreenshot) 
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Skärmdumpar för {client.name}</h2>
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

      <Card>
        <CardHeader>
          <CardTitle>Skärmdumpar</CardTitle>
          <CardDescription>
            Skärmdumpar tagna från klientens skärm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-md" />
                ))}
              </div>
            ) : sortedScreenshots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Inga skärmdumpar tillgängliga för denna klient</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedScreenshots.map((screenshot) => (
                  <div 
                    key={screenshot.id} 
                    className="relative group cursor-pointer overflow-hidden rounded-md"
                    onClick={() => handleScreenshotClick(screenshot.id)}
                  >
                    <img 
                      src={screenshot.thumbnail} 
                      alt={`Screenshot from ${client.name}`}
                      className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-sm">{screenshot.timestamp}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(screenshot.id);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 z-10 rounded-full bg-black/20 text-white hover:bg-black/40"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {selectedScreenshotData && (
              <>
                <div className="flex items-center justify-between absolute top-2 left-2 right-12 z-10">
                  <div className="bg-black/20 text-white px-3 py-1 rounded-full text-sm">
                    {client.name} - {selectedScreenshotData.timestamp}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(selectedScreenshotData.id);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                <img 
                  src={selectedScreenshotData.fullImage} 
                  alt={`Screenshot from ${client.name}`}
                  className="w-full max-h-[80vh] object-contain"
                />
                
                <div className="absolute inset-y-0 left-0 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-2 rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={handlePrevious}
                    disabled={selectedScreenshot === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-2 rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={handleNext}
                    disabled={selectedScreenshot === screenshots.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

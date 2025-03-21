
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Download, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Screenshot {
  id: number;
  client: string;
  clientName: string;
  timestamp: string;
  thumbnail: string;
  fullImage: string;
}

const fetchScreenshots = async () => {
  try {
    const response = await fetch('/api/screenshots');
    if (!response.ok) {
      throw new Error('Failed to fetch screenshots');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching screenshots:", error);
    return { screenshots: [] };
  }
};

export default function Screenshots() {
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ['screenshots'],
    queryFn: fetchScreenshots,
    placeholderData: { screenshots: [] }
  });

  const screenshots = data?.screenshots || [];
  
  // Filter screenshots based on client and date
  const filteredScreenshots = screenshots.filter((screenshot: Screenshot) => {
    let passesClientFilter = clientFilter === "all" || screenshot.client === clientFilter;
    
    if (!passesClientFilter) return false;
    
    if (dateFilter === "today") {
      const today = new Date().toISOString().split('T')[0];
      const screenshotDate = screenshot.timestamp.split(' ')[0];
      return screenshotDate === today;
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const screenshotDate = screenshot.timestamp.split(' ')[0];
      return screenshotDate === yesterday;
    } else if (dateFilter === "week") {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      return screenshot.timestamp > weekAgo;
    }
    
    return true;
  });

  const handleScreenshotClick = (id: number) => {
    setSelectedScreenshot(id);
    setLightboxOpen(true);
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await fetch(`/api/download_screenshot/${id}`);
      if (!response.ok) {
        throw new Error('Failed to download screenshot');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot_${id}.png`;
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

  // Get unique clients for filter
  const uniqueClients = [...new Set(screenshots.map((s: Screenshot) => s.client))];

  const selectedScreenshotData = selectedScreenshot !== null 
    ? screenshots.find((s: Screenshot) => s.id === selectedScreenshot) 
    : null;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Skärmdumpar</h2>
        <span className="text-sm text-muted-foreground">
          Totalt: {screenshots.length} skärmdumpar
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-64">
          <Label htmlFor="clientFilter">Filtrera efter klient</Label>
          <Select 
            value={clientFilter} 
            onValueChange={setClientFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj klient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla klienter</SelectItem>
              {uniqueClients.map((client: string) => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="md:w-64">
          <Label htmlFor="dateFilter">Filtrera efter datum</Label>
          <Select 
            value={dateFilter} 
            onValueChange={setDateFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj tidsperiod" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla datum</SelectItem>
              <SelectItem value="today">Idag</SelectItem>
              <SelectItem value="yesterday">Igår</SelectItem>
              <SelectItem value="week">Senaste veckan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skärmdumpar galleri</CardTitle>
          <CardDescription>
            Klicka på en skärmdump för att visa i större format
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video w-full rounded-md" />
              ))}
            </div>
          ) : filteredScreenshots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Inga skärmdumpar hittades med de valda filtren</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredScreenshots.map((screenshot: Screenshot) => (
                <div 
                  key={screenshot.id} 
                  className="relative group cursor-pointer overflow-hidden rounded-md"
                  onClick={() => handleScreenshotClick(screenshot.id)}
                >
                  <img 
                    src={screenshot.thumbnail} 
                    alt={`Screenshot from ${screenshot.clientName}`}
                    className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-sm font-medium">{screenshot.clientName}</p>
                    <p className="text-xs">{screenshot.timestamp}</p>
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
                    {selectedScreenshotData.clientName} - {selectedScreenshotData.timestamp}
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
                  alt={`Screenshot from ${selectedScreenshotData.clientName}`}
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

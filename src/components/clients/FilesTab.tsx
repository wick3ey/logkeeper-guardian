
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileIcon, File, FileText, FileImage, FileType } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FilesTabProps {
  client: any;
}

export function FilesTab({ client }: FilesTabProps) {
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileContentOpen, setFileContentOpen] = useState(false);
  
  // Fetch real files from the API
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['clientFiles', client.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/clients/${client.id}/files`);
        if (!response.ok) {
          throw new Error(`Error fetching files: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 60000 // 1 minute
  });

  // Use real data or empty array
  const fileList = files || [];
  
  useEffect(() => {
    if (error) {
      toast.error("Kunde inte hämta filer för klienten");
    }
  }, [error]);

  const sortedFiles = fileList.sort((a, b) => {
    const dateA = new Date(a.modified).getTime();
    const dateB = new Date(b.modified).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const getFileContent = async (file) => {
    if (file.type === "text") {
      try {
        // For text files, fetch the actual content
        const response = await fetch(`/api/clients/${client.id}/files/${file.id}/content`);
        if (!response.ok) throw new Error("Could not fetch file content");
        
        const content = await response.text();
        return content;
      } catch (error) {
        console.error("Error fetching file content:", error);
        return "Error loading file content.";
      }
    }
    return "Binary file content cannot be displayed.";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <FileImage className="h-5 w-5" />;
      case "pdf":
        return <FileType className="h-5 w-5" />;
      case "certificate":
        return <File className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  const handleViewFile = async (file) => {
    setSelectedFile({
      ...file,
      content: "Loading content..."
    });
    setFileContentOpen(true);
    
    // Fetch actual content for text files
    if (file.type === "text") {
      const content = await getFileContent(file);
      setSelectedFile(prev => ({
        ...prev,
        content
      }));
    }
  };

  const handleDownloadFile = (id) => {
    // Real file download
    window.open(`/api/clients/${client.id}/files/${id}/download`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Laddar filer...</p>
      </div>
    );
  }

  // Filter functions for tabs
  const filterByTypes = (files, types) => {
    return files.filter(file => types.includes(file.type));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Filer för {client.name}</h2>
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

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Alla filer</TabsTrigger>
          <TabsTrigger value="text">Textfiler</TabsTrigger>
          <TabsTrigger value="documents">Dokument</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="certificates">Certifikat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Alla filer</CardTitle>
              <CardDescription>
                Filer som hittats på klientens system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Sökväg</TableHead>
                      <TableHead>Storlek</TableHead>
                      <TableHead>Ändrad</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Inga filer hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>{getFileIcon(file.type)}</TableCell>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.path}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{file.modified}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {file.type === "text" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewFile(file)}
                                >
                                  Visa
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadFile(file.id)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Ladda ner
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Textfiler</CardTitle>
              <CardDescription>
                Textbaserade filer (.txt, .csv, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Sökväg</TableHead>
                      <TableHead>Storlek</TableHead>
                      <TableHead>Ändrad</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByTypes(sortedFiles, ["text"]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga textfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterByTypes(sortedFiles, ["text"]).map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.path}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{file.modified}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewFile(file)}
                              >
                                Visa
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadFile(file.id)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Ladda ner
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Dokument</CardTitle>
              <CardDescription>
                Dokumentfiler (.pdf, .docx, .pptx, .xlsx, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Sökväg</TableHead>
                      <TableHead>Storlek</TableHead>
                      <TableHead>Ändrad</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByTypes(sortedFiles, ["pdf", "presentation", "spreadsheet"]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Inga dokumentfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterByTypes(sortedFiles, ["pdf", "presentation", "spreadsheet"]).map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>{getFileIcon(file.type)}</TableCell>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.path}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{file.modified}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadFile(file.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Ladda ner
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Mediafiler</CardTitle>
              <CardDescription>
                Bild- och mediafiler (.jpg, .png, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Sökväg</TableHead>
                      <TableHead>Storlek</TableHead>
                      <TableHead>Ändrad</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByTypes(sortedFiles, ["image"]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga mediafiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterByTypes(sortedFiles, ["image"]).map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.path}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{file.modified}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadFile(file.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Ladda ner
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Certifikat</CardTitle>
              <CardDescription>
                Certifikat och nyckelsfiler (.key, .cer, .pem, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Sökväg</TableHead>
                      <TableHead>Storlek</TableHead>
                      <TableHead>Ändrad</TableHead>
                      <TableHead>Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByTypes(sortedFiles, ["certificate"]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga certifikatfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterByTypes(sortedFiles, ["certificate"]).map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.path}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{file.modified}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadFile(file.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Ladda ner
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={fileContentOpen} onOpenChange={setFileContentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedFile?.name}</DialogTitle>
            <DialogDescription>
              Sökväg: {selectedFile?.path}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="bg-muted p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedFile?.content || "Innehåll kan inte visas"}
              </pre>
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => handleDownloadFile(selectedFile?.id)}
            >
              <Download className="h-4 w-4 mr-2" />
              Ladda ner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

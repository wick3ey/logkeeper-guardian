
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileIcon, File, FileText, FileImage, FilePdf } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FilesTabProps {
  client: any;
}

export function FilesTab({ client }: FilesTabProps) {
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileContentOpen, setFileContentOpen] = useState(false);

  // Mock data for development - in a real implementation, this would come from an API call
  const mockFiles = [
    {
      id: 1,
      name: "meeting_notes.txt",
      path: "C:/Users/John/Documents/meeting_notes.txt",
      size: "12.5 KB",
      modified: "2023-03-21 14:35:22",
      type: "text"
    },
    {
      id: 2,
      name: "presentation.pptx",
      path: "C:/Users/John/Documents/presentation.pptx",
      size: "2.3 MB",
      modified: "2023-03-21 14:30:15",
      type: "presentation"
    },
    {
      id: 3,
      name: "budget_2023.xlsx",
      path: "C:/Users/John/Documents/budget_2023.xlsx",
      size: "456 KB",
      modified: "2023-03-21 14:28:10",
      type: "spreadsheet"
    },
    {
      id: 4,
      name: "report.pdf",
      path: "C:/Users/John/Documents/report.pdf",
      size: "1.2 MB",
      modified: "2023-03-21 14:25:05",
      type: "pdf"
    },
    {
      id: 5,
      name: "scan.jpg",
      path: "C:/Users/John/Pictures/scan.jpg",
      size: "720 KB",
      modified: "2023-03-21 14:20:05",
      type: "image"
    },
    {
      id: 6,
      name: "passwords.txt",
      path: "C:/Users/John/Documents/passwords.txt",
      size: "2 KB",
      modified: "2023-03-21 14:15:48",
      type: "text"
    },
    {
      id: 7,
      name: "certificate.key",
      path: "C:/Users/John/Downloads/certificate.key",
      size: "4 KB",
      modified: "2023-03-21 14:10:15",
      type: "certificate"
    },
    {
      id: 8,
      name: "system_config.csv",
      path: "C:/Users/John/Downloads/system_config.csv",
      size: "32 KB",
      modified: "2023-03-21 14:05:30",
      type: "text"
    }
  ];

  // Sort files based on sortOrder
  const sortedFiles = [...mockFiles].sort((a, b) => {
    const dateA = new Date(a.modified).getTime();
    const dateB = new Date(b.modified).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Mock file content for text files
  const getFileContent = (file: any) => {
    if (file.type === "text") {
      if (file.name === "passwords.txt") {
        return `Facebook: user123:password123
Gmail: john.smith@gmail.com:SecurePass456!
Amazon: jsmith:amazonShopper789
Netflix: john_smith:netflixAndChill2023
Bank: *****:******* (stored in LastPass)
Work VPN: jsmith:C0mpany$ecure`;
      } else if (file.name === "meeting_notes.txt") {
        return `Meeting Notes - March 21, 2023
Attendees: John Smith, Sarah Lee, Mark Johnson

Agenda:
1. Q1 Financial Review
2. New Product Launch Timeline
3. Marketing Strategy

Action Items:
- John: Prepare Q1 report by Friday
- Sarah: Contact vendors for product launch
- Mark: Revise marketing budget

Next Meeting: March 28, 2023 at 10:00 AM`;
      } else if (file.name === "system_config.csv") {
        return `Setting,Value,Last Updated
CPU Power Management,Balanced,2023-03-15
Sleep Timeout,30 minutes,2023-03-15
Display Timeout,15 minutes,2023-03-15
Starting Location,C:/Users/John,2023-03-15
Default Browser,Chrome,2023-03-15
Automatic Updates,Enabled,2023-03-15
Firewall Status,Enabled,2023-03-15
Backup Schedule,Daily at 22:00,2023-03-15
VPN Connection,Automatic,2023-03-15`;
      }
    }
    return "Binary file content cannot be displayed.";
  };

  // Function to get the appropriate icon based on file type
  const getFileIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <FileImage className="h-5 w-5" />;
      case "pdf":
        return <FilePdf className="h-5 w-5" />;
      case "certificate":
        return <File className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  const handleViewFile = (file: any) => {
    setSelectedFile(file);
    setFileContentOpen(true);
  };

  const handleDownloadFile = (id: number) => {
    console.log(`Downloading file with ID ${id}`);
    // In a real implementation, use API to download
    // window.open(`/api/download_file/${id}`, '_blank');
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
        
        {/* All Files Tab */}
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
        
        {/* Text Files Tab */}
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
                    {sortedFiles.filter(file => file.type === "text").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga textfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFiles.filter(file => file.type === "text").map((file) => (
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
        
        {/* Documents Tab */}
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
                    {sortedFiles.filter(file => ["pdf", "presentation", "spreadsheet"].includes(file.type)).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Inga dokumentfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFiles.filter(file => ["pdf", "presentation", "spreadsheet"].includes(file.type)).map((file) => (
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
        
        {/* Media Tab */}
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
                    {sortedFiles.filter(file => file.type === "image").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga mediafiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFiles.filter(file => file.type === "image").map((file) => (
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
        
        {/* Certificates Tab */}
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
                    {sortedFiles.filter(file => file.type === "certificate").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Inga certifikatfiler hittades
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFiles.filter(file => file.type === "certificate").map((file) => (
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

      {/* File Content Dialog */}
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
                {selectedFile ? getFileContent(selectedFile) : ""}
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

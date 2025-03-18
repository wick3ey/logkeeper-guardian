
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real implementation, send to server
      // const response = await fetch("/viewer", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/x-www-form-urlencoded",
      //   },
      //   body: new URLSearchParams({
      //     username,
      //     password,
      //   }),
      //   redirect: "manual",
      // });
      
      // For demo purposes, we'll use hardcoded credentials
      if (username === "wickey" && password === "lolpol771020!!!") {
        toast({
          title: "Inloggning lyckades",
          description: "Välkommen till administratörspanelen",
          variant: "default",
        });
        // In a real app, we would set some authentication state here
        localStorage.setItem("isAuthenticated", "true");
        navigate("/");
      } else {
        toast({
          title: "Inloggning misslyckades",
          description: "Ogiltiga inloggningsuppgifter",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Inloggning misslyckades",
        description: "Ett fel uppstod. Försök igen.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
          <CardDescription>
            Logga in för att komma åt administratörspanelen
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Användarnamn</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ange ditt användarnamn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ange ditt lösenord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Loggar in..." : "Logga in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

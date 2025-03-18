
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  Code, 
  Users, 
  Camera, 
  Settings, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  className?: string;
  closeSheet?: () => void;
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick?: () => void;
}

function SidebarItem({ href, icon, title, isActive, onClick }: SidebarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={href} onClick={onClick}>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="lg"
            className={cn(
              "w-full justify-start",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {icon}
            <span className="ml-2">{title}</span>
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ className, closeSheet }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    if (closeSheet) closeSheet();
    navigate("/login");
  };

  const isPathActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={cn("flex h-screen w-64 flex-col border-r bg-sidebar-background", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold" onClick={closeSheet}>
          <span className="text-xl">Admin Panel</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-2 px-2">
          <SidebarItem
            href="/"
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Dashboard"
            isActive={isPathActive("/")}
            onClick={closeSheet}
          />
          <SidebarItem
            href="/scripts"
            icon={<Code className="h-5 w-5" />}
            title="Scripts"
            isActive={isPathActive("/scripts")}
            onClick={closeSheet}
          />
          <SidebarItem
            href="/clients"
            icon={<Users className="h-5 w-5" />}
            title="Klienter"
            isActive={isPathActive("/clients")}
            onClick={closeSheet}
          />
          <SidebarItem
            href="/screenshots"
            icon={<Camera className="h-5 w-5" />}
            title="Skärmdumpar"
            isActive={isPathActive("/screenshots")}
            onClick={closeSheet}
          />
          <SidebarItem
            href="/settings"
            icon={<Settings className="h-5 w-5" />}
            title="Inställningar"
            isActive={isPathActive("/settings")}
            onClick={closeSheet}
          />
        </nav>
      </ScrollArea>
      <div className="mt-auto p-4">
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logga ut
        </Button>
      </div>
    </div>
  );
}

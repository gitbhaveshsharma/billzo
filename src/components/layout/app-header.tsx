"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  PanelLeftIcon,
  ChevronRight,
  Store,
  LogOut,
  User,
  Settings,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import type { HeaderConfig } from "./types";

interface AppHeaderProps {
  config: HeaderConfig;
  onOpenSearch?: () => void;
}

/** Generate breadcrumbs from pathname */
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));
}

export function AppHeader({ config, onOpenSearch }: AppHeaderProps) {
  const { appUser, logout } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const breadcrumbs = config.showBreadcrumbs ? getBreadcrumbs(pathname) : [];

  const isCompact = config.type === "pos" || (isMobile && config.type !== "dashboard");

  const userInitials = appUser?.fullName
    ? appUser.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : appUser?.email?.slice(0, 2).toUpperCase() ?? "U";

  const handleToggleSidebar = () => {
    if (isMobile) {
      setOpenMobile(!openMobile);
    } else {
      toggleSidebar();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex w-full min-w-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4",
        isCompact ? "h-12" : "h-14"
      )}
    >
      {/* Sidebar Toggle */}
      {config.showSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleToggleSidebar}
        >
          {isMobile ? <Menu className="h-4 w-4" /> : <PanelLeftIcon className="h-4 w-4" />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}

      {/* Separator after toggle */}
      {config.showSidebarToggle && (
        <Separator orientation="vertical" className="h-6" />
      )}

      {/* Breadcrumbs (desktop only) */}
      {config.showBreadcrumbs && !isMobile && breadcrumbs.length > 0 && (
        <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.href} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.isLast ? (
                <span className="truncate font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Mobile: Title only */}
      {isMobile && (
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{config.title}</h1>
        </div>
      )}

      {/* Spacer */}
      {!isMobile && <div className="flex-1" />}

      {/* Right Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* Search trigger */}
        {config.showSearch && (
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            className={cn(
              "h-8 text-muted-foreground",
              !isMobile && "w-56 justify-start gap-2 text-sm"
            )}
            onClick={onOpenSearch}
          >
            <Search className="h-4 w-4" />
            {!isMobile && (
              <>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </>
            )}
          </Button>
        )}

        {/* Notifications */}
        {config.showNotifications && (
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
        )}

        {/* User Menu */}
        {config.showUserMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {appUser?.fullName ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {appUser?.email}
                  </p>
                  {appUser?.storeName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      {appUser.storeName}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => logout?.()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
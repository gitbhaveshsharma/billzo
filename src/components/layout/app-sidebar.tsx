"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Store, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SidebarItem } from "./types";

interface AppSidebarProps {
  items: SidebarItem[];
  pageTitle: string;
  pageSubtitle?: string;
}

export function AppSidebar({ items, pageTitle, pageSubtitle }: AppSidebarProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const userInitials = appUser?.fullName
    ? appUser.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  const roleBadge = appUser?.role
    ? appUser.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  /** Check if a path is the active route */
  const isActive = (href: string) => pathname === href;
  const isActiveParent = (item: SidebarItem) =>
    isActive(item.href) ||
    item.children?.some((child) => isActive(child.href)) ||
    false;

  return (
    <Sidebar collapsible="icon" className="border-r" style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      {/* Sidebar Header — Branding */}
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm">{pageTitle}</span>
            {pageSubtitle && (
              <span className="text-xs text-muted-foreground">{pageSubtitle}</span>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Content — Navigation with ScrollArea */}
      <SidebarContent className="p-0">
        <ScrollArea className="h-full">
          <div className="px-3 py-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) =>
                    item.children && item.children.length > 0 ? (
                      <CollapsibleNavItem
                        key={item.id}
                        item={item}
                        isActiveParent={isActiveParent(item)}
                        isActiveFn={isActive}
                      />
                    ) : (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          tooltip={item.label}
                          className={cn(
                            "transition-all duration-200",
                            isActive(item.href) && "bg-primary/10 font-medium"
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Optional: Add separator and additional sections for better organization */}
            {items.length > 8 && (
              <>
                <SidebarSeparator className="my-2" />
                <SidebarGroup>
                  <SidebarGroupLabel className="px-2 text-xs text-muted-foreground">
                    Quick Actions
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Settings">
                          <Link href="/settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </div>
        </ScrollArea>
      </SidebarContent>

      {/* Sidebar Footer — User Info */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent data-[state=open]:bg-transparent"
              tooltip={appUser?.fullName ?? "User"}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate max-w-35">
                  {appUser?.fullName ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-35">
                  {roleBadge}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// ============================================================================
// Collapsible Nav Item — For items with children
// ============================================================================

interface CollapsibleNavItemProps {
  item: SidebarItem;
  isActiveParent: boolean;
  isActiveFn: (href: string) => boolean;
}

function CollapsibleNavItem({
  item,
  isActiveParent,
  isActiveFn,
}: CollapsibleNavItemProps) {
  return (
    <Collapsible defaultOpen={isActiveParent} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            isActive={isActiveParent}
            className={cn(
              "transition-all duration-200",
              isActiveParent && "bg-primary/10 font-medium"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="border-l border-border/50 ml-3 pl-2">
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActiveFn(child.href)}
                  className={cn(
                    "transition-all duration-200",
                    isActiveFn(child.href) && "bg-primary/10 font-medium"
                  )}
                >
                  <Link href={child.href} className="flex items-center gap-2">
                    {child.icon && <child.icon className="h-3.5 w-3.5" />}
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
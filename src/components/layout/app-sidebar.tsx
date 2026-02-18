"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SidebarItem } from "./types";
import type { RoleName } from "@/types/database.types";

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

      {/* Sidebar Content — Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
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
      </SidebarContent>

      {/* Sidebar Footer — User Info */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default"
              tooltip={appUser?.fullName ?? "User"}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {appUser?.fullName ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground">{roleBadge}</span>
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
          <SidebarMenuButton tooltip={item.label} isActive={isActiveParent}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActiveFn(child.href)}
                >
                  <Link href={child.href}>
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

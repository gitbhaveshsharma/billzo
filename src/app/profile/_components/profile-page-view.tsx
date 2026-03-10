"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth.store";
import { profileService } from "@/services/profile.service";
import { storeUsersService } from "@/services/store-users.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Mail, ShieldCheck, Info } from "lucide-react";
import {
  getUserInitials,
  getAvatarColor,
  getRoleDisplayName,
  getRoleBadgeColor,
  formatDate,
} from "@/utils/store-users.utils";
import { PersonalInfoForm } from "./personal-info-form";
import { WorkInfoForm } from "./work-info-form";
import type { Profile } from "@/types/profile.types";
import type { EnrichedStoreUser } from "@/types/store-users.types";

export function ProfilePageView() {
  const { appUser } = useAuth();
  const setAppUser = useAuthStore((s) => s.setAppUser);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [storeUser, setStoreUser] = useState<EnrichedStoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!appUser) return;
    setLoading(true);
    try {
      const [profileResult, storeUserResult] = await Promise.all([
        profileService.getById(appUser.id),
        appUser.storeId
          ? storeUsersService.getStoreUserById(appUser.storeId, appUser.id)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (profileResult.data) setProfile(profileResult.data);
      if (storeUserResult.data) setStoreUser(storeUserResult.data);
    } finally {
      setLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProfileUpdated = useCallback(
    (updated: Profile) => {
      setProfile(updated);
      if (appUser) {
        setAppUser({ ...appUser, fullName: updated.full_name });
      }
    },
    [appUser, setAppUser]
  );

  const handleStoreUserUpdated = useCallback((updated: EnrichedStoreUser) => {
    setStoreUser(updated);
  }, []);

  if (!appUser) return null;

  const displayName = profile?.full_name ?? appUser.fullName ?? appUser.email;

  const hasEmployeeRecord =
    !!storeUser?.employee_id && appUser.role !== "super_admin";

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        {loading ? (
          <HeroSkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b">
            {/* Avatar */}
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarFallback
                className={`text-2xl font-semibold text-white ${getAvatarColor(displayName)}`}
              >
                {getUserInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            {/* Name + meta */}
            <div className="flex flex-col items-center sm:items-start gap-2 flex-1 min-w-0">
              <h1 className="text-xl font-semibold truncate w-full text-center sm:text-left">
                {displayName}
              </h1>

              {/* Role badge + tooltip */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <Badge
                  className={getRoleBadgeColor(appUser.role)}
                  variant="outline"
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {getRoleDisplayName(appUser.role)}
                </Badge>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-64">
                    <p className="font-medium mb-0.5">Role is read-only</p>
                    <p className="text-xs text-muted-foreground">
                      Your role is assigned by an admin and controls what you
                      can access. Contact your administrator if it needs to be
                      changed.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Email + store + join date */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground justify-center sm:justify-start">
                {/* Email + tooltip */}
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {appUser.email}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 cursor-help opacity-60" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64">
                      <p className="font-medium mb-0.5">Email is read-only</p>
                      <p className="text-xs text-muted-foreground">
                        Your email is tied to your login credentials and cannot
                        be changed here. Please contact support to update it.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>

                {appUser.storeName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    {appUser.storeName}
                  </span>
                )}

                {storeUser?.joining_date && (
                  <span>Joined {formatDate(storeUser.joining_date)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Content Tabs ───────────────────────────────────────────── */}
        <Tabs defaultValue="personal">
          <TabsList
            className={hasEmployeeRecord ? "grid w-full grid-cols-2" : ""}
          >
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            {hasEmployeeRecord && (
              <TabsTrigger value="work">Work Info</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            {loading ? (
              <FormSkeleton rows={5} />
            ) : (
              <PersonalInfoForm
                userId={appUser.id}
                profile={profile}
                onSaved={handleProfileUpdated}
              />
            )}
          </TabsContent>

          {hasEmployeeRecord && (
            <TabsContent value="work" className="mt-4">
              {loading ? (
                <FormSkeleton rows={6} />
              ) : (
                <WorkInfoForm
                  employeeId={storeUser!.employee_id!}
                  storeUser={storeUser!}
                  onSaved={handleStoreUserUpdated}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Skeletons
// ============================================================================

function HeroSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b">
      <Skeleton className="h-20 w-20 rounded-full shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

function FormSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
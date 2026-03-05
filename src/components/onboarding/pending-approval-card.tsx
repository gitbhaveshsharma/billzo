"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    LogOut,
    Store as StoreIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { storeService } from "@/services/store.service";
import { authService } from "@/services/auth.service";
import { useStoreStore } from "@/stores/store.store";
import { useAuthStore } from "@/stores/auth.store";
import { useOrganizationStore } from "@/stores/organization.store";
import { useAuth } from "@/hooks/use-auth";
import { APP_CONFIG } from "@/constants/app.config";

type ApprovalStatus = "pending" | "active" | "rejected" | "suspended";

export function PendingApprovalCard() {
    const router = useRouter();
    const { appUser, isInitialized } = useAuth();
    const { store, updateStatus, setStore, reset: resetStore } = useStoreStore();
    const { logout: logoutAuth } = useAuthStore();
    const { reset: resetOrg } = useOrganizationStore();

    const [status, setStatus] = useState<ApprovalStatus>(
        (store?.status as ApprovalStatus) || "pending"
    );
    const [isPolling, setIsPolling] = useState(true);
    const [isFetchingStore, setIsFetchingStore] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Fetch store if not in Zustand but user has storeId (page refresh scenario)
    useEffect(() => {
        const fetchStore = async () => {
            if (!isInitialized) {
                // console.log("⏳ [PENDING APPROVAL] Waiting for auth to initialize...");
                return;
            }

            if (store) {
                // console.log("⏳ [PENDING APPROVAL] Store already loaded", {
                //     storeId: store.id,
                //     storeName: store.name,
                //     status: store.status,
                // });
                return;
            }

            const storeId = appUser?.storeId;
            if (!storeId) {
                // console.log("⏳ [PENDING APPROVAL] No storeId found, redirecting to create-store");
                toast.error("No store found. Please create a store.");
                router.push(APP_CONFIG.routes.createStore);
                return;
            }

            // console.log("⏳ [PENDING APPROVAL] Fetching store from database", { storeId });
            setIsFetchingStore(true);

            try {
                const { data, error } = await storeService.getById(storeId);
                
                if (error || !data) {
                    // console.error("❌ [PENDING APPROVAL] Failed to fetch store:", error);
                    toast.error("Failed to load store data");
                    router.push(APP_CONFIG.routes.createStore);
                    return;
                }

                // console.log("✅ [PENDING APPROVAL] Store fetched successfully", {
                //     storeId: data.id,
                //     storeName: data.name,
                //     status: data.status,
                // });
                
                setStore(data);
                setStatus(data.status as ApprovalStatus);
            } catch (err) {
                // console.error("❌ [PENDING APPROVAL] Exception while fetching store:", err);
                toast.error("Failed to load store data");
                router.push(APP_CONFIG.routes.createStore);
            } finally {
                setIsFetchingStore(false);
            }
        };

        fetchStore();
    }, [isInitialized, appUser, store, setStore, router]);

    const checkApprovalStatus = useCallback(async () => {
        if (!store?.id) {
            // console.log("⏳ [PENDING APPROVAL] No store ID available for polling");
            return;
        }

        try {
            const { data, error } = await storeService.checkStatus(store.id);

            if (error || !data) return;

            const newStatus = data.status as ApprovalStatus;
            setLastChecked(new Date());

            if (newStatus !== status) {
                setStatus(newStatus);
                updateStatus(newStatus);

                if (newStatus === "active") {
                    setIsPolling(false);
                    toast.success("Your store has been approved!");
                    setTimeout(() => {
                        router.push(APP_CONFIG.routes.dashboard);
                    }, 1500);
                } else if (newStatus === "rejected") {
                    setIsPolling(false);
                    toast.error("Your store application was rejected.");
                }
            }
        } catch {
            // silent — polling continues
        }
    }, [store?.id, status, updateStatus, router]);

    /** Poll every 30 seconds */
    useEffect(() => {
        if (!isPolling || !store?.id || isFetchingStore) return;

        const interval = setInterval(
            checkApprovalStatus,
            APP_CONFIG.polling.storeApproval
        );

        return () => clearInterval(interval);
    }, [isPolling, store?.id, isFetchingStore, checkApprovalStatus]);

    const handleManualRefresh = async () => {
        await checkApprovalStatus();
        toast.success("Status refreshed");
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authService.logout();
            logoutAuth();
            resetOrg();
            resetStore();
            router.push(APP_CONFIG.routes.login);
        } catch {
            toast.error("Logout failed");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const statusConfig: Record<
        ApprovalStatus,
        { icon: React.ReactNode; title: string; description: string; color: string }
    > = {
        pending: {
            icon: <Clock className="h-10 w-10 text-amber-500 animate-pulse" />,
            title: "Store Pending Verification",
            description:
                "Your store has been submitted for review. Our admin team will verify and approve it shortly.",
            color: "text-amber-600",
        },
        active: {
            icon: <CheckCircle className="h-10 w-10 text-green-500" />,
            title: "Store Approved!",
            description:
                "Your store is now active. Redirecting you to your dashboard...",
            color: "text-green-600",
        },
        rejected: {
            icon: <XCircle className="h-10 w-10 text-red-500" />,
            title: "Store Rejected",
            description:
                "Unfortunately your store application was not approved. Please contact support for more details.",
            color: "text-red-600",
        },
        suspended: {
            icon: <XCircle className="h-10 w-10 text-gray-500" />,
            title: "Store Suspended",
            description:
                "Your store has been suspended. Please contact support for assistance.",
            color: "text-gray-600",
        },
    };

    const cfg = statusConfig[status];

    // Show loading state while fetching store
    if (!isInitialized || isFetchingStore) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2">
                        <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                    </div>
                    <CardTitle className="text-2xl text-amber-600">Loading Store...</CardTitle>
                    <CardDescription className="text-base">
                        Please wait while we load your store information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Loading store data..." />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-2">{cfg.icon}</div>
                <CardTitle className={`text-2xl ${cfg.color}`}>{cfg.title}</CardTitle>
                <CardDescription className="text-base">{cfg.description}</CardDescription>
            </CardHeader>

            {store && (
                <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <StoreIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{store.name}</span>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-muted-foreground">Store Code</div>
                            <div className="font-mono">{store.store_code}</div>
                            <div className="text-muted-foreground">Type</div>
                            <div className="capitalize">{store.store_type}</div>
                            <div className="text-muted-foreground">Location</div>
                            <div>
                                {store.city}, {store.state}
                            </div>
                        </div>
                    </div>

                    {status === "pending" && (
                        <Alert variant="warning">
                            <AlertDescription className="text-sm">
                                This usually takes a few minutes. The page will automatically
                                update once your store is approved.
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "rejected" && (
                        <Alert variant="destructive">
                            <AlertDescription className="text-sm">
                                If you believe this was a mistake, please reach out to our support
                                team with your store code:{" "}
                                <span className="font-mono font-semibold">
                                    {store.store_code}
                                </span>
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "active" && (
                        <div className="flex justify-center">
                            <LoadingSpinner size="md" text="Redirecting to dashboard..." />
                        </div>
                    )}
                </CardContent>
            )}

            <CardFooter className="flex flex-col gap-3">
                {status === "pending" && (
                    <>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleManualRefresh}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Status
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Last checked: {lastChecked.toLocaleTimeString()}
                        </p>
                    </>
                )}

                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? (
                        <LoadingSpinner size="sm" text="Logging out..." />
                    ) : (
                        <>
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign out
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Store, ArrowRight, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { storeSchema, type StoreFormData } from "@/validations/store.validation";
import { storeService } from "@/services/store.service";
import { organizationService } from "@/services/organization.service";
import { useOrganizationStore } from "@/stores/organization.store";
import { useStoreStore } from "@/stores/store.store";
import { useAuth } from "@/hooks/use-auth";
import { APP_CONFIG } from "@/constants/app.config";
import { INDIAN_STATES } from "@/constants/states";
import { generateStoreCode } from "@/lib/utils";

export function StoreForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingOrg, setIsFetchingOrg] = useState(false);
    const [orgError, setOrgError] = useState<string | null>(null);

    const { appUser, isInitialized } = useAuth();
    const { organization, setOrganization } = useOrganizationStore();
    const { setStore } = useStoreStore();

    // Fetch organization if not in store but user has organizationId
    useEffect(() => {
        const fetchOrganization = async () => {
            // Wait for auth to initialize
            if (!isInitialized) {
                console.log("🏪 [STORE FORM] Waiting for auth to initialize...");
                return;
            }

            // If organization already in store, we're good
            if (organization) {
                console.log("🏪 [STORE FORM] Organization already loaded", {
                    organizationId: organization.id,
                    organizationName: organization.name,
                });
                return;
            }

            // Check if user has organizationId
            const orgId = appUser?.organizationId;
            if (!orgId) {
                console.log("🏪 [STORE FORM] No organizationId found in appUser", {
                    hasAppUser: !!appUser,
                    appUserId: appUser?.id,
                });
                setOrgError("No organization found. Please create an organization first.");
                return;
            }

            // Fetch organization from database
            console.log("🏪 [STORE FORM] Fetching organization from database", { orgId });
            setIsFetchingOrg(true);
            setOrgError(null);

            try {
                const { data, error } = await organizationService.getById(orgId);

                if (error || !data) {
                    console.error("❌ [STORE FORM] Failed to fetch organization:", error);
                    setOrgError(error || "Failed to load organization");
                    toast.error("Failed to load organization data");
                    return;
                }

                console.log("✅ [STORE FORM] Organization fetched successfully", {
                    organizationId: data.id,
                    organizationName: data.name,
                });

                // Update Zustand store
                setOrganization(data);
            } catch (err) {
                console.error("❌ [STORE FORM] Exception while fetching organization:", err);
                setOrgError("Failed to load organization");
                toast.error("Failed to load organization data");
            } finally {
                setIsFetchingOrg(false);
            }
        };

        fetchOrganization();
    }, [isInitialized, appUser, organization, setOrganization]);

    useEffect(() => {
        console.log("🏪 [STORE FORM] Component state", {
            isInitialized,
            hasAppUser: !!appUser,
            hasOrganization: !!organization,
            isFetchingOrg,
            orgError,
        });
    }, [isInitialized, appUser, organization, isFetchingOrg, orgError]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<StoreFormData>({
        resolver: zodResolver(storeSchema),
        defaultValues: {
            store_type: "retail",
            store_code: "",
        },
    });

    /** Auto-generate store code on mount */
    useEffect(() => {
        setValue("store_code", generateStoreCode());
    }, [setValue]);

    const onSubmit = async (data: StoreFormData) => {
        if (!organization) {
            console.error("❌ [STORE FORM] No organization found");
            toast.error("Organization not found. Please go back and create one.");
            router.push(APP_CONFIG.routes.createOrganization);
            return;
        }

        console.log("🏪 [STORE FORM] Submitting...", {
            name: data.name,
            storeCode: data.store_code,
            storeType: data.store_type,
            organizationId: organization.id,
        });

        setIsSubmitting(true);
        try {
            const { data: store, error } = await storeService.create({
                ...data,
                organization_id: organization.id,
            });

            if (error || !store) {
                console.error("❌ [STORE FORM] Error:", error);
                toast.error(error || "Failed to create store");
                return;
            }

            console.log("✅ [STORE FORM] Created successfully, redirecting to pending-approval");
            setStore(store);
            toast.success("Store created! Awaiting admin approval.");
            router.push(APP_CONFIG.routes.pendingApproval);
        } catch (err) {
            console.error("❌ [STORE FORM] Exception:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while fetching organization
    if (!isInitialized || isFetchingOrg) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Store className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Add your first store</CardTitle>
                    <CardDescription>
                        Loading organization data...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Loading organization..." />
                </CardContent>
            </Card>
        );
    }

    // Show error state if organization fetch failed
    if (orgError || !organization) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Organization Not Found</CardTitle>
                    <CardDescription>
                        {orgError || "Could not load organization data"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            You need to create an organization before you can add a store.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={() => router.push(APP_CONFIG.routes.createOrganization)}
                    >
                        Create Organization
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Store className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Add your first store</CardTitle>
                <CardDescription>
                    Set up your store location. Keep it simple — you can add more details later.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {/* Store Name & Code */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Store Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g. Downtown Branch"
                                disabled={isSubmitting}
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="store_code">
                                Store Code <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="store_code"
                                placeholder="STR-XXXX"
                                className="uppercase"
                                disabled={isSubmitting}
                                {...register("store_code")}
                            />
                            {errors.store_code && (
                                <p className="text-sm text-destructive">
                                    {errors.store_code.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Store Type */}
                    <div className="space-y-2">
                        <Label htmlFor="store_type">
                            Store Type <span className="text-destructive">*</span>
                        </Label>
                        <select
                            id="store_type"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting}
                            {...register("store_type")}
                        >
                            {APP_CONFIG.storeTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.store_type && (
                            <p className="text-sm text-destructive">
                                {errors.store_type.message}
                            </p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="address_line1">
                            Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="address_line1"
                            placeholder="Street address"
                            disabled={isSubmitting}
                            {...register("address_line1")}
                        />
                        {errors.address_line1 && (
                            <p className="text-sm text-destructive">
                                {errors.address_line1.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="city">
                                City <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="city"
                                placeholder="City"
                                disabled={isSubmitting}
                                {...register("city")}
                            />
                            {errors.city && (
                                <p className="text-sm text-destructive">{errors.city.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="state">
                                State <span className="text-destructive">*</span>
                            </Label>
                            <select
                                id="state"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSubmitting}
                                {...register("state")}
                            >
                                <option value="">Select state</option>
                                {INDIAN_STATES.map((s) => (
                                    <option key={s.code} value={s.name}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            {errors.state && (
                                <p className="text-sm text-destructive">{errors.state.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pincode">
                                Pincode <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="pincode"
                                placeholder="110001"
                                maxLength={6}
                                disabled={isSubmitting}
                                {...register("pincode")}
                            />
                            {errors.pincode && (
                                <p className="text-sm text-destructive">{errors.pincode.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                placeholder="+919876543210"
                                disabled={isSubmitting}
                                {...register("phone")}
                            />
                            {errors.phone && (
                                <p className="text-sm text-destructive">{errors.phone.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Store Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="store@example.com"
                                disabled={isSubmitting}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <LoadingSpinner size="sm" text="Creating store..." />
                        ) : (
                            <>
                                Create Store & Submit for Approval
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

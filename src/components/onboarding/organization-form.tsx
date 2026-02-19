"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
    organizationSchema,
    type OrganizationFormData,
} from "@/validations/organization.validation";
import { organizationService } from "@/services/organization.service";
import { useOrganizationStore } from "@/stores/organization.store";
import { useAuth } from "@/hooks/use-auth";
import { APP_CONFIG } from "@/constants/app.config";
import { INDIAN_STATES } from "@/constants/states";

export function OrganizationForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingOrg, setIsFetchingOrg] = useState(false);
    
    const { appUser, isInitialized } = useAuth();
    const { organization, setOrganization } = useOrganizationStore();

    // Fetch organization if user already has one (page refresh scenario)
    useEffect(() => {
        const fetchExistingOrganization = async () => {
            // Wait for auth to initialize
            if (!isInitialized) {
                console.log("🏢 [ORGANIZATION FORM] Waiting for auth to initialize...");
                return;
            }

            // If organization already in store, redirect to next step
            if (organization) {
                console.log("🏢 [ORGANIZATION FORM] Organization already exists, redirecting to create-store", {
                    organizationId: organization.id,
                    organizationName: organization.name,
                });
                router.push(APP_CONFIG.routes.createStore);
                return;
            }

            // Check if user has organizationId (meaning they already created one)
            const orgId = appUser?.organizationId;
            if (!orgId) {
                console.log("🏢 [ORGANIZATION FORM] No existing organization, showing form");
                return;
            }

            // Fetch existing organization and redirect
            console.log("🏢 [ORGANIZATION FORM] User has existing organization, fetching...", { orgId });
            setIsFetchingOrg(true);

            try {
                const { data, error } = await organizationService.getById(orgId);
                
                if (error || !data) {
                    console.error("❌ [ORGANIZATION FORM] Failed to fetch organization:", error);
                    // Don't show error toast - allow user to create new org
                    return;
                }

                console.log("✅ [ORGANIZATION FORM] Organization fetched, redirecting to create-store", {
                    organizationId: data.id,
                    organizationName: data.name,
                });
                
                // Update store and redirect
                setOrganization(data);
                toast.success(`Welcome back! ${data.name} loaded.`);
                router.push(APP_CONFIG.routes.createStore);
            } catch (err) {
                console.error("❌ [ORGANIZATION FORM] Exception while fetching organization:", err);
                // Don't show error - allow user to proceed with form
            } finally {
                setIsFetchingOrg(false);
            }
        };

        fetchExistingOrganization();
    }, [isInitialized, appUser, organization, setOrganization, router]);

    useEffect(() => {
        console.log("🏢 [ORGANIZATION FORM] Component state", {
            isInitialized,
            hasAppUser: !!appUser,
            hasOrganization: !!organization,
            isFetchingOrg,
        });
    }, [isInitialized, appUser, organization, isFetchingOrg]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<OrganizationFormData>({
        resolver: zodResolver(organizationSchema),
    });

    const onSubmit = async (data: OrganizationFormData) => {
        console.log("🏢 [ORGANIZATION FORM] Submitting...", {
            name: data.name,
            legalName: data.legal_name,
            registrationType: data.registration_type,
        });
        setIsSubmitting(true);
        try {
            const { data: org, error } = await organizationService.create(data);
            if (error || !org) {
                console.error("❌ [ORGANIZATION FORM] Error:", error);
                toast.error(error || "Failed to create organization");
                return;
            }

            console.log("✅ [ORGANIZATION FORM] Created successfully, redirecting to create-store");
            setOrganization(org);
            toast.success("Organization created successfully!");
            router.push(APP_CONFIG.routes.createStore);
        } catch (err) {
            console.error("❌ [ORGANIZATION FORM] Exception:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while checking for existing organization
    if (!isInitialized || isFetchingOrg) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Set up your organization</CardTitle>
                    <CardDescription>
                        Checking existing data...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Loading organization..." />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set up your organization</CardTitle>
                <CardDescription>
                    Complete your business information for tax compliance and invoicing.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Basic Information</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Organization Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Acme Retail Pvt Ltd"
                                    disabled={isSubmitting}
                                    {...register("name")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="legal_name">Legal Name</Label>
                                <Input
                                    id="legal_name"
                                    placeholder="As per registration (optional)"
                                    disabled={isSubmitting}
                                    {...register("legal_name")}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="registration_type">Registration Type</Label>
                                <select
                                    id="registration_type"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isSubmitting}
                                    {...register("registration_type")}
                                >
                                    <option value="">Select type (optional)</option>
                                    {APP_CONFIG.registrationTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    Business Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="business@example.com"
                                    disabled={isSubmitting}
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                Business Phone <span className="text-destructive">*</span>
                            </Label>
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
                    </div>

                    <Separator />

                    {/* Tax & Compliance */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Tax & Compliance</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="pan_number">
                                    PAN Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="pan_number"
                                    placeholder="ABCDE1234F"
                                    className="uppercase"
                                    maxLength={10}
                                    disabled={isSubmitting}
                                    {...register("pan_number")}
                                />
                                {errors.pan_number && (
                                    <p className="text-sm text-destructive">
                                        {errors.pan_number.message}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Format: 5 letters + 4 digits + 1 letter
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gstin">
                                    GSTIN <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="gstin"
                                    placeholder="07AAAAA0000A1Z5"
                                    className="uppercase"
                                    maxLength={15}
                                    disabled={isSubmitting}
                                    {...register("gstin")}
                                />
                                {errors.gstin && (
                                    <p className="text-sm text-destructive">{errors.gstin.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    15 characters - verify with GST portal
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Address */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Business Address</h3>
                        <div className="grid grid-cols-1 gap-4">
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

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        </div>
                    </div>

                    <Separator />

                    {/* Bank Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">
                            Bank Details (Optional - Encrypted)
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Bank Name</Label>
                                <Input
                                    id="bank_name"
                                    placeholder="State Bank of India"
                                    disabled={isSubmitting}
                                    {...register("bank_name")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ifsc_code">IFSC Code</Label>
                                <Input
                                    id="ifsc_code"
                                    placeholder="SBIN0001234"
                                    className="uppercase"
                                    maxLength={11}
                                    disabled={isSubmitting}
                                    {...register("ifsc_code")}
                                />
                                {errors.ifsc_code && (
                                    <p className="text-sm text-destructive">
                                        {errors.ifsc_code.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="bank_account_number">Account Number</Label>
                                <Input
                                    id="bank_account_number"
                                    type="password"
                                    placeholder="••••••••••"
                                    disabled={isSubmitting}
                                    {...register("bank_account_number")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Data is encrypted before storage
                                </p>
                            </div>
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
                            <LoadingSpinner size="sm" text="Creating organization..." />
                        ) : (
                            <>
                                Continue to Store Setup
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

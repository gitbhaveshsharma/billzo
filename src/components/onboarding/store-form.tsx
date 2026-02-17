"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Store, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { storeSchema, type StoreFormData } from "@/validations/store.validation";
import { storeService } from "@/services/store.service";
import { useOrganizationStore } from "@/stores/organization.store";
import { useStoreStore } from "@/stores/store.store";
import { APP_CONFIG } from "@/constants/app.config";
import { INDIAN_STATES } from "@/constants/states";
import { generateStoreCode } from "@/lib/utils";

export function StoreForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { organization } = useOrganizationStore();
    const { setStore } = useStoreStore();

    useEffect(() => {
        console.log("🏪 [STORE FORM] Component mounted", {
            hasOrganization: !!organization,
            organizationId: organization?.id,
            organizationName: organization?.name,
        });
        return () => {
            console.log("🏪 [STORE FORM] Component unmounted");
        };
    }, [organization]);

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
                        <Select
                            id="store_type"
                            disabled={isSubmitting}
                            {...register("store_type")}
                        >
                            {APP_CONFIG.storeTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </Select>
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
                            <Select
                                id="state"
                                disabled={isSubmitting}
                                {...register("state")}
                            >
                                <option value="">Select state</option>
                                {INDIAN_STATES.map((s) => (
                                    <option key={s.code} value={s.name}>
                                        {s.name}
                                    </option>
                                ))}
                            </Select>
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

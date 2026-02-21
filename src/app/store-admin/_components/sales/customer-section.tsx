"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PosCustomerSearch } from "../customer/pos-customer-search";
import type { Customer } from "@/types/customers.types";
import type { GstType } from "@/types/sales.types";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerSectionProps {
    storeId: string | null;
    customerId: string | null;
    customerName: string | null;
    customerPhone: string | null;
    customerGstin: string | null;
    gstType: GstType;
    isInterstate: boolean;
    onSetCustomer: (
        customerId: string | null,
        name: string | null,
        phone: string | null,
        gstin?: string | null
    ) => void;
    onSetGstType: (gstType: GstType) => void;
    onSetInterstate: (isInterstate: boolean) => void;
    onAddNew?: () => void;
}

// ============================================================================
// CUSTOMER SECTION
// ============================================================================

export function CustomerSection({
    storeId,
    customerId,
    customerName,
    customerPhone,
    customerGstin,
    gstType,
    isInterstate,
    onSetCustomer,
    onSetGstType,
    onSetInterstate,
    onAddNew,
}: CustomerSectionProps) {
    // Build a minimal customer object for the search component
    const selectedCustomer = customerId
        ? ({
              id: customerId,
              name: customerName ?? "",
              phone: customerPhone ?? "",
              customer_code: "",
              customer_type: "RETAIL",
              outstanding_balance: 0,
              is_blacklisted: false,
          } as Customer)
        : null;

    const handleSelect = (customer: Customer) => {
        onSetCustomer(
            customer.id,
            customer.name,
            customer.phone,
            customer.gstin ?? null
        );
        // If customer has GSTIN, switch to B2B automatically
        if (customer.gstin) {
            onSetGstType("B2B");
        }
    };

    const handleClear = () => {
        onSetCustomer(null, null, null, null);
        if (gstType === "B2B") {
            onSetGstType("B2C");
        }
    };

    return (
        <div className="space-y-3">
            {/* Customer Search */}
            <PosCustomerSearch
                storeId={storeId}
                onSelect={handleSelect}
                onAddNew={onAddNew}
                selectedCustomer={selectedCustomer}
                onClear={handleClear}
                placeholder="Search customer by phone..."
            />

            {/* B2B / Interstate Toggles */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch
                        id="b2b-toggle"
                        checked={gstType === "B2B"}
                        onCheckedChange={(checked) => {
                            onSetGstType(checked ? "B2B" : "B2C");
                        }}
                    />
                    <Label htmlFor="b2b-toggle" className="text-xs cursor-pointer">
                        B2B Sale
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <Switch
                        id="interstate-toggle"
                        checked={isInterstate}
                        onCheckedChange={onSetInterstate}
                    />
                    <Label htmlFor="interstate-toggle" className="text-xs cursor-pointer">
                        Interstate (IGST)
                    </Label>
                </div>
            </div>

            {/* GSTIN Input for B2B */}
            {gstType === "B2B" && (
                <div>
                    <Label className="text-xs text-muted-foreground">Customer GSTIN</Label>
                    <Input
                        value={customerGstin ?? ""}
                        onChange={(e) =>
                            onSetCustomer(
                                customerId,
                                customerName,
                                customerPhone,
                                e.target.value.toUpperCase() || null
                            )
                        }
                        placeholder="22AAAAA0000A1Z5"
                        className="h-8 text-xs mt-1"
                        maxLength={15}
                    />
                </div>
            )}
        </div>
    );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Star,
    Phone,
    Mail,
    Globe,
    MapPin,
    Building2,
    CreditCard,
    FileText,
    Calendar,
    User,
    Plus,
    Trash2,
    Crown,
    Loader2,
} from "lucide-react";
import type { Supplier, SupplierContact } from "@/types/supplier.types";
import { useSupplierStore } from "@/stores/supplier.store";
import {
    getSupplierInitials,
    getSupplierAvatarColor,
    getSupplierStatusBadge,
    getSupplierTypeLabel,
    getSupplierTypeBadgeColor,
    getPaymentTermLabel,
    formatCurrency,
    formatPercentage,
    formatPhoneDisplay,
    formatDate,
    formatSupplierAddress,
    maskAccountNumber,
} from "@/utils/supplier.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface SupplierDetailSheetProps {
    supplier: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ============================================================================
// INFO ROW HELPER
// ============================================================================

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}) {
    if (!value || value === "—") return null;
    return (
        <div className="flex items-start gap-3 py-2">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm break-all">{value}</p>
            </div>
        </div>
    );
}

// ============================================================================
// CONTACT CARD
// ============================================================================

function ContactCard({
    contact,
    onSetPrimary,
    onDelete,
    isDeleting,
}: {
    contact: SupplierContact;
    onSetPrimary: () => void;
    onDelete: () => void;
    isDeleting: boolean;
}) {
    return (
        <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{contact.name}</span>
                    {contact.is_primary && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
                            <Crown className="h-2.5 w-2.5 mr-1" />
                            Primary
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!contact.is_primary && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={onSetPrimary}
                        >
                            Set Primary
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={onDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </div>
            {contact.designation && (
                <p className="text-xs text-muted-foreground">{contact.designation}{contact.department ? ` • ${contact.department}` : ""}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {contact.phone && (
                    <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhoneDisplay(contact.phone)}
                    </span>
                )}
                {contact.email && (
                    <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// ADD CONTACT DIALOG (inline)
// ============================================================================

function AddContactInlineDialog({
    open,
    onOpenChange,
    onAdd,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (data: { name: string; designation?: string; department?: string; email?: string; phone?: string; is_primary?: boolean }) => Promise<boolean>;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [designation, setDesignation] = useState("");
    const [department, setDepartment] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        const success = await onAdd({
            name: name.trim(),
            designation: designation.trim() || undefined,
            department: department.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
        });
        if (success) {
            setName("");
            setDesignation("");
            setDepartment("");
            setEmail("");
            setPhone("");
            onOpenChange(false);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Contact</DialogTitle>
                    <DialogDescription>Add a new contact person for this supplier.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 p-4">
                    <div className="space-y-1.5">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Designation</Label>
                            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g., Manager" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Department</Label>
                            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Sales" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Contact
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// CONTACTS TAB
// ============================================================================

function ContactsTab({ supplierId }: { supplierId: string }) {
    const { fetchContacts, addContact, deleteContact, setPrimaryContact, contactsCache } =
        useSupplierStore();
    const [contacts, setContacts] = useState<SupplierContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadContacts = useCallback(async () => {
        setIsLoading(true);
        const data = await fetchContacts(supplierId);
        setContacts(data);
        setIsLoading(false);
    }, [supplierId, fetchContacts]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // Sync from cache when it updates
    useEffect(() => {
        const cached = contactsCache.get(supplierId);
        if (cached) {
            setContacts(cached.data);
        }
    }, [contactsCache, supplierId]);

    const handleAddContact = async (data: {
        name: string;
        designation?: string;
        department?: string;
        email?: string;
        phone?: string;
        is_primary?: boolean;
    }): Promise<boolean> => {
        const toastId = toast.loading("Adding contact...");
        const result = await addContact(supplierId, data);
        if (result) {
            toast.success("Contact added", { id: toastId });
            await loadContacts();
            return true;
        }
        toast.error("Failed to add contact", { id: toastId });
        return false;
    };

    const handleDeleteContact = async (contactId: string) => {
        setDeletingId(contactId);
        const toastId = toast.loading("Removing contact...");
        const success = await deleteContact(supplierId, contactId);
        if (success) {
            toast.success("Contact removed", { id: toastId });
            await loadContacts();
        } else {
            toast.error("Failed to remove contact", { id: toastId });
        }
        setDeletingId(null);
    };

    const handleSetPrimary = async (contactId: string) => {
        const toastId = toast.loading("Setting primary contact...");
        const success = await setPrimaryContact(supplierId, contactId);
        if (success) {
            toast.success("Primary contact updated", { id: toastId });
            await loadContacts();
        } else {
            toast.error("Failed to update primary contact", { id: toastId });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                    {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                </p>
                <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                </Button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No contacts added yet</p>
                </div>
            ) : (
                contacts.map((contact) => (
                    <ContactCard
                        key={contact.id}
                        contact={contact}
                        onSetPrimary={() => handleSetPrimary(contact.id)}
                        onDelete={() => handleDeleteContact(contact.id)}
                        isDeleting={deletingId === contact.id}
                    />
                ))
            )}

            <AddContactInlineDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onAdd={handleAddContact}
            />
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SupplierDetailSheet({
    supplier,
    open,
    onOpenChange,
}: SupplierDetailSheetProps) {
    if (!supplier) return null;

    const status = getSupplierStatusBadge(supplier);
    const initials = getSupplierInitials(supplier.name);
    const avatarColor = getSupplierAvatarColor(supplier.name);
    const typeBadgeColor = getSupplierTypeBadgeColor(supplier.type);
    const address = formatSupplierAddress(supplier);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback className={cn("text-white text-base", avatarColor)}>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="flex items-center gap-2">
                                <span className="truncate">{supplier.name}</span>
                                {supplier.is_preferred && (
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                                )}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-1">
                                <span>#{supplier.supplier_code}</span>
                                <Badge className={cn("text-[10px]", typeBadgeColor)} variant="outline">
                                    {getSupplierTypeLabel(supplier.type)}
                                </Badge>
                                <Badge className={cn("text-[10px]", status.color)} variant="outline">
                                    {status.label}
                                </Badge>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-2 p-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts</TabsTrigger>
                        <TabsTrigger value="bank">Bank & Payment</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-220px)] mt-4">
                        {/* ======================== OVERVIEW ======================== */}
                        <TabsContent value="overview" className="mt-0 space-y-4">
                            {/* Contact Info */}
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Contact Information
                                </h4>
                                <Separator />
                                <InfoRow icon={User} label="Contact Person" value={supplier.contact_person} />
                                <InfoRow icon={Phone} label="Phone" value={formatPhoneDisplay(supplier.phone)} />
                                <InfoRow icon={Phone} label="Alternate Phone" value={formatPhoneDisplay(supplier.alternate_phone)} />
                                <InfoRow icon={Phone} label="WhatsApp" value={formatPhoneDisplay(supplier.whatsapp)} />
                                <InfoRow icon={Mail} label="Email" value={supplier.email} />
                                <InfoRow icon={Globe} label="Website" value={supplier.website} />
                            </div>

                            {/* Address */}
                            {address && (
                                <div className="space-y-1">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                        Address
                                    </h4>
                                    <Separator />
                                    <InfoRow icon={MapPin} label="Address" value={address} />
                                </div>
                            )}

                            {/* Tax & Legal */}
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Tax & Legal
                                </h4>
                                <Separator />
                                <InfoRow icon={FileText} label="GSTIN" value={supplier.gstin} />
                                <InfoRow icon={FileText} label="PAN" value={supplier.pan_number} />
                                <InfoRow icon={FileText} label="TAN" value={supplier.tan_number} />
                                <InfoRow icon={FileText} label="MSME / Udyam" value={supplier.msme_number} />
                                {supplier.legal_name && (
                                    <InfoRow icon={Building2} label="Legal Name" value={supplier.legal_name} />
                                )}
                            </div>

                            {/* Notes */}
                            {supplier.notes && (
                                <div className="space-y-1">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                        Notes
                                    </h4>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                                        {supplier.notes}
                                    </p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    System Info
                                </h4>
                                <Separator />
                                <InfoRow icon={Calendar} label="Created" value={formatDate(supplier.created_at)} />
                                <InfoRow icon={Calendar} label="Last Updated" value={formatDate(supplier.updated_at)} />
                            </div>
                        </TabsContent>

                        {/* ======================== CONTACTS ======================== */}
                        <TabsContent value="contacts" className="mt-0">
                            <ContactsTab supplierId={supplier.id} />
                        </TabsContent>

                        {/* ======================== BANK & PAYMENT ======================== */}
                        <TabsContent value="bank" className="mt-0 space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Bank Account
                                </h4>
                                <Separator />
                                <InfoRow icon={Building2} label="Bank" value={supplier.bank_name} />
                                <InfoRow
                                    icon={CreditCard}
                                    label="Account No."
                                    value={maskAccountNumber(supplier.bank_account_number)}
                                />
                                <InfoRow icon={FileText} label="IFSC" value={supplier.ifsc_code} />
                                <InfoRow icon={Building2} label="Branch" value={supplier.bank_branch} />
                                <InfoRow icon={CreditCard} label="UPI ID" value={supplier.upi_id} />
                            </div>

                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                    Payment Terms
                                </h4>
                                <Separator />
                                <InfoRow
                                    icon={CreditCard}
                                    label="Terms"
                                    value={getPaymentTermLabel(supplier.payment_terms)}
                                />
                                <InfoRow icon={Calendar} label="Credit Days" value={`${supplier.credit_days} days`} />
                                <InfoRow
                                    icon={CreditCard}
                                    label="Credit Limit"
                                    value={formatCurrency(supplier.credit_limit)}
                                />
                                <InfoRow
                                    icon={FileText}
                                    label="Default Discount"
                                    value={formatPercentage(supplier.default_discount_percentage)}
                                />
                                <InfoRow
                                    icon={FileText}
                                    label="Tax Inclusive"
                                    value={supplier.tax_inclusive ? "Yes" : "No"}
                                />
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}

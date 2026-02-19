"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Product } from "@/types/product.types";

// ============================================================================
// DELETE PRODUCT DIALOG
// ============================================================================

interface DeleteProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (productId: string) => Promise<boolean>;
}

export function DeleteProductDialog({
    product,
    open,
    onOpenChange,
    onConfirm,
}: DeleteProductDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!product) return;
        setIsDeleting(true);
        try {
            const success = await onConfirm(product.id);
            if (success) {
                onOpenChange(false);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete Product
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-medium text-foreground">
                            {product?.name}
                        </span>
                        ? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-xs text-destructive">
                        This will permanently remove the product, its variants, barcodes,
                        and inventory records. Related transaction history will be preserved.
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

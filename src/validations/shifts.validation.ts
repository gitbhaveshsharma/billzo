import { z } from "zod";
import {
    SHIFT_STATUSES,
    CASH_MOVEMENT_TYPES,
    SHIFT_SORT_FIELDS,
} from "@/types/shifts.types";

// ============================================================================
// SHIFTS VALIDATION SCHEMAS
// Zod schemas for cash shift & cash movement CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// OPEN SHIFT SCHEMA
// ============================================================================

export const openShiftSchema = z.object({
    opening_cash: z
        .number({ message: "Opening cash amount is required" })
        .min(0, "Opening cash cannot be negative")
        .max(9999999, "Opening cash amount too large"),
    terminal_id: z
        .string()
        .max(50, "Terminal ID too long")
        .transform(emptyToUndefined)
        .optional(),
    terminal_name: z
        .string()
        .max(100, "Terminal name too long")
        .transform(emptyToUndefined)
        .optional(),
    opening_notes: z
        .string()
        .max(500, "Opening notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// CLOSE SHIFT SCHEMA
// ============================================================================

export const closeShiftSchema = z.object({
    closing_cash_actual: z
        .number({ message: "Closing cash amount is required" })
        .min(0, "Closing cash cannot be negative")
        .max(9999999, "Closing cash amount too large"),
    closing_notes: z
        .string()
        .max(500, "Closing notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// SUSPEND SHIFT SCHEMA
// ============================================================================

export const suspendShiftSchema = z.object({
    reason: z
        .string({ message: "Reason is required" })
        .min(3, "Reason must be at least 3 characters")
        .max(500, "Reason must be at most 500 characters"),
});

// ============================================================================
// RESUME SHIFT SCHEMA
// ============================================================================

export const resumeShiftSchema = z.object({
    notes: z
        .string()
        .max(500, "Notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// CASH MOVEMENT SCHEMA
// ============================================================================

export const createCashMovementSchema = z
    .object({
        movement_type: z.enum(CASH_MOVEMENT_TYPES, {
            message: "Movement type is required",
        }),
        amount: z
            .number({ message: "Amount is required" })
            .positive("Amount must be greater than 0")
            .max(9999999, "Amount too large"),
        reason: z
            .string({ message: "Reason is required" })
            .min(3, "Reason must be at least 3 characters")
            .max(500, "Reason must be at most 500 characters"),
        authorized_by: z
            .string()
            .uuid("Invalid authorizer ID")
            .optional(),
    })
    .refine(
        (data) => {
            // SAFE_DROP and large CASH_OUT amounts should have authorization
            if (
                data.movement_type === "SAFE_DROP" &&
                !data.authorized_by
            ) {
                return false;
            }
            return true;
        },
        {
            message: "Safe drops require authorization",
            path: ["authorized_by"],
        }
    );

// ============================================================================
// UPDATE SHIFT NOTES SCHEMA
// ============================================================================

export const updateShiftNotesSchema = z.object({
    opening_notes: z
        .string()
        .max(500, "Opening notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
    closing_notes: z
        .string()
        .max(500, "Closing notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

export const shiftFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    status: z.enum(SHIFT_STATUSES).optional(),
    terminal_id: z.string().max(50).optional(),
    opened_by: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    shift_date: z.string().optional(),
    has_discrepancy: z.boolean().optional(),
});

export const shiftPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z.enum(SHIFT_SORT_FIELDS).default("opened_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type OpenShiftFormData = z.infer<typeof openShiftSchema>;
export type CloseShiftFormData = z.infer<typeof closeShiftSchema>;
export type SuspendShiftFormData = z.infer<typeof suspendShiftSchema>;
export type ResumeShiftFormData = z.infer<typeof resumeShiftSchema>;
export type CreateCashMovementFormData = z.infer<typeof createCashMovementSchema>;
export type UpdateShiftNotesFormData = z.infer<typeof updateShiftNotesSchema>;
export type ShiftFiltersFormData = z.infer<typeof shiftFiltersSchema>;
export type ShiftPaginationFormData = z.infer<typeof shiftPaginationSchema>;

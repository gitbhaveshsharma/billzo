import { z } from "zod";

/** Reusable email validation */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address");

/** OTP validation (6 digits) */
export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only numbers");

/** Login form schema */
export const loginSchema = z.object({
  email: emailSchema,
});

/** Signup form schema */
export const signupSchema = z.object({
  email: emailSchema,
});

/** OTP verification form schema */
export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type OTPVerificationFormData = z.infer<typeof otpVerificationSchema>;

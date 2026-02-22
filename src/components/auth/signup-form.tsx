"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowRight, Lock } from "lucide-react";
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
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { signupSchema, type SignupFormData } from "@/validations/auth.validation";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { APP_CONFIG } from "@/constants/app.config";

// ============================================================================
// INNER COMPONENT — needs useSearchParams inside Suspense
// ============================================================================

function SignupFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setOtpFlow } = useAuthStore();

    // When arriving from an invitation link: /signup?token=xxx&email=user@example.com
    const inviteToken = searchParams.get("token");
    const inviteEmail = searchParams.get("email");
    const isInviteFlow = !!inviteToken && !!inviteEmail;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            email: inviteEmail ?? "",
        },
    });

    const onSubmit = async (data: SignupFormData) => {
        // If invite flow, always lock to invite email
        const email = isInviteFlow ? inviteEmail! : data.email;

        setIsSubmitting(true);
        try {
            const { error } = await authService.signUpWithOTP(email);
            if (error) {
                toast.error(error);
                return;
            }

            setOtpFlow(email, "signup");
            toast.success("Verification code sent to your email");

            // Carry invite token through to verify-otp so it can be accepted post-signup
            const params = new URLSearchParams({ type: "signup" });
            if (inviteToken) params.set("invite_token", inviteToken);
            if (isInviteFlow) params.set("email", email);

            router.push(`${APP_CONFIG.routes.verifyOtp}?${params.toString()}`);
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <CardDescription>
                    {isInviteFlow
                        ? "You've been invited! Verify your email to join the store."
                        : "Enter your email to get started. We'll send you a verification code."}
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {isInviteFlow && (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>
                                You must sign up with{" "}
                                <strong className="text-foreground">{inviteEmail}</strong> to accept this
                                invitation.
                            </span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10"
                                disabled={isSubmitting || isInviteFlow}
                                {...register("email")}
                            />
                            {isInviteFlow && (
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <LoadingSpinner size="sm" text="Sending code..." />
                        ) : (
                            <>
                                Send verification code
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>

                    {!isInviteFlow && (
                        <p className="text-sm text-muted-foreground text-center">
                            Already have an account?{" "}
                            <a
                                href={APP_CONFIG.routes.login}
                                className="font-medium text-primary hover:underline"
                            >
                                Sign in
                            </a>
                        </p>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}

// ============================================================================
// EXPORT
// ============================================================================

export function SignupForm() {
    return (
        <Suspense fallback={<div className="w-full max-w-md mx-auto h-64 animate-pulse rounded-xl bg-muted" />}>
            <SignupFormInner />
        </Suspense>
    );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/auth/otp-input";
import { LoadingSpinner, PageLoader } from "@/components/shared/loading-spinner";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { organizationService } from "@/services/organization.service";
import { useAuthStore } from "@/stores/auth.store";
import { APP_CONFIG } from "@/constants/app.config";
import type { OTPType } from "@/types/auth.types";

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { otpEmail, otpType, setUser, setSession, clearOtpFlow } =
        useAuthStore();

    const [otp, setOtp] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const type = (searchParams.get("type") as OTPType) || otpType || "login";
    const email = searchParams.get("email") || otpEmail;

    /** Redirect if no email context */
    useEffect(() => {
        if (!email) {
            router.replace(type === "signup" ? APP_CONFIG.routes.signup : APP_CONFIG.routes.login);
        }
    }, [email, router, type]);

    /** Cooldown timer */
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleVerify = async (code: string) => {
        if (!email || code.length !== APP_CONFIG.otp.length) return;

        setIsVerifying(true);
        try {
            const { data, error } = await authService.verifyOTP(email, code);

            if (error || !data) {
                toast.error(error || "Invalid verification code");
                setOtp("");
                setIsVerifying(false);
                return;
            }

            // Get full user & session from Supabase after OTP verification
            const { data: session } = await authService.getSession();
            if (session) {
                setSession(session);
            }

            const { data: fullUser } = await authService.getUser();
            if (fullUser) {
                setUser(fullUser);
            }

            clearOtpFlow();

            if (type === "signup") {
                // New signup → check if profile exists, if not create one, then go to org creation
                const { data: profileExists } = await profileService.exists(data.userId);

                if (!profileExists) {
                    const { error: profileError } = await profileService.create({
                        id: data.userId,
                        email,
                    });
                    if (profileError) {
                        toast.error("Account verified but profile creation failed. Please try again.");
                        setIsVerifying(false);
                        return;
                    }
                }

                toast.success("Account verified!");
                router.push(APP_CONFIG.routes.createOrganization);
            } else {
                // Login flow → validate user
                const { data: loginData, error: loginError } =
                    await authService.validateLogin(email, "0.0.0.0");

                if (loginError || !loginData) {
                    // New user without org/store — send to onboarding
                    toast.success("Logged in!");

                    // Check if user already has an organization
                    const { data: orgs } = await organizationService.getMyOrganizations();
                    if (orgs && orgs.length > 0) {
                        router.push(APP_CONFIG.routes.dashboard);
                    } else {
                        router.push(APP_CONFIG.routes.createOrganization);
                    }
                    return;
                }

                toast.success("Welcome back!");
                router.push(APP_CONFIG.routes.dashboard);
            }
        } catch {
            toast.error("Verification failed. Please try again.");
            setOtp("");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!email || cooldown > 0) return;

        setIsResending(true);
        try {
            const sendFn =
                type === "signup"
                    ? authService.signUpWithOTP
                    : authService.loginWithOTP;

            const { error } = await sendFn(email);
            if (error) {
                toast.error(error);
            } else {
                toast.success("New code sent to your email");
                setCooldown(APP_CONFIG.otp.resendCooldownSeconds);
                setOtp("");
            }
        } catch {
            toast.error("Failed to resend code");
        } finally {
            setIsResending(false);
        }
    };

    const handleOTPComplete = (code: string) => {
        setOtp(code);
        handleVerify(code);
    };

    if (!email) return <PageLoader />;

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Verify your email</CardTitle>
                    <CardDescription>
                        We sent a {APP_CONFIG.otp.length}-digit code to{" "}
                        <span className="font-medium text-foreground">{email}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <OTPInput
                        length={APP_CONFIG.otp.length}
                        value={otp}
                        onChange={setOtp}
                        onComplete={handleOTPComplete}
                        disabled={isVerifying}
                    />

                    {isVerifying && (
                        <div className="flex justify-center">
                            <LoadingSpinner size="md" text="Verifying..." />
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={handleResend}
                        disabled={isResending || cooldown > 0}
                    >
                        {isResending ? (
                            <LoadingSpinner size="sm" text="Sending..." />
                        ) : cooldown > 0 ? (
                            `Resend code in ${cooldown}s`
                        ) : (
                            "Resend code"
                        )}
                    </Button>

                    <Button
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => {
                            clearOtpFlow();
                            router.push(
                                type === "signup"
                                    ? APP_CONFIG.routes.signup
                                    : APP_CONFIG.routes.login
                            );
                        }}
                    >
                        ← Use a different email
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <VerifyOTPContent />
        </Suspense>
    );
}

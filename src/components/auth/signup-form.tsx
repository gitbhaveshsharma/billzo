"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowRight } from "lucide-react";
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

export function SignupForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setOtpFlow } = useAuthStore();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await authService.signUpWithOTP(data.email);
            if (error) {
                toast.error(error);
                return;
            }

            setOtpFlow(data.email, "signup");
            toast.success("Verification code sent to your email");
            router.push(`${APP_CONFIG.routes.verifyOtp}?type=signup`);
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
                    Enter your email to get started. We&apos;ll send you a verification code.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10"
                                disabled={isSubmitting}
                                {...register("email")}
                            />
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

                    <p className="text-sm text-muted-foreground text-center">
                        Already have an account?{" "}
                        <a
                            href={APP_CONFIG.routes.login}
                            className="font-medium text-primary hover:underline"
                        >
                            Sign in
                        </a>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

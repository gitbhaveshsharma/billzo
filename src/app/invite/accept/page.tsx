"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

type PageState =
    | "loading"     // Checking auth + accepting
    | "accepting"   // Calling accept_invitation RPC
    | "success"     // Accepted — redirecting
    | "error";      // Token invalid / expired / email mismatch

// ============================================================================
// INNER COMPONENT (needs useSearchParams inside Suspense)
// ============================================================================

function AcceptInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [state, setState] = useState<PageState>("loading");
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
        if (!token) {
            setErrorMsg("Invalid invitation link — token is missing.");
            setState("error");
            return;
        }

        const supabase = createClient();

        const run = async () => {
            // ── 1. Check if user is already signed in ──────────────────────
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                // Not logged in → redirect to signup with token locked to email
                const params = new URLSearchParams({ token });
                if (email) params.set("email", email);
                router.replace(`/signup?${params.toString()}`);
                return;
            }

            // ── 2. Already signed in → try to accept immediately ───────────
            setState("accepting");

            const { data, error } = await (supabase.rpc as CallableFunction)("accept_invitation", {
                p_token: token,
            });

            if (error) {
                setErrorMsg(error.message || "Failed to accept invitation.");
                setState("error");
                return;
            }

            const result = data as {
                success: boolean;
                error?: string;
                already_member?: boolean;
                store_id?: string;
            };

            if (!result.success) {
                setErrorMsg(result.error || "Invitation not found or expired.");
                setState("error");
                return;
            }

            toast.success(
                result.already_member
                    ? "You're already a member of this store!"
                    : "Welcome aboard! Redirecting to your dashboard…"
            );

            setState("success");

            // Redirect to dashboard — the onboarding/middleware flow will
            // pick up the new store_users row and route the user correctly.
            setTimeout(() => {
                router.replace("/dashboard");
            }, 1500);
        };

        run();
    }, [token, email, router]);

    // ── RENDER ──────────────────────────────────────────────────────────────

    if (state === "loading" || state === "accepting") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                    <CardTitle className="text-xl">
                        {state === "loading"
                            ? "Checking invitation…"
                            : "Accepting invitation…"}
                    </CardTitle>
                    <CardDescription>Please wait a moment.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (state === "success") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl">Invitation accepted!</CardTitle>
                    <CardDescription>
                        Redirecting you to your dashboard…
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // state === "error"
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-xl">Invitation failed</CardTitle>
                <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter className="flex flex-col gap-3">
                {email && (
                    <Button
                        className="w-full"
                        onClick={() => {
                            const params = new URLSearchParams({ token: token ?? "" });
                            if (email) params.set("email", email);
                            router.push(`/signup?${params.toString()}`);
                        }}
                    >
                        <Mail className="h-4 w-4 mr-2" />
                        Try signing up
                    </Button>
                )}
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/login")}
                >
                    Go to login
                </Button>
            </CardFooter>
        </Card>
    );
}

// ============================================================================
// PAGE EXPORT
// ============================================================================

export default function AcceptInvitePage() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 bg-muted/30">
            <Suspense
                fallback={
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            </div>
                            <CardTitle className="text-xl">Loading…</CardTitle>
                        </CardHeader>
                    </Card>
                }
            >
                <AcceptInviteContent />
            </Suspense>
        </div>
    );
}

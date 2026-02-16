"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/types/common.types";
import type { RoleName } from "@/types/database.types";

/**
 * 403 — Unauthorized page.
 * Displays the user's current role and a link back to the dashboard.
 */
export default function UnauthorizedPage() {
    const { appUser } = useAuth();
    const roleLabel =
        appUser?.role
            ? (ROLE_LABELS[appUser.role as RoleName] ?? appUser.role)
            : "Unknown";

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                        <ShieldOff className="h-7 w-7 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Access Denied</CardTitle>
                    <CardDescription>
                        You don&apos;t have permission to access this page.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        Your current role:{" "}
                        <span className="font-medium text-foreground">{roleLabel}</span>
                    </p>
                    <p>
                        If you believe this is an error, contact your store administrator.
                    </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button asChild className="w-full">
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full">
                        <Link href="/">Back to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

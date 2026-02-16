"use client";

import { Ban } from "lucide-react";
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

/**
 * Account suspended / banned page.
 * Shows the ban reason and a logout button.
 */
export default function AccountSuspendedPage() {
    const { appUser, logout } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                        <Ban className="h-7 w-7 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Account Suspended</CardTitle>
                    <CardDescription>
                        Your account has been suspended by an administrator.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {appUser?.bannedReason && (
                        <p>
                            <span className="font-medium text-foreground">Reason: </span>
                            {appUser.bannedReason}
                        </p>
                    )}
                    <p>
                        If you believe this is an error, please contact your store
                        administrator to resolve the issue.
                    </p>
                </CardContent>

                <CardFooter>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => logout()}
                    >
                        Sign Out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

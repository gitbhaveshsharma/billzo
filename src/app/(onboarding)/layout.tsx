// Middleware handles all auth checks - no client-side verification needed
// If user reaches this page, they are authenticated (middleware guarantees it)

import { useAuthStore } from "@/stores/auth.store";

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only use store for display purposes, not for auth checks
    const user = useAuthStore((state) => state.user);

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
            <header className="p-6 flex items-center justify-between">
                <span className="text-xl font-bold tracking-tight">
                    Store<span className="text-primary">POS</span>
                </span>
                {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
            </header>
            <main className="flex flex-1 items-center justify-center px-4 pb-16">
                {children}
            </main>
        </div>
    );
}

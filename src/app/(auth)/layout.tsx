import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "StorePOS – Authentication",
    description: "Sign in or create your StorePOS account",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
            <header className="p-6">
                <a href="/" className="text-xl font-bold tracking-tight">
                    Store<span className="text-primary">POS</span>
                </a>
            </header>
            <main className="flex flex-1 items-center justify-center px-4 pb-16">
                {children}
            </main>
        </div>
    );
}

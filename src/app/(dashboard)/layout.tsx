// Middleware handles all auth + onboarding checks - no client-side verification needed
// If user reaches this page, they are authenticated AND onboarding is complete (middleware guarantees it)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/dashboard">
              <span className="font-bold">StorePOS</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-2">
              <a
                href="/dashboard"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Dashboard
              </a>
              <a
                href="/profile"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Profile
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

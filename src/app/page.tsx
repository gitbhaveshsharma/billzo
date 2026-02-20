import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Store, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/billzo-logo.png"
            alt="Billzo Logo"
            width={180}
            height={60}
            className="h-11 w-auto object-contain"
          />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Modern POS for
            <br />
            <span className="text-primary">growing businesses</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Multi-tenant cloud-based point-of-sale system. Manage multiple
            stores, employees, and sales — all from one place.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md border px-8 text-base font-medium transition-colors hover:bg-muted"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
            <Store className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Multi-Store</h3>
            <p className="text-sm text-muted-foreground text-center">
              Manage multiple store locations under one organization with
              role-based access.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
            <Shield className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Secure by Default</h3>
            <p className="text-sm text-muted-foreground text-center">
              OTP-based authentication, encrypted sensitive data, and
              row-level security.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
            <Zap className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">Fast Setup</h3>
            <p className="text-sm text-muted-foreground text-center">
              Get your store running in minutes with our streamlined
              onboarding flow.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} StorePOS. All rights reserved.
      </footer>
    </div>
  );
}

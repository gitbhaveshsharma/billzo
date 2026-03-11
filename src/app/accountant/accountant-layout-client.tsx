"use client";

import { AccountantProvider } from "./_context/accountant-context";
import { ConditionalLayout } from "@/components/layout";

export function AccountantLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountantProvider>
      <ConditionalLayout>{children}</ConditionalLayout>
    </AccountantProvider>
  );
}

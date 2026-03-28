import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/providers/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0e2231",
};

export const metadata: Metadata = {
  applicationName: "Billzo",
  title: "Billzo – Multi-tenant SaaS POS System",
  description:
    "Manage your stores, employees, and sales with Billzo – a modern cloud-based point-of-sale platform.",
  manifest: "/favicon_io/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Billzo",
  },
  icons: {
    icon: [
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon_io/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ServiceWorkerRegister />
          {children}
          <Toaster
  position="top-center"
  toastOptions={{
    duration: 4000,
    style: {
      background: "bg-black/80 backdrop-blur-sm",
      borderRadius: "8px",
      color: "hsl(var(--card-foreground))",
      border: "1px solid hsl(var(--border))",
      
    },
  }}
/>
        </Providers>
      </body>
    </html>
  );
}

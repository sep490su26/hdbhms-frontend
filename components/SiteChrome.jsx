"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

export function SiteChrome({ children, isWebView }) {
  const pathname = usePathname();
  const isManagementRoute =
    pathname?.startsWith("/management") ||
    pathname?.startsWith("/viewing-customers") ||
    pathname?.startsWith("/dashboard");
  const isAuthRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/forgot-password");

  if (isWebView || isManagementRoute || isAuthRoute) {
    return (
      <>
        {children}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <Toaster richColors position="top-right" />
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function SiteChrome({ children, isWebView }) {
  const pathname = usePathname();
  const isManagementRoute =
    pathname?.startsWith("/management") ||
    pathname?.startsWith("/viewing-customers") ||
    pathname?.startsWith("/dashboard");
  const isAuthRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/forgot-password");

  if (isWebView || isManagementRoute || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}

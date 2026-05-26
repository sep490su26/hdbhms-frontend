"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function SiteChrome({ children }) {
  const pathname = usePathname();
  const isManagementRoute =
    pathname?.startsWith("/management") || pathname?.startsWith("/dashboard");
  const isAuthRoute = pathname?.startsWith("/login");

  if (isManagementRoute || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow" style={{ paddingTop: 'var(--navbar-height)' }}>{children}</main>
      <Footer />
    </>
  );
}

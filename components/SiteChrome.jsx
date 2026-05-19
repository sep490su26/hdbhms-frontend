"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function SiteChrome({ children }) {
  const pathname = usePathname();
  const isManagementRoute = pathname?.startsWith("/management");

  if (isManagementRoute) {
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

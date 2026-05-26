"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "../_contexts/AuthContext";

export function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const token = window.localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!user) {
        try {
          await refreshUser(token);
        } catch {
          router.replace("/login");
          return;
        }
      }

      if (isMounted) {
        setIsChecking(false);
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [refreshUser, router, user]);

  if (isChecking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] text-[#091426]">
        <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </div>
    );
  }

  return children;
}

"use client";

import { createContext, useContext, useMemo } from "react";
import { ROLE_LABELS, ROLES, normalizeRole } from "../_lib/rbac";

const AuthContext = createContext(null);

export function AuthProvider({ user, children }) {
  const value = useMemo(() => {
    const role = normalizeRole(user?.role) || ROLES.OWNER;

    return {
      user: {
        id: user?.id || "USR-OWNER",
        name: user?.name || "Admin User",
        email: user?.email || "admin@haidang.vn",
        role,
        roleLabel: ROLE_LABELS[role] || "Không rõ",
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

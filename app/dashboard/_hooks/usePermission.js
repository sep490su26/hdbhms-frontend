"use client";

import { useMemo } from "react";
import { useAuth } from "../_contexts/AuthContext";
import { canAccessRole } from "../_lib/rbac";

export function usePermission(allowedRoles = []) {
  const { user } = useAuth();
  const effectiveRole = user?.role || (process.env.NODE_ENV === "development" ? "owner" : "");

  return useMemo(() => {
    return {
      hasAccess: canAccessRole(effectiveRole, allowedRoles),
      role: effectiveRole,
      user,
    };
  }, [allowedRoles, effectiveRole, user]);
}

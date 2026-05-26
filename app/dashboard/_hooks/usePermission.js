"use client";

import { useMemo } from "react";
import { useAuth } from "../_contexts/AuthContext";
import { canAccessRole } from "../_lib/rbac";

export function usePermission(allowedRoles = []) {
  const { user } = useAuth();

  return useMemo(() => {
    return {
      hasAccess: canAccessRole(user?.role, allowedRoles),
      role: user?.role,
      user,
    };
  }, [allowedRoles, user]);
}

"use client";

import { usePermission } from "../_hooks/usePermission";

export function PermissionGuard({ allowedRoles = [], children, fallback = null, mode = "hide" }) {
  const { hasAccess } = usePermission(allowedRoles);

  if (hasAccess) {
    return children;
  }

  if (mode === "disabled") {
    return fallback;
  }

  return null;
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/services/identityAccessService";
import { ROLE_LABELS, normalizeRole } from "../_lib/rbac";

const AuthContext = createContext(null);

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.email || user?.phone || "Nguoi dung";
}

function normalizeUser(user) {
  if (!user) return null;

  const role = normalizeRole(user.role) || normalizeRole(user.roleName);
  const displayName = getDisplayName(user);

  return {
    ...user,
    fullName: user.fullName || displayName,
    name: displayName,
    avatarUrl: user.avatarUrl || null,
    role,
    roleLabel: ROLE_LABELS[role] || user.role || "Khong ro",
  };
}

export function AuthProvider({ initialUser = null, user: legacyUser = null, children }) {
  const router = useRouter();
  const [user, setUserState] = useState(() => normalizeUser(initialUser || legacyUser));
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const refreshUser = useCallback(async (token) => {
    const accessToken =
      token || (typeof window !== "undefined" ? window.localStorage.getItem("token") : null);

    if (!accessToken) {
      setUserState(null);
      return null;
    }

    setIsLoadingUser(true);

    try {
      // Hydrate global dashboard state from GET /users/me for header/sidebar consumers.
      const profile = await getCurrentUserProfile();
      const normalizedProfile = normalizeUser(profile);

      setUserState(normalizedProfile);
      return normalizedProfile;
    } catch (error) {
      setUserState(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("token");
      }
      throw error;
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const setUser = useCallback((profile) => {
    setUserState(normalizeUser(profile));
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
    }

    setUserState(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      refreshUser,
      logout,
      isLoadingUser,
    }),
    [isLoadingUser, logout, refreshUser, setUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

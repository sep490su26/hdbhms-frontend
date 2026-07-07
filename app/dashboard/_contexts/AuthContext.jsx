"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthSession, getCurrentUserProfile, logout as logoutApi } from "@/services/identityAccessService";
import { ROLE_LABELS, normalizeRole } from "../_lib/rbac";
import {readCachedProfile, writeCachedProfile} from "@/lib/profileCache";

const AuthContext = createContext(null);

function getDisplayName(user) {
  return (
    user?.fullName ||
    user?.full_name ||
    user?.name ||
    user?.email ||
    user?.phone ||
    "Nguoi dung"
  );
}

function normalizeUser(user, fallbackRole = null) {
  if (!user) return null;

  const role =
    normalizeRole(user.role) ||
    normalizeRole(user.roleName) ||
    normalizeRole(user.role_name) ||
    normalizeRole(fallbackRole);
  const displayName = getDisplayName(user);

  return {
    ...user,
    fullName: user.fullName || user.full_name || displayName,
    name: displayName,
    avatarUrl: user.avatarUrl || user.avatar_url || null,
    role,
    roleLabel: ROLE_LABELS[role] || user.role || fallbackRole || "Khong ro",
  };
}

export function AuthProvider({ initialUser = null, user: legacyUser = null, children }) {
  const [user, setUserState] = useState(() => normalizeUser(initialUser || legacyUser));
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const refreshUser = useCallback(async (token) => {
    const isBrowser = typeof window !== "undefined";
    const accessToken = token || (isBrowser ? window.localStorage.getItem("token") : null);
    const storedRole = isBrowser ? window.localStorage.getItem("userRole") : null;

    if (!accessToken) {
      setUserState(null);
      return null;
    }

    setIsLoadingUser(true);

    try {
      // Hydrate global dashboard state from GET /users/me for header/sidebar consumers.
      const profile = await getCurrentUserProfile();
      const normalizedProfile = normalizeUser(profile, storedRole);

      setUserState(normalizedProfile);
      writeCachedProfile(normalizedProfile);
      return normalizedProfile;
    } catch (error) {
      const cachedProfile = isBrowser ? readCachedProfile() : null;
      if (error instanceof TypeError && cachedProfile) {
        const normalizedProfile = normalizeUser(cachedProfile, storedRole);
        setUserState(normalizedProfile);
        return normalizedProfile;
      }

      setUserState(null);
      clearAuthSession();
      throw error;
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      const token = window.localStorage.getItem("token");
      if (!token) {
        setUserState(null);
      }
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, []);

  const setUser = useCallback((profile) => {
    const normalizedProfile = normalizeUser(profile);
    setUserState(normalizedProfile);
    writeCachedProfile(normalizedProfile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore API errors for logout to ensure frontend always clears
    }

    clearAuthSession();

    setUserState(null);
  }, []);

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

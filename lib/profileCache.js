const PROFILE_CACHE_KEY = "hdbhms.current-user-profile";

export function readCachedProfile() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(PROFILE_CACHE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile) {
  if (typeof window === "undefined" || !profile) return;

  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Large avatar data URLs can exceed storage quota; in-memory state remains valid.
  }
}

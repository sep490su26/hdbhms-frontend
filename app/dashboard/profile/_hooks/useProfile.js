"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useAuth} from "@/app/dashboard/_contexts/AuthContext";
import {
  ApiError,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from "@/services/identityAccessService";
import {readCachedProfile, writeCachedProfile} from "@/lib/profileCache";

const DUPLICATE_MESSAGE = "SĐT/email đã được đăng ký bởi tài khoản khác";
const INVALID_IMAGE_MESSAGE = "File ảnh không hợp lệ";
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }
  return fallback;
}

export function normalizeProfile(source, fallback = {}) {
  const merged = {...fallback, ...source};

  return {
    ...merged,
    id: firstValue(merged, ["id", "userId", "user_id"], null),
    fullName: firstValue(merged, ["fullName", "full_name", "name"]),
    phone: firstValue(merged, ["phone", "phoneNumber", "phone_number"]),
    email: firstValue(merged, ["email"]),
    avatarUrl: firstValue(
      merged,
      ["avatarUrl", "avatar_url", "profilePictureUrl", "profile_picture_url"],
      null,
    ),
    assignedBranch: firstValue(merged, [
      "assignedBranch",
      "assigned_branch",
      "branchName",
      "branch_name",
      "facilityName",
      "facility_name",
    ]),
    position: firstValue(
      merged,
      ["position", "positionName", "position_name", "roleLabel", "role"],
    ),
    startDate: firstValue(merged, [
      "startDate",
      "start_date",
      "employmentStartDate",
      "employment_start_date",
      "createdAt",
      "created_at",
    ]),
  };
}

function isNetworkError(error) {
  return error instanceof TypeError || error?.name === "NetworkError";
}

function getDuplicateErrors(error) {
  if (!(error instanceof ApiError)) return null;

  const message = `${error.message || ""} ${error.details || ""}`.toLocaleLowerCase("vi");
  const code = String(error.code || "").toLocaleLowerCase("vi");
  const isDuplicate =
    error.status === 409 ||
    code.includes("duplicate") ||
    message.includes("đã được đăng ký") ||
    message.includes("already registered");

  if (!isDuplicate) return null;

  if (message.includes("phone") || message.includes("sđt")) {
    return {phone: DUPLICATE_MESSAGE};
  }
  if (message.includes("email")) {
    return {email: DUPLICATE_MESSAGE};
  }
  return {phone: DUPLICATE_MESSAGE, email: DUPLICATE_MESSAGE};
}

export function useProfile() {
  const {user, setUser} = useAuth();
  const initialUser = useRef(user);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({phone: "", email: ""});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);

  const commitProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setUser(nextProfile);
    writeCachedProfile(nextProfile);
  }, [setUser]);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await getCurrentUserProfile();
        if (!isActive) return;
        const nextProfile = normalizeProfile(response, initialUser.current);
        commitProfile(nextProfile);
        setDraft({phone: nextProfile.phone, email: nextProfile.email});
      } catch {
        if (!isActive) return;
        const cachedProfile = readCachedProfile();
        const fallbackProfile = cachedProfile || initialUser.current;

        if (fallbackProfile) {
          const nextProfile = normalizeProfile(fallbackProfile);
          setProfile(nextProfile);
          setDraft({phone: nextProfile.phone, email: nextProfile.email});
        }
        setLoadError("Không thể tải hồ sơ mới nhất. Đang hiển thị dữ liệu đã lưu gần nhất.");
        setToast({tone: "error", message: "Mất kết nối mạng khi tải hồ sơ."});
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      isActive = false;
    };
  }, [commitProfile]);

  const missingFields = useMemo(() => {
    if (!profile) return [];
    return ["fullName", "phone", "email", "avatarUrl"].filter((field) => !profile[field]);
  }, [profile]);

  const beginEditing = useCallback(() => {
    if (!profile) return;
    setDraft({phone: profile.phone || "", email: profile.email || ""});
    setFieldErrors({});
    setIsEditing(true);
  }, [profile]);

  const cancelEditing = useCallback(() => {
    setDraft({phone: profile?.phone || "", email: profile?.email || ""});
    setFieldErrors({});
    setIsEditing(false);
  }, [profile]);

  const updateDraft = useCallback((field, value) => {
    setDraft((current) => ({...current, [field]: value}));
    setFieldErrors((current) => ({...current, [field]: ""}));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profile || isSaving) return;

    setIsSaving(true);
    setFieldErrors({});

    try {
      const response = await updateCurrentUserProfile({
        phone: draft.phone.trim(),
        email: draft.email.trim(),
      });
      const nextProfile = normalizeProfile(
        {
          ...profile,
          ...response,
          phone: draft.phone.trim(),
          email: draft.email.trim(),
        },
        profile,
      );
      commitProfile(nextProfile);
      setDraft({phone: nextProfile.phone, email: nextProfile.email});
      setIsEditing(false);
      setToast({tone: "success", message: "Đã cập nhật hồ sơ thành công."});
    } catch (error) {
      const conflicts = getDuplicateErrors(error);
      if (conflicts) {
        setFieldErrors(conflicts);
      } else {
        setToast({
          tone: "error",
          message: isNetworkError(error)
            ? "Mất kết nối mạng. Thay đổi chưa được lưu."
            : error?.message || "Không thể cập nhật hồ sơ.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [commitProfile, draft.email, draft.phone, isSaving, profile]);

  const uploadAvatar = useCallback(async (file) => {
    if (!file || !ACCEPTED_IMAGE_TYPES.has(file.type) || file.size > MAX_AVATAR_SIZE) {
      setFieldErrors((current) => ({...current, avatar: INVALID_IMAGE_MESSAGE}));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setFieldErrors((current) => ({...current, avatar: ""}));
    setIsUploading(true);

    try {
      const response = await uploadCurrentUserAvatar(file);
      const nextProfile = normalizeProfile(
        {...profile, ...response, avatarUrl: response.avatarUrl},
        profile,
      );
      commitProfile(nextProfile);
      setAvatarPreview("");
      setToast({tone: "success", message: "Đã cập nhật ảnh đại diện."});
    } catch (error) {
      setAvatarPreview("");
      setToast({
        tone: "error",
        message: isNetworkError(error)
          ? "Mất kết nối mạng khi tải ảnh lên."
          : error?.message || "Không thể tải ảnh đại diện.",
      });
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploading(false);
    }
  }, [commitProfile, profile]);

  return {
    profile,
    draft,
    isLoading,
    isEditing,
    isSaving,
    isUploading,
    avatarPreview,
    fieldErrors,
    loadError,
    toast,
    missingFields,
    beginEditing,
    cancelEditing,
    updateDraft,
    saveProfile,
    uploadAvatar,
    dismissToast: () => setToast(null),
  };
}

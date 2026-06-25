"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FACILITY_STATUS,
  createFacility as createFacilityRequest,
  getFacilitiesDashboard,
  updateFacility as updateFacilityRequest,
  updateFacilityStatus as updateFacilityStatusRequest,
} from "@/services/facilityService";

const EMPTY_FORM = {
  name: "",
  address: "",
  description: "",
};

function normalizeName(value) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

function validateFacility(values, facilities, editingId) {
  const errors = {};
  const name = values.name.trim();
  const address = values.address.trim();

  if (!name) errors.name = "Tên cơ sở là bắt buộc";
  if (!address) errors.address = "Địa chỉ là bắt buộc";

  const isDuplicate = facilities.some(
    (facility) =>
      facility.id !== editingId &&
      normalizeName(facility.name) === normalizeName(name),
  );

  if (name && isDuplicate) {
    errors.name = "Tên cơ sở đã tồn tại";
  }

  return errors;
}

export function useFacilityManagement({ keyword = "", status = "" } = {}) {
  const [facilities, setFacilities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [formState, setFormState] = useState({
    isOpen: false,
    mode: "create",
    editingId: null,
    values: EMPTY_FORM,
    errors: {},
    isSubmitting: false,
  });
  const [statusFlow, setStatusFlow] = useState(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, tone = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const retry = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getFacilitiesDashboard({ keyword, status });
      setFacilities(data.facilities);
      setSummary(data.summary);
    } catch (err) {
      setFacilities([]);
      setSummary(null);
      setError(err?.message || "Không thể tải danh sách cơ sở");
    } finally {
      setIsLoading(false);
    }
  }, [keyword, status]);

  useEffect(() => {
    void Promise.resolve().then(retry);
  }, [retry]);

  const openCreateForm = useCallback(() => {
    setFormState({
      isOpen: true,
      mode: "create",
      editingId: null,
      values: EMPTY_FORM,
      errors: {},
      isSubmitting: false,
    });
  }, []);

  const openEditForm = useCallback((facility) => {
    setFormState({
      isOpen: true,
      mode: "edit",
      editingId: facility.id,
      values: {
        name: facility.name,
        address: facility.address,
        description: facility.description || "",
        status: facility.status || FACILITY_STATUS.ACTIVE,
      },
      errors: {},
      isSubmitting: false,
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormState((current) =>
      current.isSubmitting ? current : { ...current, isOpen: false },
    );
  }, []);

  const updateFormValue = useCallback((field, value) => {
    setFormState((current) => ({
      ...current,
      values: { ...current.values, [field]: value },
      errors: { ...current.errors, [field]: "" },
    }));
  }, []);

  const submitForm = useCallback(async () => {
    const errors = validateFacility(
      formState.values,
      facilities,
      formState.editingId,
    );

    if (Object.keys(errors).length > 0) {
      setFormState((current) => ({ ...current, errors }));
      return;
    }

    const payload = {
      name: formState.values.name.trim(),
      address: formState.values.address.trim(),
      description: formState.values.description.trim(),
      status: formState.values.status || FACILITY_STATUS.ACTIVE,
    };

    setFormState((current) => ({ ...current, isSubmitting: true }));

    try {
      if (formState.mode === "create") {
        await createFacilityRequest(payload);
        pushToast("Đã thêm cơ sở mới");
      } else {
        await updateFacilityRequest(formState.editingId, payload);
        pushToast("Đã cập nhật thông tin cơ sở");
      }

      setFormState((current) => ({
        ...current,
        isOpen: false,
        isSubmitting: false,
      }));
      await retry();
    } catch (err) {
      setFormState((current) => ({ ...current, isSubmitting: false }));
      pushToast(err?.message || "Mất kết nối, vui lòng thử lại", "error");
    }
  }, [facilities, formState, pushToast, retry]);

  const requestStatusChange = useCallback((facility, nextStatus) => {
    if (facility.status === nextStatus) return;

    if (
      nextStatus === FACILITY_STATUS.PERMANENTLY_CLOSED &&
      facility.hasOutstandingDebts
    ) {
      setStatusFlow({
        type: "blocked",
        facility,
        nextStatus,
        acknowledged: false,
      });
      return;
    }

    setStatusFlow({
      type:
        nextStatus === FACILITY_STATUS.PERMANENTLY_CLOSED &&
        facility.hasActiveContracts
          ? "warning"
          : "confirm",
      facility,
      nextStatus,
      acknowledged: false,
    });
  }, []);

  const setStatusAcknowledged = useCallback((acknowledged) => {
    setStatusFlow((current) =>
      current ? { ...current, acknowledged } : current,
    );
  }, []);

  const closeStatusFlow = useCallback(() => {
    if (!isStatusSubmitting) setStatusFlow(null);
  }, [isStatusSubmitting]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusFlow || statusFlow.type === "blocked") return;
    if (statusFlow.type === "warning" && !statusFlow.acknowledged) return;

    setIsStatusSubmitting(true);
    try {
      await updateFacilityStatusRequest(statusFlow.facility.id, statusFlow.nextStatus);
      setStatusFlow(null);
      pushToast("Đã cập nhật trạng thái cơ sở");
      await retry();
    } catch (err) {
      pushToast(err?.message || "Mất kết nối, vui lòng thử lại", "error");
    } finally {
      setIsStatusSubmitting(false);
    }
  }, [pushToast, retry, statusFlow]);

  const updateFacilityFloors = useCallback((facilityId, updatedFloors) => {
    setFacilities((current) =>
      current.map((facility) =>
        facility.id === facilityId
          ? { ...facility, floors: updatedFloors }
          : facility,
      ),
    );
  }, []);

  const stats = useMemo(() => ({
    totalFacilities: summary?.totalProperties ?? facilities.length,
    activeFacilities: summary?.activeProperties ?? facilities.filter(
      (facility) => facility.status === FACILITY_STATUS.ACTIVE,
    ).length,
    totalFloors: summary?.totalFloors ?? facilities.reduce(
      (sum, facility) => sum + (facility.floorCount || facility.floors?.length || 0),
      0,
    ),
    totalRooms: summary?.totalRooms ?? facilities.reduce(
      (sum, facility) => sum + (facility.roomCount || 0),
      0,
    ),
    vacancyRate: summary?.vacancyRate ?? 0,
  }), [facilities, summary]);

  return {
    facilities,
    stats,
    isLoading,
    error,
    retry,
    formState,
    statusFlow,
    isStatusSubmitting,
    toasts,
    dismissToast,
    pushToast,
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormValue,
    submitForm,
    requestStatusChange,
    setStatusAcknowledged,
    closeStatusFlow,
    confirmStatusChange,
    updateFacilityFloors,
    setNetworkFailure: () => {},
    networkFailure: false,
    availableStatuses: Object.values(FACILITY_STATUS),
  };
}




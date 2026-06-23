"use client";

import { useCallback, useMemo, useState } from "react";
import {
  createFacility as createFacilityRequest,
  updateFacility as updateFacilityRequest,
  updateFacilityStatus as updateFacilityStatusRequest,
} from "@/services/facilityService";
import {
  FACILITY_STATUS,
  initialFacilities,
} from "../_data/mockFacilities";

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

export function useFacilityManagement() {
  const [facilities, setFacilities] = useState(initialFacilities);
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
  const [networkFailure, setNetworkFailure] = useState(false);
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
        status: facility.status || "hehe",
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
      status: formState.values.status,
    };

    setFormState((current) => ({ ...current, isSubmitting: true }));

    try {
      if (formState.mode === "create") {
        const created = await createFacilityRequest(payload, {
          shouldFail: networkFailure,
        });
        setFacilities((current) => [...current, created]);
        pushToast("Đã thêm cơ sở mới");
      } else {
        const updated = await updateFacilityRequest(
          formState.editingId,
          payload,
          { shouldFail: networkFailure },
        );
        setFacilities((current) =>
          current.map((facility) =>
            facility.id === formState.editingId
              ? { ...facility, ...updated }
              : facility,
          ),
        );
        pushToast("Đã cập nhật thông tin cơ sở");
      }

      setFormState((current) => ({
        ...current,
        isOpen: false,
        isSubmitting: false,
      }));
    } catch {
      setFormState((current) => ({ ...current, isSubmitting: false }));
      pushToast("Mất kết nối, vui lòng thử lại", "error");
    }
  }, [facilities, formState, networkFailure, pushToast]);

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
      const result = await updateFacilityStatusRequest(
        statusFlow.facility.id,
        statusFlow.nextStatus,
        { shouldFail: networkFailure },
      );
      setFacilities((current) =>
        current.map((facility) =>
          facility.id === result.id
            ? { ...facility, status: result.status }
            : facility,
        ),
      );
      setStatusFlow(null);
      pushToast("Đã cập nhật trạng thái cơ sở");
    } catch {
      pushToast("Mất kết nối, vui lòng thử lại", "error");
    } finally {
      setIsStatusSubmitting(false);
    }
  }, [networkFailure, pushToast, statusFlow]);

  const updateFacilityFloors = useCallback((facilityId, updatedFloors) => {
    setFacilities((current) =>
      current.map((facility) =>
        facility.id === facilityId
          ? { ...facility, floors: updatedFloors }
          : facility
      )
    );
  }, []);

  const stats = useMemo(() => {
    const rooms = facilities.flatMap((facility) =>
      facility.floors.flatMap((floor) => floor.rooms),
    );
    const vacantRooms = rooms.filter((room) => room.status === "VACANT").length;

    return {
      totalFacilities: facilities.length,
      activeFacilities: facilities.filter(
        (facility) => facility.status === FACILITY_STATUS.ACTIVE,
      ).length,
      totalFloors: facilities.reduce(
        (sum, facility) => sum + facility.floors.length,
        0,
      ),
      totalRooms: rooms.length,
      vacancyRate: rooms.length
        ? Math.round((vacantRooms / rooms.length) * 100)
        : 0,
    };
  }, [facilities]);

  return {
    facilities,
    stats,
    formState,
    statusFlow,
    isStatusSubmitting,
    networkFailure,
    toasts,
    setNetworkFailure,
    dismissToast,
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
    pushToast
  };
}

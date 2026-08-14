"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Gauge,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ASSET_CONDITION_VALUES,
  fetchRoomAssets,
  normalizeAsset,
} from "@/services/roomAssetsService";
import {
  submitHandover,
  fetchContractHandover,
  fetchLatestReadings,
  uploadFile,
} from "@/services/contractHandoverService";
import {
  createEmptyHandoverAsset,
  createDefaultHandoverAssets,
  getPersistedAssetIds,
  mergeHandoverAssets,
  withAssetRowKeys,
} from "./contractHandoverAssets";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Hoạt động bình thường" },
  { value: "ATTENTION", label: "Có trầy xước nhẹ" },
  { value: "BROKEN", label: "Hỏng cần sửa" },
  { value: "MISSING", label: "Thiếu thiết bị" },
];

const CONFIRMED_STATUSES = new Set(["CONFIRMED", "CONFIRMED_BY_TENANT"]);

function defaultDescription(roomCode) {
  return `Ghi nhận chỉ số ban đầu và hiện trạng thiết bị của phòng ${roomCode || "chưa cập nhật"}.`;
}

function meterReadingLabel(handoverType) {
  if (handoverType === "TRANSFER_OUT") return "Chỉ số chốt";
  if (handoverType === "TRANSFER_IN") return "Chỉ số nhận phòng";
  return "Chỉ số ban đầu";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function apiAssetToRow(raw) {
  const a = normalizeAsset(raw);
  return {
    id: a.id,
    assetName: a.assetName,
    assetCategory: a.assetCategory,
    quantity: a.quantity,
    currentCondition: a.currentCondition,   // keep as enum value
    description: a.description,
    fileImageId: a.fileImageId,
    compensationAmount: a.compensationAmount ?? 0,
    damageNote: a.damageNote ?? "",
    evidenceFileId: a.evidenceFileId ?? null,
    evidenceImageFile: null,
    evidenceImageUrl: raw.evidenceFileUrl ?? raw.evidence_file_url ?? "",
    imageFile: null,
    imageUrl:
      raw.fileImageUrl ?? raw.file_image_url ?? raw.imageUrl ?? raw.image_url ?? "",
  };
}

function ImageUploadButton({ imageUrl, fileId, label, disabled, onChange }) {
  const hasImage = Boolean(imageUrl || fileId);
  return (
    <div className="flex flex-col gap-2">
      <label
        className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#cbd5e1] dark:border-white/10 px-3 text-xs font-bold ${disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "cursor-pointer text-slate-500 dark:text-slate-400 hover:border-[#1e40af] hover:bg-[#f8fafc] dark:hover:bg-white/5"
          }`}
      >
        <Camera className="h-3.5 w-3.5 shrink-0" />
        {imageUrl ? "Đổi ảnh" : label}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          className="hidden"
          onChange={onChange}
        />
      </label>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt="Ảnh chỉ số"
          width={100}
          height={70}
          unoptimized
          className="h-16 w-full rounded-lg border border-[#dfe5ef] dark:border-white/10 object-cover"
        />
      )}
      {!imageUrl && fileId && (
        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
          Đã có ảnh minh chứng
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ContractHandoverSection({
  contractId,
  roomId,
  roomCode,
  readonly = false,
  handoverType = "MOVE_IN",
  title = "Bàn giao phòng",
  description,
  showAssets = true,
  showCompensation = false,
  hideSaveButton = false,
  confirmOnSave = true,
  actionRef,
  onLoaded,
  onSaved,
}) {
  /* meter readings -------------------------------------------------- */
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [electricReading, setElectricReading] = useState("");
  const [electricReadingDate, setElectricReadingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [electricImageFile, setElectricImageFile] = useState(null);
  const [electricImageUrl, setElectricImageUrl] = useState("");
  const [electricPhotoFileId, setElectricPhotoFileId] = useState(null);

  /* assets ---------------------------------------------------------- */
  const [assets, setAssets] = useState(() =>
    withAssetRowKeys(createDefaultHandoverAssets(), "default"),
  );
  const [removedAssets, setRemovedAssets] = useState([]);
  const [latestNewAssetKey, setLatestNewAssetKey] = useState(null);
  const [fromApi, setFromApi] = useState(false);   // true once loaded from backend
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadError, setLoadError] = useState(null);

  /* save ------------------------------------------------------------ */
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);

  const previewUrlsRef = useRef(new Set());
  const newAssetInputRef = useRef(null);
  const newAssetSequenceRef = useRef(0);
  const effectiveReadonly = readonly || isConfirmed;
  const assetEditingDisabled = effectiveReadonly || saving || loadingAssets;
  const readingLabel = meterReadingLabel(handoverType);
  const requiresElectricity = handoverType !== "MOVE_IN";

  /* Fetch assets from API ------------------------------------------- */
  const loadAssets = useCallback((signal) => {
    if (!roomId) {
      console.warn("[ContractHandoverSection] roomId is null — skipping fetch");
      return;
    }
    setLoadingAssets(true);
    setLoadError(null);
    setSaveSuccess(false);

    console.log("[ContractHandoverSection] fetching assets for roomId:", roomId);

    fetchRoomAssets(roomId)
      .then((data) => {
        if (signal?.aborted) return;
        console.log("[ContractHandoverSection] API response:", data);
        if (Array.isArray(data) && data.length > 0) {
          setAssets(
            withAssetRowKeys(
              mergeHandoverAssets(data.map(apiAssetToRow)),
              `room-${roomId}`,
            ),
          );
          setFromApi(true);
        } else {
          setAssets(
            withAssetRowKeys(createDefaultHandoverAssets(), `room-${roomId}`),
          );
          setFromApi(false);
        }
        setRemovedAssets([]);
        setLatestNewAssetKey(null);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        console.error("[ContractHandoverSection] fetch error:", err);
        setLoadError(err?.message ?? "Không tải được danh sách thiết bị.");
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingAssets(false);
      });
  }, [roomId]);

  useEffect(() => {
    if (!showAssets) return undefined;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets, showAssets]);

  /* Fetch latest meter readings ------------------------------------- */
  const loadReadings = useCallback((signal) => {
    if (!roomId) return;
    fetchLatestReadings(roomId)
      .then((data) => {
        if (signal?.aborted) return;

        const elec = data?.electricity || {};
        const elecValue = elec.suggested_value ?? elec.suggestedValue;
        const elecDate = elec.last_reading_date ?? elec.lastReadingDate;

        setElectricReading(prev => prev === "" ? String(elecValue ?? 0) : prev);
        if (elecDate) setElectricReadingDate(prev => prev === new Date().toISOString().split("T")[0] ? elecDate : prev);

      })
      .catch((err) => {
        if (signal?.aborted) return;
        setElectricReading(prev => prev === "" ? "0" : prev);
        console.warn(
          "Không tải được chỉ số điện gần nhất; vẫn có thể nhập bàn giao thủ công.",
          err?.message ?? "Unknown error",
        );
      });
  }, [roomId]);

  useEffect(() => {
    if (readonly) return;
    const controller = new AbortController();

    // If contractId is provided, fetch handover record first
    if (contractId) {
      fetchContractHandover(contractId, handoverType)
          .then((data) => {
            if (controller.signal.aborted) return;
            if (data) {
              const status = data.status;
              setIsConfirmed(CONFIRMED_STATUSES.has(status));

              const hDate = data.handover_date || data.handoverDate;
              if (hDate) setHandoverDate(hDate.split("T")[0]);
              
              if (requiresElectricity) {
                const elecValue = data.electricity?.current_value ?? data.electricity?.currentValue;
                setElectricReading(prev => elecValue != null ? String(elecValue) : (prev === "" ? "0" : prev));
                setElectricPhotoFileId(data.electricity?.photoFileId ?? data.electricity?.photo_file_id ?? null);
              }
              if (data.note) setNote(data.note);
              if (showCompensation && Array.isArray(data.items) && data.items.length > 0) {
                setAssets(
                  withAssetRowKeys(
                    data.items.map((item) => ({
                      id: item.id,
                      assetName: item.assetName ?? "",
                      assetCategory: "Thiết bị",
                      quantity: item.quantity ?? 1,
                      currentCondition: item.conditionStatus ?? "GOOD",
                      description: item.note ?? "",
                      compensationAmount: item.compensationAmount ?? 0,
                      damageNote: item.note ?? "",
                      evidenceFileId: item.evidenceFileId ?? null,
                      evidenceImageFile: null,
                      evidenceImageUrl: item.evidenceFileUrl ?? "",
                      imageUrl: "",
                    })),
                    `handover-${contractId}-${handoverType}`,
                  ),
                );
                setFromApi(true);
              }
              onLoaded?.(data);
            } else {
              setIsConfirmed(false);
              onLoaded?.(null);
              if (requiresElectricity && electricReading === "") loadReadings(controller.signal);
            }
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            onLoaded?.(null);
            if (requiresElectricity && electricReading === "") loadReadings(controller.signal);
          });
    } else {
      onLoaded?.(null);
      if (requiresElectricity && electricReading === "") loadReadings(controller.signal);
    }

    return () => controller.abort();
  }, [loadReadings, readonly, contractId, handoverType, onLoaded, electricReading, showCompensation, requiresElectricity]);

  /* Cleanup blob URLs ----------------------------------------------- */
  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  /* Helpers --------------------------------------------------------- */
  const makeBlobUrl = useCallback((file) => {
    if (!(previewUrlsRef.current instanceof Set)) {
      previewUrlsRef.current = new Set();
    }
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  }, []);

  const handleMeterImage = useCallback((file) => {
    if (!file) return;
    const url = makeBlobUrl(file);
    if (electricImageUrl) URL.revokeObjectURL(electricImageUrl);
    setElectricImageFile(file);
    setElectricImageUrl(url);
    setElectricPhotoFileId(null);
  }, [electricImageUrl, makeBlobUrl]);

  const updateAsset = useCallback((index, field, value) => {
    setSaveSuccess(false);
    setAssets((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  }, []);

  function handleAddAsset() {
    if (assetEditingDisabled) return;

    const clientKey = `added-${newAssetSequenceRef.current++}`;
    setLatestNewAssetKey(clientKey);
    setSaveSuccess(false);
    setAssets((prev) => [
      ...prev,
      { ...createEmptyHandoverAsset(), _clientKey: clientKey },
    ]);

    window.requestAnimationFrame(() => {
      newAssetInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      newAssetInputRef.current?.focus({ preventScroll: true });
    });
  }

  function handleRemoveAsset(index) {
    if (assetEditingDisabled) return;

    const removed = assets[index];
    if (!removed) return;
    setSaveSuccess(false);
    setAssets((prev) => prev.filter((_, assetIndex) => assetIndex !== index));
    setRemovedAssets((prev) => [...prev, { asset: removed, index }]);
  }

  function handleUndoRemove() {
    const removed = removedAssets.at(-1);
    if (!removed || assetEditingDisabled) return;

    setSaveSuccess(false);
    setAssets((prev) => {
      const restored = [...prev];
      restored.splice(Math.min(removed.index, restored.length), 0, removed.asset);
      return restored;
    });
    setRemovedAssets((prev) => prev.slice(0, -1));
  }

  function handleAssetImageChange(index, file) {
    if (!file) return;
    const url = makeBlobUrl(file);
    setAssets((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (a.imageUrl) {
          URL.revokeObjectURL(a.imageUrl);
          previewUrlsRef.current?.delete(a.imageUrl);
        }
        return { ...a, imageFile: file, imageUrl: url };
      }),
    );
  }

  function handleAssetEvidenceImageChange(index, file) {
    if (!file) return;
    const url = makeBlobUrl(file);
    setAssets((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (a.evidenceImageUrl) {
          URL.revokeObjectURL(a.evidenceImageUrl);
          previewUrlsRef.current?.delete(a.evidenceImageUrl);
        }
        return {
          ...a,
          evidenceImageFile: file,
          evidenceImageUrl: url,
          evidenceFileId: null,
        };
      }),
    );
  }

  const isValid =
    Boolean(contractId && handoverDate) &&
    (!requiresElectricity || (
      electricReading !== "" &&
      Number.isFinite(Number(electricReading)) && Number(electricReading) >= 0
    )) &&
    (!showAssets || assets.every((a) =>
      a.assetName.trim() &&
      a.assetCategory.trim() &&
      Number.isInteger(Number(a.quantity)) &&
      Number(a.quantity) >= 0 &&
      (!showCompensation ||
        (Number.isFinite(Number(a.compensationAmount ?? 0)) &&
          Number(a.compensationAmount ?? 0) >= 0))
    ));

  function validateBeforeSave() {
    if (!isValid) {
      toast.error(showAssets
        ? requiresElectricity
          ? "Vui lòng nhập đủ ngày bàn giao, chỉ số điện và thông tin thiết bị."
          : "Vui lòng nhập đủ ngày bàn giao và thông tin thiết bị."
        : requiresElectricity
          ? "Vui lòng nhập đủ ngày bàn giao và chỉ số điện."
          : "Vui lòng nhập đủ ngày bàn giao."
      );
      return false;
    }
    return true;
  }

  function requestSave() {
    if (effectiveReadonly || saving || !validateBeforeSave()) return;
    if (!confirmOnSave) {
      void handleSave();
      return;
    }
    setSaveConfirmationOpen(true);
  }

  /* Save — single atomic call via /handover/submit ----------------- */
  async function handleSave() {
    if (effectiveReadonly) return true;
    if (saving || !validateBeforeSave()) return false;

    setSaveConfirmationOpen(false);

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Upload meter photos
      let electricPhotoId = requiresElectricity ? electricPhotoFileId : null;
      if (requiresElectricity && electricImageFile) {
        const res = await uploadFile(electricImageFile, "METER_PHOTO");
        electricPhotoId = res?.fileId || res?.id;
      }

      // 2. Upload new asset images
      const assetPayloadGroups = showAssets ? await Promise.all(
        assets.map(async (asset) => {
          let assetImageId = null;
          if (asset.imageFile) {
            const res = await uploadFile(asset.imageFile, "ROOM_IMAGE");
            assetImageId = res?.fileId || res?.id;
          } else if (asset.fileImageId) {
            assetImageId = asset.fileImageId;
          }
          let evidenceFileId = asset.evidenceFileId ?? null;
          if (showCompensation && asset.evidenceImageFile) {
            const res = await uploadFile(asset.evidenceImageFile, "ROOM_IMAGE");
            evidenceFileId = res?.fileId || res?.id;
          }

          const currentCondition =
            ASSET_CONDITION_VALUES[asset.currentCondition] ??
            asset.currentCondition ??
            "GOOD";
          const primaryPayload = {
            id: asset.id ?? undefined,
            assetName: asset.assetName.trim(),
            assetCategory: asset.assetCategory.trim(),
            quantity: Number(asset.quantity),
            currentCondition,
            description: asset.description?.trim() ?? "",
            fileImageId: assetImageId,
            compensationAmount: showCompensation ? Number(asset.compensationAmount || 0) : undefined,
            damageNote: showCompensation ? asset.damageNote?.trim() ?? "" : undefined,
            evidenceFileId: showCompensation ? evidenceFileId ?? undefined : undefined,
          };

          // A canonical UI row can represent legacy split records such as
          // "Điều hòa" and "Remote điều hòa". Keep those hidden records in
          // sync so a reload does not restore an obsolete condition.
          const secondaryPayloads = (asset.sourceAssets ?? [])
            .filter(
              (source) =>
                source.id != null && String(source.id) !== String(asset.id),
            )
            .map((source) => ({
              id: source.id,
              assetName: source.assetName.trim(),
              assetCategory:
                source.assetCategory?.trim() || asset.assetCategory.trim(),
              quantity: Number(asset.quantity),
              currentCondition,
              description: source.description?.trim() ?? "",
              fileImageId: source.fileImageId ?? undefined,
              compensationAmount: 0,
            }));

          return [primaryPayload, ...secondaryPayloads];
        }),
      ) : [];
      const assetPayloads = assetPayloadGroups.flat();
      const deletedAssetIds = showAssets ? [
        ...new Set(
          removedAssets.flatMap(({ asset }) => getPersistedAssetIds(asset)),
        ),
      ] : [];

      // 3. Single atomic submit: readings + assets + confirm
      const response = await submitHandover(contractId, {
        handoverType,
        handoverDate: handoverDate || new Date().toISOString().split("T")[0],
        note: note.trim(),
        ...(requiresElectricity ? {
          electricity: {
            currentValue: Number(electricReading),
            photoFileId: electricPhotoId,
            readingDate: electricReadingDate || undefined,
          },
        } : {}),
        assets: showAssets ? assetPayloads : undefined,
        deletedAssetIds,
      });

      // Update local asset IDs from response
      setFromApi(true);
      setRemovedAssets([]);
      setSaveSuccess(true);
      setIsConfirmed(true);
      setElectricPhotoFileId(electricPhotoId ?? null);
      onSaved?.(response || {status: "CONFIRMED", handoverType});
      return true;
    } catch (err) {
      setSaveError(err?.message ?? "Lưu thông tin thất bại.");
      toast.error(err?.message ?? "Lưu thông tin thất bại.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(actionRef, () => ({
    save: handleSave,
  }));

  /* ----------------------------------------------------------------- */
  /*  Render                                                            */
  /* ----------------------------------------------------------------- */
  return (
    <section id="handover-entry-section" className="rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-[#fbfbfe] dark:bg-white/5 p-4 lg:col-span-2 xl:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white xl:text-xl">
            <Gauge className="h-5 w-5" />
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 xl:text-sm">
            {description || defaultDescription(roomCode)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!roomId && (
            <span className="rounded-full border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-yellow-300">
              Chưa xác định phòng
            </span>
          )}
          {readonly && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Chỉ xem
            </span>
          )}
          {isConfirmed && !readonly && (
            <span className="rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Đã xác nhận bàn giao
            </span>
          )}
        </div>
      </div>

      {/* Handover Date */}
      <div className="mt-5 rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
        <label className="grid gap-1.5 max-w-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Ngày bàn giao
            <span className="ml-1 text-rose-600 dark:text-rose-300">*</span>
          </span>

          <input
            type="date"
            value={handoverDate}
            disabled={effectiveReadonly || saving}
            onChange={(e) => setHandoverDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-slate-100 px-3 text-sm font-semibold outline-none focus:border-[#1e40af] disabled:opacity-70"
          />
        </label>
      </div>

      {/* Meter Readings */}
      {requiresElectricity && <div className="mt-4 max-w-xl">
        {/* Electric Card */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
          <h4 className="font-extrabold text-slate-900 dark:text-white">Đồng hồ điện</h4>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">{readingLabel} (kWh) *</span>
            <input
              type="number"
              min="0"
              value={electricReading}
              disabled={effectiveReadonly}
              onChange={(e) => setElectricReading(e.target.value)}
              placeholder="VD: 1234"
              className="h-10 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold outline-none focus:border-[#1e40af] disabled:bg-slate-100"
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">Ngày chốt chỉ số *</span>
            <input
              type="date"
              value={electricReadingDate}
              disabled={effectiveReadonly}
              onChange={(e) => setElectricReadingDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold outline-none focus:border-[#1e40af] disabled:bg-slate-100"
            />
          </div>

          <div className="mt-1">
            <ImageUploadButton
              imageUrl={electricImageUrl}
              fileId={electricPhotoFileId}
              label="Upload ảnh bằng chứng điện"
              disabled={effectiveReadonly}
              onChange={(e) => handleMeterImage("electric", e.target.files?.[0])}
            />
          </div>
        </div>

      </div>}

      {/* Assets Table */}
      {showAssets && (
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfe5ef] dark:border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-extrabold text-slate-900 dark:text-white">Hiện trạng thiết bị</h4>
            {fromApi && (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Từ hệ thống
              </span>
            )}
            {!fromApi && !loadingAssets && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Mẫu mặc định
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!effectiveReadonly && (
              <button
                type="button"
                onClick={handleAddAsset}
                disabled={assetEditingDisabled}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1e40af] px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm thiết bị
              </button>
            )}
            {loadingAssets && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải…
              </span>
            )}
          </div>
        </div>

        {loadError && (
          <div className="border-b border-red-100 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 px-4 py-2 text-sm font-semibold text-red-700 dark:text-rose-300">
            {loadError}
          </div>
        )}

        {removedAssets.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <span>
              Đã bỏ{" "}
              <strong>
                {removedAssets.at(-1).asset.assetName || "thiết bị chưa đặt tên"}
              </strong>{" "}
              khỏi danh sách.
              {removedAssets.length > 1 &&
                ` Có ${removedAssets.length} thiết bị đang chờ xóa.`}
              {" "}Thay đổi sẽ được áp dụng khi lưu bàn giao.
            </span>
            <button
              type="button"
              onClick={handleUndoRemove}
              disabled={assetEditingDisabled}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 font-extrabold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Hoàn tác
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className={`w-full ${showCompensation ? "min-w-[1380px]" : "min-w-[980px]"} text-left text-xs xl:text-sm`}>
            <thead className="bg-[#f7f9fe] dark:bg-white/5 text-[10px] font-extrabold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 xl:text-xs">
              <tr>
                <th className="w-10 px-3 py-3">STT</th>
                <th className="min-w-52 px-3 py-3">Tên thiết bị</th>
                <th className="min-w-36 px-3 py-3">Danh mục</th>
                <th className="w-20 px-3 py-3">SL</th>
                <th className="min-w-44 px-3 py-3">Tình trạng</th>
                <th className="min-w-44 px-3 py-3">Mô tả</th>
                <th className="w-32 px-3 py-3">Ảnh</th>
                {showCompensation && (
                  <>
                    <th className="w-40 px-3 py-3">Bồi thường</th>
                    <th className="min-w-56 px-3 py-3">Thiệt hại</th>
                  </>
                )}
                {showCompensation && (
                  <th className="w-36 px-3 py-3">Minh chứng</th>
                )}
                {!effectiveReadonly && (
                  <th className="w-20 px-3 py-3 text-center">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {assets.map((asset, index) => (
                <tr key={asset._clientKey} className="hover:bg-[#fafbff] dark:hover:bg-white/5">
                  <td className="px-3 py-2.5 font-bold text-slate-500 dark:text-slate-400">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <input
                      ref={asset._clientKey === latestNewAssetKey ? newAssetInputRef : null}
                      value={asset.assetName}
                      disabled={assetEditingDisabled}
                      onChange={(e) => updateAsset(index, "assetName", e.target.value)}
                      placeholder="Nhập tên thiết bị"
                      aria-label={`Tên thiết bị dòng ${index + 1}`}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2.5 font-semibold outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={asset.assetCategory}
                      disabled={assetEditingDisabled}
                      onChange={(e) => updateAsset(index, "assetCategory", e.target.value)}
                      placeholder="Nhập danh mục"
                      aria-label={`Danh mục thiết bị dòng ${index + 1}`}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2 outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={asset.quantity}
                      disabled={assetEditingDisabled}
                      onChange={(e) => updateAsset(index, "quantity", e.target.value)}
                      aria-label={`Số lượng thiết bị dòng ${index + 1}`}
                      className="h-9 w-full appearance-none rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2 outline-none [appearance:textfield] focus:border-[#1e40af] disabled:bg-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={asset.currentCondition}
                      disabled={assetEditingDisabled}
                      onChange={(e) => updateAsset(index, "currentCondition", e.target.value)}
                      aria-label={`Tình trạng thiết bị dòng ${index + 1}`}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-2 outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                    >
                      {CONDITION_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={asset.description}
                      disabled={assetEditingDisabled}
                      onChange={(e) => updateAsset(index, "description", e.target.value)}
                      placeholder="Chưa cập nhật"
                      aria-label={`Mô tả thiết bị dòng ${index + 1}`}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2.5 outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <label
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2 text-[11px] font-bold ${assetEditingDisabled
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-white/5"
                        }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {asset.imageUrl ? "Đổi" : "Thêm"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={assetEditingDisabled}
                        className="hidden"
                        onChange={(e) => handleAssetImageChange(index, e.target.files?.[0])}
                      />
                    </label>
                    {asset.imageUrl && (
                      <Image
                        src={asset.imageUrl}
                        alt={`Ảnh ${asset.assetName}`}
                        width={80}
                        height={56}
                        unoptimized
                        className="mt-1.5 h-12 w-20 rounded-lg border border-[#dfe5ef] dark:border-white/10 object-cover"
                      />
                    )}
                  </td>
                  {showCompensation && (
                    <>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          inputMode="numeric"
                          value={asset.compensationAmount ?? 0}
                          disabled={assetEditingDisabled}
                          onChange={(e) => updateAsset(index, "compensationAmount", e.target.value)}
                          aria-label={`Bồi thường thiết bị dòng ${index + 1}`}
                          className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2.5 font-semibold outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={asset.damageNote ?? ""}
                          disabled={assetEditingDisabled}
                          onChange={(e) => updateAsset(index, "damageNote", e.target.value)}
                          placeholder="Ghi chú thiệt hại"
                          aria-label={`Ghi chú thiệt hại dòng ${index + 1}`}
                          className="h-9 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 px-2.5 outline-none focus:border-[#1e40af] disabled:bg-slate-100"
                        />
                      </td>
                    </>
                  )}
                  {showCompensation && (
                    <td className="px-3 py-2.5">
                      <ImageUploadButton
                        imageUrl={asset.evidenceImageUrl}
                        fileId={asset.evidenceFileId}
                        label="Upload ảnh minh chứng"
                        disabled={assetEditingDisabled}
                        onChange={(e) => handleAssetEvidenceImageChange(index, e.target.files?.[0])}
                      />
                    </td>
                  )}
                  {!effectiveReadonly && (
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(index)}
                        disabled={assetEditingDisabled}
                        aria-label={`Xóa ${
                          asset.assetName || `thiết bị dòng ${index + 1}`
                        }`}
                        title="Xóa khỏi danh sách bàn giao"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td
                    colSpan={(effectiveReadonly ? 7 : 8) + (showCompensation ? 3 : 0)}
                    className="px-4 py-10 text-center"
                  >
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      Chưa có thiết bị bàn giao
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Thêm thiết bị thực tế có trong phòng để hoàn thiện biên bản.
                    </p>
                    {!effectiveReadonly && (
                      <button
                        type="button"
                        onClick={handleAddAsset}
                        disabled={assetEditingDisabled}
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1e40af] px-3 text-xs font-extrabold text-[#1e40af] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm thiết bị đầu tiên
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Note */}
      <label className="mt-4 grid gap-1.5">
        <span className="text-xs font-bold text-[#58667c]">Ghi chú bàn giao</span>
        <textarea
          value={note}
          disabled={effectiveReadonly}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Chưa cập nhật"
          className="w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] p-3 text-sm outline-none focus:border-[#1e40af] disabled:bg-slate-100"
        />
      </label>

      {/* Feedback */}
      {saveError && (
        <div className="mt-3 rounded-lg border border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-rose-300">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✓ Đã lưu bàn giao thành công.
        </div>
      )}

      {/* Save button */}
      {!hideSaveButton && !effectiveReadonly && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={requestSave}
            disabled={saving || loadingAssets}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-extrabold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Đang lưu…" : "Lưu bàn giao"}
          </button>
        </div>
      )}

      <Dialog
        open={saveConfirmationOpen}
        onOpenChange={(open) => {
          if (!saving) setSaveConfirmationOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={!saving}
          className="overflow-hidden border-0 bg-white p-0 shadow-2xl dark:bg-[#0f172a]"
        >
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-5 dark:border-amber-500/20 dark:bg-amber-500/10">
            <DialogHeader className="pr-8">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="pt-0.5">
                  <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Xác nhận lưu bàn giao
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6">
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              Sau khi xác nhận lưu, dữ liệu bàn giao sẽ được chốt và không thể chỉnh sửa.
            </p>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setSaveConfirmationOpen(false)}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-extrabold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận lưu
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

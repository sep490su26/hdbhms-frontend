"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Gauge, Loader2, RefreshCw, Save } from "lucide-react";
import Image from "next/image";
import {
  ASSET_CONDITION_VALUES,
  fetchRoomAssets,
  normalizeAsset,
} from "@/services/roomAssetsService";
import {
  submitHandover,
  fetchLatestReadings,
  uploadFile,
} from "@/services/contractHandoverService";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const HANDOVER_ASSET_TEMPLATE = [
  ["Điều hòa + Remote", "Thiết bị điện tử", "GOOD", ""],
  ["Thiết bị vệ sinh + phòng tắm", "Thiết bị vệ sinh", "GOOD", "Xí, vòi xịt, vòi sen, lavabo, gương, phụ kiện"],
  ["Bình nóng lạnh", "Thiết bị điện tử", "GOOD", ""],
  ["Tủ quần áo 3 buồng", "Nội thất", "GOOD", ""],
  ["Bàn học", "Nội thất", "GOOD", ""],
  ["Giường đôi/tầng + Dát giường", "Nội thất", "GOOD", ""],
  ["Cửa đi + cửa sổ", "Cơ sở hạ tầng", "GOOD", ""],
  ["Modem Internet", "Thiết bị điện tử", "GOOD", ""],
  ["Hệ thống điện: công tắc, ổ cắm, bóng điện", "Cơ sở hạ tầng", "GOOD", ""],
].map(([assetName, assetCategory, currentCondition, description]) => ({
  id: null,
  assetName,
  assetCategory,
  quantity: 1,
  currentCondition,
  description,
  imageFile: null,
  imageUrl: "",
}));

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Hoạt động bình thường" },
  { value: "ATTENTION", label: "Có trầy xước nhẹ" },
  { value: "BROKEN", label: "Hỏng cần sửa" },
  { value: "MISSING", label: "Thiếu thiết bị" },
];

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
    imageFile: null,
    imageUrl: "",
  };
}

function ImageUploadButton({ imageUrl, label, disabled, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label
        className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#cbd5e1] px-3 text-xs font-bold ${disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "cursor-pointer text-[#607089] hover:border-[#091426] hover:bg-[#f8fafc]"
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
          className="h-16 w-full rounded-lg border border-[#dfe5ef] object-cover"
        />
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
  onSaved,
}) {
  /* meter readings -------------------------------------------------- */
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [electricReading, setElectricReading] = useState("");
  const [waterReading, setWaterReading] = useState("");
  const [electricReadingDate, setElectricReadingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [waterReadingDate, setWaterReadingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [electricImageFile, setElectricImageFile] = useState(null);
  const [electricImageUrl, setElectricImageUrl] = useState("");
  const [waterImageFile, setWaterImageFile] = useState(null);
  const [waterImageUrl, setWaterImageUrl] = useState("");

  /* assets ---------------------------------------------------------- */
  const [assets, setAssets] = useState(HANDOVER_ASSET_TEMPLATE);
  const [fromApi, setFromApi] = useState(false);   // true once loaded from backend
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadError, setLoadError] = useState(null);

  /* save ------------------------------------------------------------ */
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const previewUrlsRef = useRef(new Set());

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
          setAssets(data.map(apiAssetToRow));
          setFromApi(true);
        } else {
          // Room exists but no assets saved yet — keep template
          setAssets(HANDOVER_ASSET_TEMPLATE);
          setFromApi(false);
        }
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
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  /* Fetch latest meter readings ------------------------------------- */
  const loadReadings = useCallback((signal) => {
    if (!roomId) return;
    fetchLatestReadings(roomId)
      .then((data) => {
        if (signal?.aborted) return;

        const elec = data?.electricity || {};
        const elecValue = elec.suggested_value ?? elec.suggestedValue;
        const elecDate = elec.last_reading_date ?? elec.lastReadingDate;

        setElectricReading(prev => prev === "" && elecValue != null ? String(elecValue) : prev);
        if (elecDate) setElectricReadingDate(prev => prev === new Date().toISOString().split("T")[0] ? elecDate : prev);

        const wat = data?.water || {};
        const watValue = wat.suggested_value ?? wat.suggestedValue;
        const watDate = wat.last_reading_date ?? wat.lastReadingDate;

        setWaterReading(prev => prev === "" && watValue != null ? String(watValue) : prev);
        if (watDate) setWaterReadingDate(prev => prev === new Date().toISOString().split("T")[0] ? watDate : prev);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        console.error("Failed to fetch latest readings:", err);
      });
  }, [roomId]);

  useEffect(() => {
    if (readonly) return;
    const controller = new AbortController();

    // If contractId is provided, fetch handover record first
    if (contractId) {
      import('@/services/contractHandoverService').then(({ fetchContractHandover }) => {
        fetchContractHandover(contractId, "MOVE_IN")
          .then((data) => {
            if (controller.signal.aborted) return;
            if (data) {
              const hDate = data.handover_date || data.handoverDate;
              if (hDate) setHandoverDate(hDate.split("T")[0]);
              
              const elecValue = data.electricity?.current_value ?? data.electricity?.currentValue;
              if (elecValue != null) {
                setElectricReading(String(elecValue));
              }
              const watValue = data.water?.current_value ?? data.water?.currentValue;
              if (watValue != null) {
                setWaterReading(String(watValue));
              }
              if (data.note) setNote(data.note);
            } else {
              if (electricReading === "" && waterReading === "") loadReadings(controller.signal);
            }
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            if (electricReading === "" && waterReading === "") loadReadings(controller.signal);
          });
      });
    } else {
      if (electricReading === "" && waterReading === "") loadReadings(controller.signal);
    }

    return () => controller.abort();
  }, [loadReadings, readonly, contractId]);

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

  const handleMeterImage = useCallback((type, file) => {
    if (!file) return;
    const url = makeBlobUrl(file);
    if (type === "electric") {
      if (electricImageUrl) URL.revokeObjectURL(electricImageUrl);
      setElectricImageFile(file);
      setElectricImageUrl(url);
    } else {
      if (waterImageUrl) URL.revokeObjectURL(waterImageUrl);
      setWaterImageFile(file);
      setWaterImageUrl(url);
    }
  }, [electricImageUrl, waterImageUrl, makeBlobUrl]);

  const updateAsset = useCallback((index, field, value) => {
    setSaveSuccess(false);
    setAssets((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  }, []);

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

  const isValid =
    Boolean(contractId && handoverDate) &&
    electricReading !== "" &&
    waterReading !== "" &&
    Number.isFinite(Number(electricReading)) && Number(electricReading) >= 0 &&
    Number.isFinite(Number(waterReading)) && Number(waterReading) >= 0 &&
    assets.every((a) => a.assetName.trim() && a.assetCategory.trim() && Number(a.quantity) > 0);

  /* Save — single atomic call via /handover/submit ----------------- */
  async function handleSave() {
    if (!isValid) {
      window.alert("Vui lòng nhập đủ ngày bàn giao, chỉ số điện/nước và thông tin thiết bị.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Upload meter photos
      let electricPhotoId = null;
      let waterPhotoId = null;
      if (electricImageFile) {
        const res = await uploadFile(electricImageFile, "METER_PHOTO");
        electricPhotoId = res?.id;
      }
      if (waterImageFile) {
        const res = await uploadFile(waterImageFile, "METER_PHOTO");
        waterPhotoId = res?.id;
      }

      // 2. Upload new asset images
      const assetPayloads = await Promise.all(
        assets.map(async (asset) => {
          let assetImageId = null;
          if (asset.imageFile) {
            const res = await uploadFile(asset.imageFile, "ROOM_IMAGE");
            assetImageId = res?.id;
          } else if (asset.imageUrl && asset.fileImageId) {
            assetImageId = asset.fileImageId;
          }
          return {
            id: asset.id ?? undefined,
            assetName: asset.assetName.trim(),
            assetCategory: asset.assetCategory.trim(),
            quantity: Number(asset.quantity),
            currentCondition:
              ASSET_CONDITION_VALUES[asset.currentCondition] ?? asset.currentCondition ?? "GOOD",
            description: asset.description?.trim() ?? "",
            fileImageId: assetImageId,
          };
        }),
      );

      // 3. Single atomic submit: readings + assets + confirm
      await submitHandover(contractId, {
        handoverType: "MOVE_IN",
        handoverDate: handoverDate || new Date().toISOString().split("T")[0],
        note: note.trim(),
        electricity: {
          currentValue: (electricReading != null && electricReading !== "" && !isNaN(Number(electricReading))) ? Number(electricReading) : 0,
          photoFileId: electricPhotoId,
          readingDate: electricReadingDate || undefined,
        },
        water: {
          currentValue: (waterReading != null && waterReading !== "" && !isNaN(Number(waterReading))) ? Number(waterReading) : 0,
          photoFileId: waterPhotoId,
          readingDate: waterReadingDate || undefined,
        },
        assets: assetPayloads,
      });

      // Update local asset IDs from response
      setFromApi(true);
      setSaveSuccess(true);
      onSaved?.();
    } catch (err) {
      setSaveError(err?.message ?? "Lưu thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------------------------------------------- */
  /*  Render                                                            */
  /* ----------------------------------------------------------------- */
  return (
    <section id="handover-entry-section" className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-4 lg:col-span-2 xl:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#091426] xl:text-xl">
            <Gauge className="h-5 w-5" />
            Bàn giao phòng
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#607089] xl:text-sm">
            Ghi nhận chỉ số ban đầu và hiện trạng thiết bị của phòng{" "}
            {roomCode || "chưa cập nhật"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!roomId && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              Chưa xác định phòng
            </span>
          )}
          {readonly && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Chỉ xem
            </span>
          )}
        </div>
      </div>

      {/* Handover Date */}
      <div className="mt-5 rounded-xl border border-[#dfe5ef] bg-white p-4">
        <label className="grid gap-1.5 max-w-xs">
          <span className="text-xs font-bold text-[#607089]">
            Ngày bàn giao
            <span className="ml-1 text-rose-600">*</span>
          </span>

          <input
            type="date"
            value={handoverDate}
            disabled={true}
            onChange={(e) => setHandoverDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-slate-100 px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:opacity-70"
          />
        </label>
      </div>

      {/* Meter Readings */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Electric Card */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#dfe5ef] bg-white p-4">
          <h4 className="font-extrabold text-[#091426]">Đồng hồ điện</h4>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">Chỉ số ban đầu (kWh) *</span>
            <input
              type="number"
              min="0"
              value={electricReading}
              disabled={readonly}
              onChange={(e) => setElectricReading(e.target.value)}
              placeholder="VD: 1234"
              className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">Ngày chốt chỉ số *</span>
            <input
              type="date"
              value={electricReadingDate}
              disabled={readonly}
              onChange={(e) => setElectricReadingDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
            />
          </div>

          <div className="mt-1">
            <ImageUploadButton
              imageUrl={electricImageUrl}
              label="Chụp ảnh đồng hồ điện"
              disabled={readonly}
              onChange={(e) => handleMeterImage("electric", e.target.files?.[0])}
            />
          </div>
        </div>

        {/* Water Card */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#dfe5ef] bg-white p-4">
          <h4 className="font-extrabold text-[#091426]">Đồng hồ nước</h4>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">Chỉ số ban đầu (m³) *</span>
            <input
              type="number"
              min="0"
              value={waterReading}
              disabled={readonly}
              onChange={(e) => setWaterReading(e.target.value)}
              placeholder="VD: 56"
              className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">Ngày chốt chỉ số *</span>
            <input
              type="date"
              value={waterReadingDate}
              disabled={readonly}
              onChange={(e) => setWaterReadingDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
            />
          </div>

          <div className="mt-1">
            <ImageUploadButton
              imageUrl={waterImageUrl}
              label="Chụp ảnh đồng hồ nước"
              disabled={readonly}
              onChange={(e) => handleMeterImage("water", e.target.files?.[0])}
            />
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe5ef] bg-white">
        <div className="flex items-center justify-between border-b border-[#dfe5ef] px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-[#091426]">Hiện trạng thiết bị</h4>
            {fromApi && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Từ hệ thống
              </span>
            )}
            {!fromApi && !loadingAssets && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Mẫu mặc định
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loadingAssets && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#607089]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải…
              </span>
            )}
            {!loadingAssets && roomId && (
              <button
                type="button"
                onClick={loadAssets}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#607089] hover:bg-[#f3f5f9]"
              >
                <RefreshCw className="h-3 w-3" />
                Tải lại
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs xl:text-sm">
            <thead className="bg-[#f7f9fe] text-[10px] font-extrabold uppercase tracking-[0.03em] text-[#6b7280] xl:text-xs">
              <tr>
                <th className="w-10 px-3 py-3">STT</th>
                <th className="min-w-52 px-3 py-3">Tên thiết bị</th>
                <th className="min-w-36 px-3 py-3">Danh mục</th>
                <th className="w-20 px-3 py-3">SL</th>
                <th className="min-w-44 px-3 py-3">Tình trạng</th>
                <th className="min-w-44 px-3 py-3">Mô tả</th>
                <th className="w-32 px-3 py-3">Ảnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {assets.map((asset, index) => (
                <tr key={asset.id ?? `new-${index}`} className="hover:bg-[#fafbff]">
                  <td className="px-3 py-2.5 font-bold text-[#607089]">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <input
                      value={asset.assetName}
                      disabled={readonly}
                      onChange={(e) => updateAsset(index, "assetName", e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2.5 font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={asset.assetCategory}
                      disabled={readonly}
                      onChange={(e) => updateAsset(index, "assetCategory", e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={asset.quantity}
                      disabled={readonly}
                      onChange={(e) => updateAsset(index, "quantity", e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={asset.currentCondition}
                      disabled={readonly}
                      onChange={(e) => updateAsset(index, "currentCondition", e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
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
                      disabled={readonly}
                      onChange={(e) => updateAsset(index, "description", e.target.value)}
                      placeholder="Chưa cập nhật"
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2.5 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <label
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd5e1] px-2 text-[11px] font-bold ${readonly
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "cursor-pointer hover:bg-[#f8fafc]"
                        }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {asset.imageUrl ? "Đổi" : "Thêm"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={readonly}
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
                        className="mt-1.5 h-12 w-20 rounded-lg border border-[#dfe5ef] object-cover"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <label className="mt-4 grid gap-1.5">
        <span className="text-xs font-bold text-[#58667c]">Ghi chú bàn giao</span>
        <textarea
          value={note}
          disabled={readonly}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Chưa cập nhật"
          className="w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm outline-none focus:border-[#091426] disabled:bg-slate-100"
        />
      </label>

      {/* Feedback */}
      {saveError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
          ✓ Đã lưu hiện trạng thiết bị thành công.
        </div>
      )}

      {/* Save button */}
      {!readonly && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingAssets}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:opacity-60"
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
    </section>
  );
}

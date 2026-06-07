"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Gauge, Save } from "lucide-react";
import Image from "next/image";

const HANDOVER_ASSET_TEMPLATE = [
  ["Điều hòa + Remote", "Bộ", "Hoạt động bình thường", ""],
  ["Thiết bị vệ sinh + phòng tắm", "Bộ", "Hoạt động bình thường", "Xí, vòi xịt, vòi sen, lavabo, gương, phụ kiện"],
  ["Bình nóng lạnh", "Bộ", "Hoạt động bình thường", ""],
  ["Tủ quần áo 3 buồng", "Bộ", "Còn nguyên vẹn", ""],
  ["Bàn học", "Bộ", "Còn nguyên vẹn", ""],
  ["Giường đôi/tầng + Dát giường", "Bộ", "Còn nguyên vẹn", ""],
  ["Cửa đi + cửa sổ", "Bộ", "Hoạt động bình thường", ""],
  ["Modem Internet", "Bộ", "Hoạt động bình thường", ""],
  ["Hệ thống điện: công tắc, ổ cắm, bóng điện", "Bộ", "Hoạt động bình thường", ""],
].map(([name, unit, condition, note]) => ({
  name,
  unit,
  quantity: 1,
  condition,
  note,
  imageFile: null,
  imageUrl: "",
}));

const CONDITION_OPTIONS = [
  "Hoạt động bình thường",
  "Còn nguyên vẹn",
  "Có trầy xước nhẹ",
  "Hỏng cần sửa",
  "Thiếu thiết bị",
];

export default function ContractHandoverSection({ contractId, roomCode, readonly = false }) {
  const [handoverDate, setHandoverDate] = useState("");
  const [electricReading, setElectricReading] = useState("");
  const [waterReading, setWaterReading] = useState("");
  const [assets, setAssets] = useState(HANDOVER_ASSET_TEMPLATE);
  const [note, setNote] = useState("");
  const previewUrlsRef = useRef(new Set());

  useEffect(() => {
    return () => {
      const previewUrls = previewUrlsRef.current;
      if (previewUrls instanceof Set) {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        previewUrls.clear();
      } else if (Array.isArray(previewUrls)) {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, []);

  const isValid = useMemo(() => {
    const electric = Number(electricReading);
    const water = Number(waterReading);
    return (
      Boolean(contractId && handoverDate) &&
      electricReading !== "" &&
      waterReading !== "" &&
      Number.isFinite(electric) &&
      electric >= 0 &&
      Number.isFinite(water) &&
      water >= 0 &&
      assets.every((asset) => asset.name.trim() && asset.unit.trim() && Number(asset.quantity) > 0)
    );
  }, [assets, contractId, electricReading, handoverDate, waterReading]);

  function updateAsset(index, field, value) {
    setAssets((current) =>
      current.map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, [field]: value } : asset,
      ),
    );
  }

  function handleImageChange(index, file) {
    if (!file) return;
    if (!(previewUrlsRef.current instanceof Set)) {
      previewUrlsRef.current = new Set(
        Array.isArray(previewUrlsRef.current)
          ? previewUrlsRef.current.filter(Boolean)
          : [],
      );
    }
    const previewUrls = previewUrlsRef.current;
    const nextImageUrl = URL.createObjectURL(file);
    previewUrls.add(nextImageUrl);
    setAssets((current) =>
      current.map((asset, assetIndex) => {
        if (assetIndex !== index) return asset;
        if (asset.imageUrl) {
          URL.revokeObjectURL(asset.imageUrl);
          previewUrls.delete(asset.imageUrl);
        }
        return { ...asset, imageFile: file, imageUrl: nextImageUrl };
      }),
    );
  }

  function handleSave() {
    if (!isValid) {
      window.alert("Vui lòng nhập đủ ngày bàn giao, chỉ số điện/nước và thông tin thiết bị.");
      return;
    }

    const payload = {
      contractId,
      roomCode: roomCode || null,
      handoverDate,
      meterReadings: [
        { type: "ELECTRIC", source: "HANDOVER", value: Number(electricReading) },
        { type: "WATER", source: "HANDOVER", value: Number(waterReading) },
      ],
      assets: assets.map((asset) => ({
        name: asset.name.trim(),
        unit: asset.unit.trim(),
        quantity: Number(asset.quantity),
        condition: asset.condition,
        note: asset.note.trim(),
        hasImage: Boolean(asset.imageFile),
        image: asset.imageFile
          ? {
              name: asset.imageFile.name,
              type: asset.imageFile.type,
              size: asset.imageFile.size,
            }
          : null,
      })),
      note: note.trim(),
    };

    // TODO: Replace this preview with the handover API when the backend endpoint is available.
    console.log("Contract handover payload:", payload);
    window.alert("Đã tạo payload bàn giao. Dữ liệu hiện được ghi ra console.");
  }

  return (
    <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-4 lg:col-span-2 xl:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#091426] xl:text-xl">
            <Gauge className="h-5 w-5" />
            Bàn giao phòng
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#607089] xl:text-sm">
            Ghi nhận chỉ số ban đầu và hiện trạng thiết bị của phòng {roomCode || "chưa cập nhật"}.
          </p>
        </div>
        {readonly && (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            Chỉ xem
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-[#dfe5ef] bg-white p-4 md:grid-cols-3">
        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-bold text-[#58667c]">Ngày bàn giao *</span>
          <input
            type="date"
            value={handoverDate}
            disabled={readonly}
            onChange={(event) => setHandoverDate(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
          />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-bold text-[#58667c]">Chỉ số điện ban đầu *</span>
          <input
            type="number"
            min="0"
            value={electricReading}
            disabled={readonly}
            onChange={(event) => setElectricReading(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
          />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-bold text-[#58667c]">Chỉ số nước ban đầu *</span>
          <input
            type="number"
            min="0"
            value={waterReading}
            disabled={readonly}
            onChange={(event) => setWaterReading(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe5ef] bg-white">
        <div className="border-b border-[#dfe5ef] px-4 py-3">
          <h4 className="font-extrabold text-[#091426]">Hiện trạng thiết bị</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-xs xl:text-sm">
            <thead className="bg-[#f7f9fe] text-[10px] font-extrabold uppercase tracking-[0.03em] text-[#6b7280] xl:text-xs">
              <tr>
                <th className="w-12 px-3 py-3">STT</th>
                <th className="min-w-52 px-3 py-3">Thiết bị</th>
                <th className="w-20 px-3 py-3">Đơn vị</th>
                <th className="w-20 px-3 py-3">SL</th>
                <th className="min-w-48 px-3 py-3">Hiện trạng</th>
                <th className="min-w-48 px-3 py-3">Ghi chú</th>
                <th className="w-36 px-3 py-3">Ảnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {assets.map((asset, index) => (
                <tr key={`${asset.name}-${index}`}>
                  <td className="px-3 py-3 font-bold text-[#607089]">{index + 1}</td>
                  <td className="px-3 py-3">
                    <input
                      value={asset.name}
                      disabled={readonly}
                      onChange={(event) => updateAsset(index, "name", event.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2.5 font-semibold outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      value={asset.unit}
                      disabled={readonly}
                      onChange={(event) => updateAsset(index, "unit", event.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="1"
                      value={asset.quantity}
                      disabled={readonly}
                      onChange={(event) => updateAsset(index, "quantity", event.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={asset.condition}
                      disabled={readonly}
                      onChange={(event) => updateAsset(index, "condition", event.target.value)}
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white px-2 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    >
                      {CONDITION_OPTIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      value={asset.note}
                      disabled={readonly}
                      onChange={(event) => updateAsset(index, "note", event.target.value)}
                      placeholder="Chưa cập nhật"
                      className="h-9 w-full rounded-lg border border-[#cbd5e1] px-2.5 outline-none focus:border-[#091426] disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <label className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cbd5e1] px-2.5 text-[11px] font-bold ${
                      readonly ? "cursor-not-allowed bg-slate-100 text-slate-400" : "cursor-pointer hover:bg-[#f8fafc]"
                    }`}>
                      <Camera className="h-3.5 w-3.5" />
                      {asset.imageUrl ? "Đổi ảnh" : "Thêm ảnh"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={readonly}
                        className="hidden"
                        onChange={(event) => handleImageChange(index, event.target.files?.[0])}
                      />
                    </label>
                    {asset.imageUrl && (
                      <Image
                        src={asset.imageUrl}
                        alt={`Minh họa ${asset.name}`}
                        width={80}
                        height={56}
                        unoptimized
                        className="mt-2 h-14 w-20 rounded-lg border border-[#dfe5ef] object-cover"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <label className="mt-4 grid gap-1.5">
        <span className="text-xs font-bold text-[#58667c]">Ghi chú bàn giao</span>
        <textarea
          value={note}
          disabled={readonly}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Chưa cập nhật"
          className="w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm outline-none focus:border-[#091426] disabled:bg-slate-100"
        />
      </label>

      {!readonly && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white hover:bg-[#16253a]"
          >
            <Save className="h-4 w-4" />
            Lưu bàn giao
          </button>
        </div>
      )}
    </section>
  );
}

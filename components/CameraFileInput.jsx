"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, Trash2, Upload } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";

export default function CameraFileInput({
  label,
  value,
  disabled = false,
  onChange,
  onRemove,
  buttonText,
  previewAlt,
  className = "",
}) {
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (value?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(value.previewUrl);
      }
    };
  }, [value]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setCameraOpen(true)}
          className="flex-1 rounded-lg border-dashed"
        >
          <Camera className="mr-2 h-4 w-4" />
          {buttonText || `Chụp ảnh ${label.toLowerCase()}`}
        </Button>

        <label
          className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm font-medium ${
            disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
              : "cursor-pointer border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50"
          }`}
        >
          <Upload className="h-4 w-4 shrink-0" />
          Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const previewUrl = URL.createObjectURL(file);
              onChange?.({ file, previewUrl });
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {value?.previewUrl && (
        <div className="space-y-2">
          <Image
            src={value.previewUrl}
            alt={previewAlt || `Ảnh ${label}`}
            width={320}
            height={180}
            unoptimized
            className="h-32 w-full rounded-lg border border-gray-200 object-cover"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onRemove}
            className="w-full rounded-lg text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa ảnh
          </Button>
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(payload) => {
          onChange?.(payload);
          setCameraOpen(false);
        }}
      />
    </div>
  );
}
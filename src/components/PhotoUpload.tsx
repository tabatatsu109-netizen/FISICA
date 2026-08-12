"use client";

import { useRef, useState, useTransition } from "react";
import { savePhoto } from "@/lib/actions/photo";

/** 画像を正方形にクロップして縮小し、JPEGのdata URLに変換する */
async function toSquareDataUrl(file: File, size = 400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotoUpload({ userId, hasPhoto }: { userId?: string; hasPhoto: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await toSquareDataUrl(file);
      const formData = new FormData();
      formData.set("photoData", dataUrl);
      if (userId) formData.set("userId", userId);
      startTransition(async () => {
        await savePhoto(formData);
      });
    } catch {
      setError("画像を読み込めませんでした");
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="text-xs text-ink-3 border border-white/10 rounded-full px-3 py-1.5 hover:border-accent/50 disabled:opacity-50"
      >
        {pending ? "保存中..." : hasPhoto ? "写真を変更" : "顔写真を登録"}
      </button>
      {error && <span className="text-critical text-xs">{error}</span>}
    </span>
  );
}

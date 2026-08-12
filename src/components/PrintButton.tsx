"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-accent text-[#0d0d0d] font-bold rounded-full px-6 py-2.5 text-sm"
    >
      PDFに保存 / 印刷
    </button>
  );
}

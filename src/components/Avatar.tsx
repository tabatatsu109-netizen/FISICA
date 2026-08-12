/* eslint-disable @next/next/no-img-element */

export function Avatar({
  photoData,
  name,
  size = 56,
  rounded = "9999px",
}: {
  photoData: string | null | undefined;
  name: string;
  size?: number | string;
  rounded?: string;
}) {
  const dim = typeof size === "number" ? `${size}px` : size;
  if (photoData) {
    return (
      <img
        src={photoData}
        alt={`${name}の写真`}
        style={{ width: dim, height: dim, borderRadius: rounded, objectFit: "cover" }}
        className="border border-white/10"
      />
    );
  }
  return (
    <span
      style={{ width: dim, height: dim, borderRadius: rounded }}
      className="bg-surface-2 border border-white/10 flex items-center justify-center text-ink-3 font-bold select-none"
    >
      {name.trim().charAt(0)}
    </span>
  );
}

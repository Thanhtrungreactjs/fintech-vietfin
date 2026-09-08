import { useState } from "react";

const COLORS = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-600", "bg-orange-500"];

function colorFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % COLORS.length;
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Falls back to a colored initials badge when a real insurer logo isn't
// available or fails to load, so the UI never shows a broken image icon.
export default function InsurerLogo({ src, name, size = "h-8 w-8" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return (
      <div
        className={`${size} flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${colorFor(name || "?")}`}
      >
        {initials || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${size} shrink-0 rounded-lg bg-white object-contain p-1`}
      onError={() => setFailed(true)}
    />
  );
}

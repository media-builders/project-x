"use client";

export const COLOR_MAP: Record<string, string> = {
  Danger: "bg-red-600 text-white",
  Success: "bg-emerald-500 text-white",
  Primary: "bg-blue-600 text-white",
  Warning: "bg-yellow-400 text-black",
};

export const resolveColorClass = (color?: string) => {
  if (!color) return COLOR_MAP.Primary;
  if (color in COLOR_MAP) return COLOR_MAP[color as keyof typeof COLOR_MAP];
  return color!;
};

export const extractBackgroundClass = (colorClass: string) => {
  const candidate = colorClass.split(" ").find((cls) => cls.startsWith("bg-"));
  return candidate ?? "bg-blue-600";
};

/** Canonical platform names for domain create/edit dropdowns. */
export const PLATFORMS = [
  "Facebook",
  "Google",
  "DV 360",
  "Bigo",
  "Roku",
  "Media Go",
  "Comcast",
  "StackAdapt",
  "Carty",
  "News Break",
];

/** Normalized platform keys hidden from the domains page filter chips. */
export const FILTER_EXCLUDED_PLATFORMS = ["dv360", "stackadapt"];

export function normalizePlatformName(platform) {
  return String(platform ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function isPlatformExcludedFromFilters(platform) {
  return FILTER_EXCLUDED_PLATFORMS.includes(normalizePlatformName(platform));
}

const PLATFORM_FILTER_COLORS = {
  google: "bg-red-100 text-red-700 border border-red-200",
  liftoff: "bg-green-100 text-green-700 border border-green-200",
  bigo: "bg-purple-100 text-purple-700 border border-purple-200",
  facebook: "bg-blue-100 text-blue-700 border border-blue-200",
  dv360: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  roku: "bg-orange-100 text-orange-700 border border-orange-200",
  mediego: "bg-teal-100 text-teal-700 border border-teal-200",
  comcast: "bg-sky-100 text-sky-700 border border-sky-200",
  stackadapt: "bg-pink-100 text-pink-700 border border-pink-200",
  carty: "bg-amber-100 text-amber-700 border border-amber-200",
  newsbreak: "bg-rose-100 text-rose-700 border border-rose-200",
};

const DEFAULT_PLATFORM_FILTER_COLOR =
  "bg-gray-100 text-gray-700 border border-gray-200";

/** Tailwind classes for an active platform filter chip. */
export function getPlatformFilterColor(platformName) {
  return (
    PLATFORM_FILTER_COLORS[normalizePlatformName(platformName)] ??
    DEFAULT_PLATFORM_FILTER_COLOR
  );
}

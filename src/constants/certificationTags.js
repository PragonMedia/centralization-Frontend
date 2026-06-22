/** Options shown in Edit Domain certification tag checkboxes. */
export const CERTIFICATION_TAGS = [
  { value: "G2", label: "G2" },
  { value: "Political", label: "Political" },
  { value: "debt", label: "debt" },
];

const CERTIFICATION_TAG_COLORS = {
  g2: "bg-blue-100 text-blue-700 border-blue-200",
  political: "bg-red-100 text-red-700 border-red-200",
  debt: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const DEFAULT_CERTIFICATION_TAG_COLOR =
  "bg-gray-100 text-gray-700 border-gray-200";

/** Tailwind classes for a certification tag badge. */
export function getCertificationTagColor(tag) {
  const key = String(tag ?? "")
    .trim()
    .toLowerCase();
  return CERTIFICATION_TAG_COLORS[key] ?? DEFAULT_CERTIFICATION_TAG_COLOR;
}

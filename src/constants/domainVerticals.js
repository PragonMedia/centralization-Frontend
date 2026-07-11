/** @typedef {"Medicare" | "Final Expense" | "Debt" | "ACA" | "Medicaid"} DomainVertical */

/** Canonical domain vertical enum values (must match backend exactly). */
export const DOMAIN_VERTICALS = [
  "Medicare",
  "Final Expense",
  "Debt",
  "ACA",
  "Medicaid",
];

/**
 * @param {DomainVertical | string | null | undefined} vertical
 * @returns {vertical is DomainVertical}
 */
export function isDomainVertical(vertical) {
  return DOMAIN_VERTICALS.includes(vertical);
}

/**
 * @param {DomainVertical | string | null | undefined} vertical
 * @returns {string}
 */
export function formatDomainVertical(vertical) {
  if (!vertical) return "Not set";
  return String(vertical);
}

/**
 * Form/API value for clearing vertical on update.
 * @param {string | null | undefined} value
 * @returns {DomainVertical | null}
 */
export function resolveDomainVerticalForUpdate(value) {
  if (value == null || value === "") return null;
  return value;
}

const VERTICAL_FILTER_COLORS = {
  Medicare: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "Final Expense": "bg-violet-100 text-violet-700 border border-violet-200",
  Debt: "bg-amber-100 text-amber-700 border border-amber-200",
  ACA: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  Medicaid: "bg-teal-100 text-teal-700 border border-teal-200",
};

/** Tailwind classes for an active vertical filter chip. */
export function getVerticalFilterColor(vertical) {
  return (
    VERTICAL_FILTER_COLORS[vertical] ??
    "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
  );
}

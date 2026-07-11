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

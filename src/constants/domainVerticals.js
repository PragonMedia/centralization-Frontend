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
 * Maps lander-creation vertical labels → domain-level vertical values.
 * Lander UI uses names like "Medicare PPC" / "Debt PPC"; domains store "Medicare" / "Debt".
 */
export const LANDER_VERTICAL_TO_DOMAIN_VERTICAL = {
  "Medicare PPC": "Medicare",
  "Debt PPC": "Debt",
  "Debt Form": "Debt",
  "Final Expense": "Final Expense",
  Medicaid: "Medicaid",
  ACA: "ACA",
};

/**
 * Resolve which domain.vertical value(s) match a selected lander-creation vertical.
 * @param {string | null | undefined} landerVertical
 * @returns {DomainVertical | null} null when there is no domain-vertical mapping
 */
export function getDomainVerticalForLanderVertical(landerVertical) {
  if (!landerVertical) return null;
  return LANDER_VERTICAL_TO_DOMAIN_VERTICAL[landerVertical] ?? null;
}

/**
 * Whether a domain should appear for a selected lander-creation vertical.
 * Domains without a vertical remain visible (legacy / unset).
 * @param {DomainVertical | string | null | undefined} domainVertical
 * @param {string | null | undefined} landerVertical
 */
export function domainMatchesLanderVertical(domainVertical, landerVertical) {
  if (!landerVertical) return true;
  if (!domainVertical) return true; // legacy domains without vertical

  const expected = getDomainVerticalForLanderVertical(landerVertical);
  // No domain enum for this lander vertical (e.g. Sweeps/Nutra/Casino) —
  // only legacy domains without a vertical stay visible.
  if (!expected) return false;
  return domainVertical === expected;
}

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

/**
 * Canonical domain vertical values aligned with lander-creation verticals.
 * Frontend owns the allowlist saved to the DB; backend stores a free-form string.
 * @typedef {string} DomainVertical
 */

/** New values shown in Add Domain / preferred for new domains. */
export const DOMAIN_VERTICALS = [
  "Medicare PPC",
  "Medicaid",
  "ACA",
  "Debt PPC",
  "Debt Form",
  "Final Expense",
  "VSL",
  "Concealed Carry",
];

/** Pre-alignment domain.vertical values still present in the DB. */
export const LEGACY_DOMAIN_VERTICALS = [
  "Medicare",
  "Final Expense",
  "Debt",
  "ACA",
  "Medicaid",
];

/** All values the API may return or accept (new + legacy). */
export const ALL_DOMAIN_VERTICALS = [
  ...DOMAIN_VERTICALS,
  ...LEGACY_DOMAIN_VERTICALS.filter((v) => !DOMAIN_VERTICALS.includes(v)),
];

/**
 * Lander vertical → domain.vertical values that should match
 * (exact new label + legacy aliases).
 */
export const LANDER_VERTICAL_TO_DOMAIN_VERTICALS = {
  "Medicare PPC": ["Medicare PPC", "Medicare"],
  Medicaid: ["Medicaid"],
  ACA: ["ACA"],
  "Debt PPC": ["Debt PPC", "Debt"],
  "Debt Form": ["Debt Form", "Debt"],
  "Final Expense": ["Final Expense"],
  VSL: ["VSL"],
  "Concealed Carry": ["Concealed Carry"],
};

/**
 * @deprecated Prefer LANDER_VERTICAL_TO_DOMAIN_VERTICALS.
 * Kept for callers expecting a single mapped value (primary/new label).
 */
export const LANDER_VERTICAL_TO_DOMAIN_VERTICAL = Object.fromEntries(
  Object.entries(LANDER_VERTICAL_TO_DOMAIN_VERTICALS).map(([k, vals]) => [
    k,
    vals[0],
  ]),
);

/**
 * Normalize domain/lander org strings to "paragon" | "elite" | null.
 * @param {string | null | undefined} organization
 * @returns {"paragon" | "elite" | null}
 */
export function normalizeDomainOrganization(organization) {
  if (!organization) return null;
  const n = String(organization).trim().toLowerCase();
  if (n === "elite") return "elite";
  if (n === "paragon" || n === "paragon media") return "paragon";
  return null;
}

/**
 * Vertical options for domain Add/Edit, filtered by organization.
 * @param {string | null | undefined} organization
 * @returns {string[]}
 */
export function getDomainVerticalsForOrganization(organization) {
  const org = normalizeDomainOrganization(organization);
  if (org === "elite") {
    return ["Medicare PPC"];
  }
  return [...DOMAIN_VERTICALS];
}

/**
 * Resolve which domain.vertical value matches a lander vertical (primary/new).
 * @param {string | null | undefined} landerVertical
 * @returns {string | null}
 */
export function getDomainVerticalForLanderVertical(landerVertical) {
  if (!landerVertical) return null;
  return LANDER_VERTICAL_TO_DOMAIN_VERTICAL[landerVertical] ?? null;
}

/**
 * Whether a domain should appear for a selected lander-creation vertical.
 * Domains without a vertical remain visible (legacy / unset).
 * @param {string | null | undefined} domainVertical
 * @param {string | null | undefined} landerVertical
 */
export function domainMatchesLanderVertical(domainVertical, landerVertical) {
  if (!landerVertical) return true;
  if (!domainVertical) return true; // legacy domains without vertical

  const allowed = LANDER_VERTICAL_TO_DOMAIN_VERTICALS[landerVertical];
  if (!allowed) return false;
  return allowed.includes(domainVertical);
}

/**
 * @param {string | null | undefined} vertical
 * @returns {boolean}
 */
export function isDomainVertical(vertical) {
  return ALL_DOMAIN_VERTICALS.includes(vertical);
}

/**
 * @param {string | null | undefined} vertical
 * @returns {string}
 */
export function formatDomainVertical(vertical) {
  if (!vertical) return "Not set";
  return String(vertical);
}

/**
 * Form/API value for clearing vertical on update.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function resolveDomainVerticalForUpdate(value) {
  if (value == null || value === "") return null;
  return value;
}

/**
 * Options for a domain vertical select: org-filtered new labels,
 * plus the current saved value if it is a legacy-only label not in the list.
 * @param {string | null | undefined} organization
 * @param {string | null | undefined} currentVertical
 * @returns {string[]}
 */
export function getDomainVerticalSelectOptions(organization, currentVertical) {
  const options = getDomainVerticalsForOrganization(organization);
  if (
    currentVertical &&
    !options.includes(currentVertical) &&
    LEGACY_DOMAIN_VERTICALS.includes(currentVertical) &&
    !DOMAIN_VERTICALS.includes(currentVertical)
  ) {
    return [currentVertical, ...options];
  }
  return options;
}

const VERTICAL_FILTER_COLORS = {
  "Medicare PPC": "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Medicare: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "Final Expense": "bg-violet-100 text-violet-700 border border-violet-200",
  "Debt PPC": "bg-amber-100 text-amber-700 border border-amber-200",
  "Debt Form": "bg-orange-100 text-orange-700 border border-orange-200",
  Debt: "bg-amber-100 text-amber-700 border border-amber-200",
  ACA: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  Medicaid: "bg-teal-100 text-teal-700 border border-teal-200",
  VSL: "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200",
  "Concealed Carry": "bg-stone-100 text-stone-700 border border-stone-200",
};

/** Tailwind classes for an active vertical filter chip. */
export function getVerticalFilterColor(vertical) {
  return (
    VERTICAL_FILTER_COLORS[vertical] ??
    "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
  );
}

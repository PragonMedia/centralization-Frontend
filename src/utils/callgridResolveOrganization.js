import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

/**
 * Resolve CallGrid organizationId from an API key via backend proxy
 * (avoids browser CORS when calling api.callgrid.com directly).
 * @returns {{ organizationId: string, label: string }}
 */
export async function resolveCallGridOrganization(apiToken) {
  const trimmed = apiToken?.trim();
  if (!trimmed) {
    throw new Error("API Token is required.");
  }

  const res = await fetch(API_ENDPOINTS.ACCOUNTING.CALLGRID_RESOLVE_ORG, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ apiToken: trimmed }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    throw new Error(
      json.error ||
        json.message ||
        `Could not resolve CallGrid organization (HTTP ${res.status})`,
    );
  }

  const org = Array.isArray(json.organizations)
    ? json.organizations[0]
    : null;
  const organizationId = org?.organizationId;
  if (!organizationId || String(organizationId).trim() === "") {
    throw new Error("No CallGrid organization found for this API key.");
  }

  return {
    organizationId: String(organizationId).trim(),
    label: org?.label != null ? String(org.label).trim() : "",
  };
}

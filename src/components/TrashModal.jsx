import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import LoadingSpinner from "./LoadingSpinner";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
import { invalidateCache } from "../utils/cache.js";
import { formatDomainVertical } from "../constants/domainVerticals.js";

const PAGE_SIZE = 20;

function getMediaBuyerName(email) {
  switch (email) {
    case "addy@paragonmedia.io":
      return "Addy";
    case "jake@paragonmedia.io":
      return "Jake";
    case "nick@paragonmedia.io":
      return "Nick";
    case "sean@paragonmedia.io":
      return "Sean Luc";
    default:
      return email || "Unknown";
  }
}

function formatArchivedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRouteCount(domain) {
  if (domain?.trash?.routeCount != null) return domain.trash.routeCount;
  if (Array.isArray(domain?.routes)) return domain.routes.length;
  return 0;
}

function getDaysUntilPurge(domain) {
  if (domain?.trash?.daysUntilPurge != null) return domain.trash.daysUntilPurge;
  if (domain?.daysUntilPurge != null) return domain.daysUntilPurge;
  return null;
}

const TrashModal = ({ isOpen, onClose, onRestored }) => {
  const [domains, setDomains] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [retentionDays, setRetentionDays] = useState(30);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringDomain, setRestoringDomain] = useState(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        API_ENDPOINTS.TRASH.LIST({
          page,
          limit: PAGE_SIZE,
          search,
          sortBy: "archivedAt",
          sortOrder: "desc",
        }),
        { headers: getAuthHeaders() },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Failed to load trash (HTTP ${response.status}).`,
        );
      }

      setDomains(Array.isArray(data.domains) ? data.domains : []);
      setRetentionDays(data.retentionDays ?? 30);
      setPagination({
        page: data.pagination?.page ?? page,
        limit: data.pagination?.limit ?? PAGE_SIZE,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 1,
      });
    } catch (err) {
      setDomains([]);
      setError(err.message || "Failed to load trash.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen, fetchTrash]);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setSearch("");
      setPage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRestore = async (domainName) => {
    setRestoringDomain(domainName);
    try {
      const response = await fetch(API_ENDPOINTS.DOMAINS.RESTORE(domainName), {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let message =
          data.error ||
          data.message ||
          `Failed to restore domain (HTTP ${response.status}).`;
        if (response.status === 403) {
          message = "You do not have permission to restore this domain.";
        } else if (response.status === 400) {
          message = message || "This domain is not in trash.";
        }
        throw new Error(message);
      }

      invalidateCache.domains();
      invalidateCache.trash();
      toast.success(`"${domainName}" restored successfully.`);
      await fetchTrash();
      if (onRestored) onRestored();
    } catch (err) {
      toast.error(err.message || "Failed to restore domain.");
    } finally {
      setRestoringDomain(null);
    }
  };

  const canGoPrev = page > 1;
  const canGoNext = page < (pagination.totalPages || 1);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-auto relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trash</h2>
              <p className="text-sm text-gray-500">
                Deleted domains are kept for {retentionDays} days before
                permanent removal.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 border-b border-gray-100">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by domain name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" text="Loading trash..." />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : domains.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-medium text-gray-800">Trash is empty</p>
              {search && (
                <p className="text-sm text-gray-500 mt-2">
                  No results for &quot;{search}&quot;
                </p>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Domain
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned to
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vertical
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Routes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deleted on
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permanent delete in
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {domains.map((domain) => {
                      const daysUntilPurge = getDaysUntilPurge(domain);
                      const archivedAt =
                        domain.archivedAt || domain.trash?.archivedAt;

                      return (
                        <tr key={domain.domain} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {domain.domain}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {getMediaBuyerName(domain.assignedTo)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {domain.organization || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {formatDomainVertical(domain.vertical)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 tabular-nums">
                            {getRouteCount(domain)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {formatArchivedAt(archivedAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {daysUntilPurge != null ? (
                              <span
                                className={
                                  daysUntilPurge <= 3
                                    ? "font-semibold text-red-600"
                                    : "text-gray-700"
                                }
                              >
                                {daysUntilPurge} day
                                {daysUntilPurge === 1 ? "" : "s"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <button
                              type="button"
                              onClick={() => handleRestore(domain.domain)}
                              disabled={restoringDomain === domain.domain}
                              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {restoringDomain === domain.domain ? (
                                <>
                                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  Restoring...
                                </>
                              ) : (
                                "Restore"
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                    {pagination.total != null && (
                      <span className="ml-2 text-gray-500">
                        ({pagination.total} total)
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      disabled={!canGoPrev}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(pagination.totalPages || 1, current + 1),
                        )
                      }
                      disabled={!canGoNext}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashModal;

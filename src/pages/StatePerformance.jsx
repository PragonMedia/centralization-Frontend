import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

function formatCurrency(val) {
  if (val == null || Number.isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val));
}

function formatCount(val) {
  if (val == null || Number.isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-US").format(Number(val));
}

function formatLastUpdated(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "05/18/2026 - 05/24/2026" → "05/18 - 05/24" */
function formatWeekLabelShort(label) {
  if (!label) return "";
  return String(label).replace(/\/\d{4}/g, "");
}

/** Dropdown value for all channels combined (week.total.states). */
const CHANNEL_TOTAL = "__total__";

function getStateRowsForWeek(week, selectedChannel) {
  if (!week) return [];
  if (!selectedChannel || selectedChannel === CHANNEL_TOTAL) {
    return Array.isArray(week.total?.states) ? week.total.states : [];
  }
  const block = Array.isArray(week.channels)
    ? week.channels.find((c) => c.channel === selectedChannel)
    : null;
  return Array.isArray(block?.states) ? block.states : [];
}

function StatePerformance() {
  const [channels, setChannels] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [cacheMeta, setCacheMeta] = useState(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(-1);
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_TOTAL);
  const [sortKey, setSortKey] = useState("callCount");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emptyState, setEmptyState] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const fetchCached = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyState(false);
    setEmptyMessage(null);
    try {
      const res = await fetch(API_ENDPOINTS.STATE_PERFORMANCE.CACHED);
      const json = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setChannels([]);
        setWeeks([]);
        setSummary(null);
        setCacheMeta(null);
        setSelectedWeekIndex(-1);
        setEmptyState(true);
        setEmptyMessage(
          typeof json.error === "string" ? json.error : null,
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          res.status >= 500
            ? "Something went wrong loading state performance. Please try again later."
            : json.error ||
                json.message ||
                `Request failed (HTTP ${res.status}).`,
        );
      }

      const weekList = Array.isArray(json.weeks) ? json.weeks : [];
      const channelList = Array.isArray(json.channels) ? json.channels : [];

      if (json.success === false && weekList.length === 0) {
        setChannels([]);
        setWeeks([]);
        setSummary(null);
        setCacheMeta(null);
        setSelectedWeekIndex(-1);
        setEmptyState(true);
        setEmptyMessage(
          typeof json.error === "string" ? json.error : null,
        );
        return;
      }

      setChannels(channelList);
      setWeeks(weekList);
      setSummary(json.summary ?? null);
      setCacheMeta(json.cacheMeta ?? null);
      setSelectedWeekIndex(weekList.length > 0 ? weekList.length - 1 : -1);
      setSelectedChannel((prev) => {
        if (prev === CHANNEL_TOTAL) return CHANNEL_TOTAL;
        if (prev && channelList.includes(prev)) return prev;
        return CHANNEL_TOTAL;
      });

      if (weekList.length === 0) {
        setEmptyState(true);
        return;
      }
    } catch (e) {
      setChannels([]);
      setWeeks([]);
      setSummary(null);
      setCacheMeta(null);
      setSelectedWeekIndex(-1);
      setError(
        e.message || "Something went wrong loading state performance.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCached();
  }, [fetchCached]);

  const selectedWeek = useMemo(() => {
    if (selectedWeekIndex < 0 || selectedWeekIndex >= weeks.length) return null;
    return weeks[selectedWeekIndex];
  }, [weeks, selectedWeekIndex]);

  const rawStateRows = useMemo(
    () => getStateRowsForWeek(selectedWeek, selectedChannel),
    [selectedWeek, selectedChannel],
  );

  const channelLabel =
    selectedChannel === CHANNEL_TOTAL ? "Total" : selectedChannel || "—";

  const sortedStates = useMemo(() => {
    const states = [...rawStateRows];
    const dir = sortDir === "asc" ? 1 : -1;
    states.sort((a, b) => {
      if (sortKey === "state") {
        return dir * String(a.state || "").localeCompare(String(b.state || ""));
      }
      const av = Number(a[sortKey]) || 0;
      const bv = Number(b[sortKey]) || 0;
      return dir * (av - bv);
    });
    return states;
  }, [rawStateRows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "state" ? "asc" : "desc");
    }
  };

  const sortIndicator = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(API_ENDPOINTS.STATE_PERFORMANCE.REFRESH, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(
          body.error || body.message || `Refresh failed (HTTP ${res.status}).`,
        );
      }
      await fetchCached();
    } catch (e) {
      setRefreshError(
        e.message || "Failed to refresh state performance cache.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const weekCallTotal = sortedStates.reduce(
    (sum, row) => sum + (Number(row.callCount) || 0),
    0,
  );

  const selectClassName =
    "block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              State Performance
            </h1>
            {cacheMeta?.refreshedAt && (
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {formatLastUpdated(cacheMeta.refreshedAt)}
              </p>
            )}
          </div>

          {loading && (
            <p className="text-gray-500">Loading state performance…</p>
          )}

          {!loading && error && <p className="text-red-600">{error}</p>}

          {!loading && emptyState && !error && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <p className="text-lg font-medium text-gray-800">
                No data available yet
              </p>
              {emptyMessage && (
                <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
                  {emptyMessage}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Cached data refreshes automatically every Friday at 7pm ET.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleRefreshCache}
                  disabled={refreshing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {refreshing
                    ? "Building cache… (may take several minutes)"
                    : "Build cache now"}
                </button>
                {refreshError && (
                  <p className="text-sm text-red-600 mt-3">{refreshError}</p>
                )}
              </div>
            </div>
          )}

          {!loading && !emptyState && !error && weeks.length > 0 && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                {selectedWeek && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    <span>
                      Channel:{" "}
                      <strong className="text-gray-900">{channelLabel}</strong>
                    </span>
                    <span>
                      States:{" "}
                      <strong className="text-gray-900">
                        {sortedStates.length}
                      </strong>
                    </span>
                    <span>
                      Total calls:{" "}
                      <strong className="text-gray-900 tabular-nums">
                        {formatCount(weekCallTotal)}
                      </strong>
                    </span>
                    {summary?.channelsDiscovered != null && (
                      <span>
                        Channels tracked:{" "}
                        <strong className="text-gray-900">
                          {summary.channelsDiscovered}
                        </strong>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-4 ml-auto">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="state-perf-week"
                      className="text-sm font-medium text-gray-700"
                    >
                      Date range
                    </label>
                    <select
                      id="state-perf-week"
                      value={selectedWeekIndex >= 0 ? selectedWeekIndex : ""}
                      onChange={(e) =>
                        setSelectedWeekIndex(Number(e.target.value))
                      }
                      className={`${selectClassName} min-w-[11rem]`}
                    >
                      {weeks.map((week, index) => (
                        <option key={week.weekLabel || index} value={index}>
                          {formatWeekLabelShort(week.weekLabel) ||
                            `Week ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="state-perf-channel"
                      className="text-sm font-medium text-gray-700"
                    >
                      Channel
                    </label>
                    <select
                      id="state-perf-channel"
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value)}
                      className={`${selectClassName} min-w-[10rem]`}
                    >
                      <option value={CHANNEL_TOTAL}>Total</option>
                      {channels.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort("state")}
                          className="hover:text-gray-700"
                        >
                          State{sortIndicator("state")}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort("callCount")}
                          className="hover:text-gray-700 ml-auto block w-full text-right"
                        >
                          Call Count{sortIndicator("callCount")}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort("earningsPerCallGross")}
                          className="hover:text-gray-700 ml-auto block w-full text-right"
                        >
                          RPC{sortIndicator("earningsPerCallGross")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedStates.map((row) => (
                      <tr key={row.state} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.state || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                          {formatCount(row.callCount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                          {formatCurrency(row.earningsPerCallGross)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedStates.length === 0 && (
                <p className="text-gray-500 text-sm mt-4">
                  {selectedChannel && selectedChannel !== CHANNEL_TOTAL
                    ? `No state data for ${selectedChannel} this week.`
                    : "No state data for this week."}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatePerformance;

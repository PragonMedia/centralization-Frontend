import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../config/api";

const DATE_ARROW_STEP_DAYS = 7;

/** Excluded from Total aggregation and channel dropdown. */
const EXCLUDED_CHANNELS = new Set(["FBA", "FBP", "MG"]);

function isExcludedChannel(channel) {
  return EXCLUDED_CHANNELS.has(String(channel || "").trim().toUpperCase());
}

function filterChannelList(channelList) {
  return (channelList || []).filter((ch) => !isExcludedChannel(ch));
}

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

function toInputDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr, dayDelta) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + dayDelta);
  return toInputDateString(date);
}

function getDefaultDateRange() {
  const today = new Date();
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const monday = new Date(endDate);
  const day = monday.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return {
    start: toInputDateString(monday),
    end: toInputDateString(endDate),
  };
}

function formatDateRange(startStr, endStr) {
  if (!startStr || !endStr) return "";
  const format = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  if (startStr === endStr) return format(startStr);
  return `${format(startStr)} – ${format(endStr)}`;
}

function clampDateStr(value, min, max) {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/** Dropdown value for all included channels combined (excludes FBA, FBP, MG). */
const CHANNEL_TOTAL = "__total__";

function dayDateIso(day) {
  if (!day) return "";
  if (day.dateIso) return String(day.dateIso).slice(0, 10);
  const parts = String(day.day || "").split("/").map(Number);
  if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return "";
}

function getStateRowsForDay(day, selectedChannel) {
  if (!day) return [];
  if (!selectedChannel || selectedChannel === CHANNEL_TOTAL) {
    const rowsPerChannel = (Array.isArray(day.channels) ? day.channels : [])
      .filter((c) => c.channel && !isExcludedChannel(c.channel))
      .map((c) => (Array.isArray(c.states) ? c.states : []));
    return aggregateStateRows(rowsPerChannel);
  }
  if (isExcludedChannel(selectedChannel)) return [];
  const block = Array.isArray(day.channels)
    ? day.channels.find((c) => c.channel === selectedChannel)
    : null;
  return Array.isArray(block?.states) ? block.states : [];
}

/** Sum call counts and compute weighted RPC across days in range. */
function aggregateStateRows(rowsPerDay) {
  const byState = new Map();
  for (const rows of rowsPerDay) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const state = row?.state;
      if (!state) continue;
      const calls = Number(row.callCount) || 0;
      const rpc = Number(row.earningsPerCallGross) || 0;
      if (!byState.has(state)) {
        byState.set(state, { state, callCount: 0, grossTotal: 0 });
      }
      const agg = byState.get(state);
      agg.callCount += calls;
      agg.grossTotal += rpc * calls;
    }
  }
  return Array.from(byState.values()).map((a) => ({
    state: a.state,
    callCount: a.callCount,
    earningsPerCallGross:
      a.callCount > 0 ? a.grossTotal / a.callCount : 0,
  }));
}

function filterDaysInRange(allDays, startStr, endStr) {
  if (!startStr || !endStr) return [];
  const rangeStart = startStr <= endStr ? startStr : endStr;
  const rangeEnd = startStr <= endStr ? endStr : startStr;
  return allDays.filter((day) => {
    const iso = dayDateIso(day);
    return iso && iso >= rangeStart && iso <= rangeEnd;
  });
}

function buildPartialWarning(summary) {
  if (!summary) return null;
  const failedDays = summary.failedDays ?? [];
  const failedChannelDays = summary.failedChannelDays ?? [];
  if (failedDays.length === 0 && failedChannelDays.length === 0) {
    return null;
  }
  const parts = [];
  if (failedDays.length > 0) {
    parts.push(`${failedDays.length} day(s) failed to refresh`);
  }
  if (failedChannelDays.length > 0) {
    parts.push(
      `${failedChannelDays.length} channel-day combination(s) failed`,
    );
  }
  return `Some data may be incomplete: ${parts.join("; ")}.`;
}

function defaultRangeFromCache(dayList, cacheMeta) {
  const firstIso = dayList.length ? dayDateIso(dayList[0]) : "";
  const lastIso = dayList.length ? dayDateIso(dayList[dayList.length - 1]) : "";
  const metaStart = cacheMeta?.windowStart
    ? String(cacheMeta.windowStart).slice(0, 10)
    : "";
  const metaEnd = cacheMeta?.windowEnd
    ? String(cacheMeta.windowEnd).slice(0, 10)
    : "";
  const today = toInputDateString(new Date());

  const cacheMin = [firstIso, metaStart].filter(Boolean).sort()[0] || "";
  const cacheMax =
    [lastIso, metaEnd, today].filter(Boolean).sort().pop() || today;

  const dr = getDefaultDateRange();
  let end = clampDateStr(dr.end, cacheMin, cacheMax);
  let start = clampDateStr(dr.start, cacheMin, end);
  if (lastIso) {
    end = lastIso;
    start = clampDateStr(dr.start, cacheMin, end);
  }
  if (start > end) start = end;
  return { start, end, cacheMin, cacheMax };
}

function StatePerformance() {
  const defaultRange = getDefaultDateRange();
  const [channels, setChannels] = useState([]);
  const [days, setDays] = useState([]);
  const [cacheBounds, setCacheBounds] = useState({ min: "", max: "" });
  const [summary, setSummary] = useState(null);
  const [cacheMeta, setCacheMeta] = useState(null);
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_TOTAL);
  const [sortKey, setSortKey] = useState("callCount");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emptyState, setEmptyState] = useState(false);
  const [partialWarning, setPartialWarning] = useState(null);

  const fetchCached = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyState(false);
    setPartialWarning(null);
    try {
      const res = await fetch(API_ENDPOINTS.STATE_PERFORMANCE.CACHED);
      const json = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setChannels([]);
        setDays([]);
        setSummary(null);
        setCacheMeta(null);
        setCacheBounds({ min: "", max: "" });
        setEmptyState(true);
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

      const dayList = Array.isArray(json.days) ? json.days : [];
      const channelList = filterChannelList(
        Array.isArray(json.channels) ? json.channels : [],
      );

      if (json.success === false && dayList.length === 0) {
        setChannels([]);
        setDays([]);
        setSummary(null);
        setCacheMeta(null);
        setCacheBounds({ min: "", max: "" });
        setEmptyState(true);
        return;
      }

      const bounds = defaultRangeFromCache(dayList, json.cacheMeta);

      setChannels(channelList);
      setDays(dayList);
      setSummary(json.summary ?? null);
      setCacheMeta(json.cacheMeta ?? null);
      setCacheBounds({ min: bounds.cacheMin, max: bounds.cacheMax });
      setStart(bounds.start);
      setEnd(bounds.end);
      setSelectedChannel((prev) => {
        if (prev === CHANNEL_TOTAL) return CHANNEL_TOTAL;
        if (isExcludedChannel(prev)) return CHANNEL_TOTAL;
        if (prev && channelList.includes(prev)) return prev;
        return CHANNEL_TOTAL;
      });

      if (dayList.length === 0) {
        setEmptyState(true);
        return;
      }

      const warning = buildPartialWarning(json.summary);
      if (warning) setPartialWarning(warning);

      if (json.success === false && typeof json.error === "string") {
        setPartialWarning((prev) =>
          prev ? `${prev} ${json.error}` : json.error,
        );
      }
    } catch (e) {
      setChannels([]);
      setDays([]);
      setSummary(null);
      setCacheMeta(null);
      setCacheBounds({ min: "", max: "" });
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

  const todayStr = toInputDateString(new Date());
  const dateRangeLabel = formatDateRange(start, end);

  const nextRangeEnd = start && end ? shiftDateString(end, DATE_ARROW_STEP_DAYS) : "";
  const canShiftDateRight =
    Boolean(start && end && nextRangeEnd) && nextRangeEnd <= todayStr;

  const handleShiftDateRange = (direction) => {
    const today = todayStr;
    const w = DATE_ARROW_STEP_DAYS;
    const { min, max } = cacheBounds;
    const maxEnd = max && max < today ? max : today;

    if (direction === "prev") {
      let newStart = shiftDateString(start, -w);
      let newEnd = shiftDateString(end, -w);
      if (min) {
        if (newStart < min) {
          newStart = min;
          newEnd = shiftDateString(min, w - 1);
          if (newEnd > maxEnd) newEnd = maxEnd;
        }
      }
      setStart(newStart);
      setEnd(newEnd);
      return;
    }

    let newEnd = shiftDateString(end, w);
    let newStart = shiftDateString(start, w);
    if (newEnd > maxEnd) newEnd = maxEnd;
    if (newStart > newEnd) newStart = newEnd;
    if (max && newEnd > max) newEnd = max;
    if (newEnd > today) return;
    setStart(newStart);
    setEnd(newEnd);
  };

  const handleStartChange = (value) => {
    const { min, max } = cacheBounds;
    let next = clampDateStr(value, min, max || todayStr);
    setStart(next);
    if (end && next > end) setEnd(next);
  };

  const handleEndChange = (value) => {
    const { min, max } = cacheBounds;
    const maxEnd = max && max < todayStr ? max : todayStr;
    let next = clampDateStr(value, min, maxEnd);
    setEnd(next);
    if (start && next < start) setStart(next);
  };

  const daysInRange = useMemo(
    () => filterDaysInRange(days, start, end),
    [days, start, end],
  );

  const rawStateRows = useMemo(() => {
    const rowsPerDay = daysInRange.map((day) =>
      getStateRowsForDay(day, selectedChannel),
    );
    return aggregateStateRows(rowsPerDay);
  }, [daysInRange, selectedChannel]);

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

  const rangeCallTotal = sortedStates.reduce(
    (sum, row) => sum + (Number(row.callCount) || 0),
    0,
  );

  const selectClassName =
    "block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const dateInputMin = cacheBounds.min || undefined;
  const dateInputMax =
    cacheBounds.max && cacheBounds.max < todayStr
      ? cacheBounds.max
      : todayStr;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                State Performance
              </h1>
              {dateRangeLabel && (
                <p className="text-gray-600 mt-1">{dateRangeLabel}</p>
              )}
              {cacheMeta?.refreshedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {formatLastUpdated(cacheMeta.refreshedAt)}
                </p>
              )}
            </div>
            {!loading && !emptyState && !error && days.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShiftDateRange("prev")}
                  disabled={!start || !end}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Shift range back one week"
                >
                  ←
                </button>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="state-perf-start"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start
                  </label>
                  <input
                    id="state-perf-start"
                    type="date"
                    value={start}
                    min={dateInputMin}
                    max={dateInputMax}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="state-perf-end"
                    className="text-sm font-medium text-gray-700"
                  >
                    End
                  </label>
                  <input
                    id="state-perf-end"
                    type="date"
                    value={end}
                    min={dateInputMin}
                    max={dateInputMax}
                    onChange={(e) => handleEndChange(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleShiftDateRange("next")}
                  disabled={!canShiftDateRight}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Shift range forward one week"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {loading && (
            <p className="text-gray-500">Loading state performance…</p>
          )}

          {!loading && error && <p className="text-red-600">{error}</p>}

          {!loading && emptyState && !error && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <p className="text-lg font-medium text-gray-800">
                No state performance data yet.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Cached data refreshes automatically every Friday at 7pm ET.
              </p>
            </div>
          )}

          {!loading && !emptyState && !error && days.length > 0 && (
            <>
              {partialWarning && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {partialWarning}
                </div>
              )}

              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                  <span>
                    Channel:{" "}
                    <strong className="text-gray-900">{channelLabel}</strong>
                  </span>
                  <span>
                    Days in range:{" "}
                    <strong className="text-gray-900 tabular-nums">
                      {daysInRange.length}
                    </strong>
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
                      {formatCount(rangeCallTotal)}
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

                <div className="flex flex-col gap-1 ml-auto">
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
                  {daysInRange.length === 0
                    ? "No cached data for the selected date range."
                    : selectedChannel && selectedChannel !== CHANNEL_TOTAL
                      ? `No state data for ${selectedChannel} in this range.`
                      : "No state data for this date range."}
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

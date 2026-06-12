import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

const DATE_ARROW_STEP_DAYS = 7;
const TRAFFIC_SOURCES = [{ id: "roku", label: "Roku" }];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatCurrency(val) {
  if (val === "" || val == null || Number.isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val));
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

function filterDaysInRange(allDays, startStr, endStr) {
  if (!startStr || !endStr) return [];
  const rangeStart = startStr <= endStr ? startStr : endStr;
  const rangeEnd = startStr <= endStr ? endStr : startStr;
  return allDays.filter((day) => {
    const iso = dayDateIso(day);
    return iso && iso >= rangeStart && iso <= rangeEnd;
  });
}

function defaultRangeFromCache(dayList, rangeMeta) {
  const firstIso = dayList.length ? dayDateIso(dayList[0]) : "";
  const lastIso = dayList.length ? dayDateIso(dayList[dayList.length - 1]) : "";
  const metaStart = rangeMeta?.startDate
    ? String(rangeMeta.startDate).slice(0, 10)
    : "";
  const metaEnd = rangeMeta?.endDate
    ? String(rangeMeta.endDate).slice(0, 10)
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

function enumerateInclusiveDates(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return [];
  }
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatDayMonthShort(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildColumnDateParts(startStr, endStr) {
  const dates = enumerateInclusiveDates(startStr, endStr);
  const byWeekday = Object.fromEntries(TABLE_DAYS.map((d) => [d, []]));
  for (const dt of dates) {
    const name = DAY_NAMES[dt.getDay()];
    if (byWeekday[name]) byWeekday[name].push(dt);
  }
  return TABLE_DAYS.map((day) => {
    const list = byWeekday[day] || [];
    return list.map(formatDayMonthShort);
  });
}

function emptyDayCell() {
  return { spend: "", perDateByLabel: {} };
}

function buildAccountSpendTable(daysInRange, platformAccounts) {
  const accountMap = {};
  const accountMeta = {};

  for (const acc of platformAccounts) {
    const key = acc.uid || acc.name;
    if (!key) continue;
    accountMap[key] = Object.fromEntries(
      TABLE_DAYS.map((d) => [d, emptyDayCell()]),
    );
    accountMeta[key] = { name: acc.name || key, uid: acc.uid || key };
  }

  for (const day of daysInRange) {
    const iso = dayDateIso(day);
    if (!iso) continue;
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) continue;
    const weekday = DAY_NAMES[date.getDay()];
    if (!TABLE_DAYS.includes(weekday)) continue;
    const dateLabel = formatDayMonthShort(date);

    for (const entry of day.accounts || []) {
      const key = entry.accountUid || entry.accountName;
      if (!key) continue;
      if (!accountMap[key]) {
        accountMap[key] = Object.fromEntries(
          TABLE_DAYS.map((d) => [d, emptyDayCell()]),
        );
        accountMeta[key] = {
          name: entry.accountName || key,
          uid: entry.accountUid || key,
        };
      }

      const spend = Number(entry.spend);
      if (Number.isNaN(spend)) continue;

      const cell = accountMap[key][weekday];
      cell.spend = cell.spend === "" ? spend : cell.spend + spend;
      cell.perDateByLabel[dateLabel] =
        (cell.perDateByLabel[dateLabel] || 0) + spend;
    }
  }

  return Object.keys(accountMap)
    .map((key) => ({
      accountKey: key,
      accountName: accountMeta[key].name,
      ...accountMap[key],
    }))
    .sort((a, b) =>
      String(a.accountName || "").localeCompare(String(b.accountName || "")),
    );
}

function sumCellSpendByLabels(cell, labels) {
  if (!cell || !Array.isArray(labels) || labels.length === 0) return "";
  if (labels.length === 1) {
    const value = cell.perDateByLabel?.[labels[0]];
    return value != null && value !== "" ? value : "";
  }
  let sum = 0;
  let hasValue = false;
  for (const label of labels) {
    const value = cell.perDateByLabel?.[label];
    if (value != null && value !== "") {
      sum += Number(value);
      hasValue = true;
    }
  }
  return hasValue ? sum : "";
}

function rowTotalForDisplayedRange(row, columnDateParts) {
  let sum = 0;
  let hasValue = false;
  TABLE_DAYS.forEach((day, dayIndex) => {
    const labels = columnDateParts?.[dayIndex] || [];
    const amount = sumCellSpendByLabels(row[day], labels);
    if (amount !== "" && amount != null) {
      sum += Number(amount);
      hasValue = true;
    }
  });
  return hasValue ? sum : "";
}

function TvAdSpend() {
  const defaultRange = getDefaultDateRange();
  const [selectedSource, setSelectedSource] = useState("roku");
  const [platformAccounts, setPlatformAccounts] = useState([]);
  const [days, setDays] = useState([]);
  const [cacheBounds, setCacheBounds] = useState({ min: "", max: "" });
  const [timezone, setTimezone] = useState("");
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emptyState, setEmptyState] = useState(false);

  const fetchCached = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyState(false);
    try {
      const res = await fetch(API_ENDPOINTS.ROKU_AD_SPEND.CACHED, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setPlatformAccounts([]);
        setDays([]);
        setCacheBounds({ min: "", max: "" });
        setTimezone("");
        setEmptyState(true);
        return;
      }

      if (!res.ok) {
        throw new Error(
          res.status >= 500
            ? "Something went wrong loading TV ad spend. Please try again later."
            : json.error ||
                json.message ||
                `Request failed (HTTP ${res.status}).`,
        );
      }

      const dayList = Array.isArray(json.days) ? json.days : [];
      const accountList = Array.isArray(json.accounts) ? json.accounts : [];

      if (json.success === false && dayList.length === 0) {
        setPlatformAccounts(accountList);
        setDays([]);
        setCacheBounds({ min: "", max: "" });
        setTimezone(json.timezone || "");
        setEmptyState(true);
        return;
      }

      const bounds = defaultRangeFromCache(dayList, json.range);

      setPlatformAccounts(accountList);
      setDays(dayList);
      setTimezone(json.timezone || "");
      setCacheBounds({ min: bounds.cacheMin, max: bounds.cacheMax });
      setStart(bounds.start);
      setEnd(bounds.end);

      if (dayList.length === 0) {
        setEmptyState(true);
      }
    } catch (e) {
      setPlatformAccounts([]);
      setDays([]);
      setCacheBounds({ min: "", max: "" });
      setTimezone("");
      setError(e.message || "Something went wrong loading TV ad spend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCached();
  }, [fetchCached]);

  const todayStr = toInputDateString(new Date());
  const dateRangeLabel = formatDateRange(start, end);

  const nextRangeEnd =
    start && end ? shiftDateString(end, DATE_ARROW_STEP_DAYS) : "";
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
    () =>
      filterDaysInRange(days, start, end).sort((a, b) =>
        dayDateIso(a).localeCompare(dayDateIso(b)),
      ),
    [days, start, end],
  );

  const columnDateParts = useMemo(
    () => buildColumnDateParts(start, end),
    [start, end],
  );

  const accountRows = useMemo(
    () => buildAccountSpendTable(daysInRange, platformAccounts),
    [daysInRange, platformAccounts],
  );

  const accountOptions = useMemo(
    () =>
      [...platformAccounts]
        .filter((acc) => acc.uid || acc.name)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        ),
    [platformAccounts],
  );

  const visibleRows = useMemo(
    () =>
      accountRows.filter((row) => {
        if (
          selectedAccount !== "all" &&
          row.accountKey !== selectedAccount
        ) {
          return false;
        }
        const total = rowTotalForDisplayedRange(row, columnDateParts);
        return total !== "" && total != null && Number(total) !== 0;
      }),
    [accountRows, columnDateParts, selectedAccount],
  );

  const rangeTotalSpend = useMemo(
    () =>
      visibleRows.reduce(
        (sum, row) => sum + (Number(rowTotalForDisplayedRange(row, columnDateParts)) || 0),
        0,
      ),
    [visibleRows, columnDateParts],
  );

  const dateInputMin = cacheBounds.min || undefined;
  const dateInputMax =
    cacheBounds.max && cacheBounds.max < todayStr
      ? cacheBounds.max
      : todayStr;

  const selectClassName =
    "block rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TV AdSpend</h1>
              {dateRangeLabel && (
                <p className="text-gray-600 mt-1">{dateRangeLabel}</p>
              )}
              {timezone && (
                <p className="text-sm text-gray-500 mt-1">Timezone: {timezone}</p>
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
                    htmlFor="tv-adspend-start"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start
                  </label>
                  <input
                    id="tv-adspend-start"
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
                    htmlFor="tv-adspend-end"
                    className="text-sm font-medium text-gray-700"
                  >
                    End
                  </label>
                  <input
                    id="tv-adspend-end"
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

          <div className="flex flex-wrap gap-2 mb-6">
            {TRAFFIC_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSource(source.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedSource === source.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>

          {loading && (
            <p className="text-gray-500">Loading ad spend data…</p>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {!loading && emptyState && !error && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <p className="text-lg font-medium text-gray-800">
                No TV ad spend data yet.
              </p>
            </div>
          )}

          {!loading && !emptyState && !error && days.length > 0 && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                  <span>
                    Traffic source:{" "}
                    <strong className="text-gray-900">
                      {TRAFFIC_SOURCES.find((s) => s.id === selectedSource)
                        ?.label || selectedSource}
                    </strong>
                  </span>
                  <span>
                    Accounts:{" "}
                    <strong className="text-gray-900 tabular-nums">
                      {visibleRows.length}
                    </strong>
                  </span>
                  <span>
                    Range total:{" "}
                    <strong className="text-gray-900 tabular-nums">
                      {formatCurrency(rangeTotalSpend)}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="tv-adspend-account"
                    className="text-sm font-medium text-gray-700"
                  >
                    Account
                  </label>
                  <select
                    id="tv-adspend-account"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className={`${selectClassName} min-w-[14rem]`}
                  >
                    <option value="all">All accounts</option>
                    {accountOptions.map((acc) => (
                      <option key={acc.uid || acc.name} value={acc.uid || acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {daysInRange.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No cached data for the selected date range.
                </p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        {TABLE_DAYS.map((day, i) => (
                          <th
                            key={day}
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider align-top"
                          >
                            <span className="block">{day}</span>
                            <div className="mt-0.5 flex flex-row flex-wrap items-center justify-end gap-0.5">
                              {columnDateParts[i].length === 0 ? (
                                <span className="text-[10px] font-normal normal-case tracking-normal text-gray-400 tabular-nums">
                                  —
                                </span>
                              ) : (
                                columnDateParts[i].map((part, j) => (
                                  <div
                                    key={`${day}-${j}`}
                                    className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] font-normal normal-case leading-tight tracking-normal text-gray-600 tabular-nums"
                                  >
                                    {part}
                                  </div>
                                ))
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={TABLE_DAYS.length + 2}
                            className="px-4 py-8 text-sm text-gray-500 text-center"
                          >
                            No account spend for the selected date range.
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((row) => {
                          const rowTotal = rowTotalForDisplayedRange(
                            row,
                            columnDateParts,
                          );

                          return (
                            <tr
                              key={row.accountKey}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                {row.accountName}
                              </td>
                              {TABLE_DAYS.map((day, dayIndex) => {
                                const amount = sumCellSpendByLabels(
                                  row[day],
                                  columnDateParts?.[dayIndex] || [],
                                );

                                return (
                                  <td
                                    key={day}
                                    className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap tabular-nums"
                                  >
                                    {formatCurrency(amount)}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap font-medium tabular-nums">
                                {formatCurrency(rowTotal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TvAdSpend;

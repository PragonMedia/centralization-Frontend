import { useEffect, useState } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

const TABLE_FIELDS = [
  { key: "ph", label: "Phone Number" },
  { key: "em", label: "Email" },
  { key: "fn", label: "First Name" },
  { key: "ln", label: "Last Name" },
  { key: "db", label: "Date of Birth" },
  { key: "aGA", label: "Mobile ID" },
  { key: "ct", label: "City" },
  { key: "st", label: "State" },
  { key: "zp", label: "Zip Code" },
  { key: "country", label: "Country" },
  { key: "client_ip_address", label: "IP" },
];

function displayValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && value.trim() === "") return "-";
  return value;
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createdAtToInputDate(createdAt) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return toInputDate(d);
}

function shiftDateString(dateStr, dayDelta) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + dayDelta);
  return toInputDate(date);
}

function RokuLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));

  useEffect(() => {
    let cancelled = false;

    async function fetchRokuLogs() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(API_ENDPOINTS.ROKU_LOGS.LIST, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(
            errBody.error || errBody.message || `HTTP ${response.status}`,
          );
        }

        const data = await response.json();
        if (cancelled) return;

        const payload = Array.isArray(data) ? data[0] : data;
        const logsData = Array.isArray(payload?.logs) ? payload.logs : [];

        setLogs(logsData);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load Roku logs.");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRokuLogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLogs = logs.filter(
    (log) => createdAtToInputDate(log?.createdAt) === selectedDate,
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="flex min-w-[4.75rem] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                aria-live="polite"
                title="Logs on the selected day (from loaded data)"
              >
                <span className="text-4xl sm:text-5xl font-bold leading-none text-gray-800 tabular-nums">
                  {loading || error ? "—" : filteredLogs.length}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Roku Logs
                </h1>
                <p className="text-gray-600">Caller logs from Roku endpoint.</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col">
                <label
                  htmlFor="roku-logs-date"
                  className="text-xs font-medium text-gray-600 mb-1"
                >
                  Filter Date
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate((prev) => shiftDateString(prev, -1))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Previous day"
                    title="Previous day"
                  >
                    ←
                  </button>
                  <input
                    id="roku-logs-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate((prev) => shiftDateString(prev, 1))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Next day"
                    title="Next day"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading && <p className="text-gray-500">Loading logs...</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}
          {!loading && !error && filteredLogs.length === 0 && (
            <p className="text-gray-500">No logs found.</p>
          )}

          {!loading && !error && filteredLogs.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {TABLE_FIELDS.map((field) => (
                      <th
                        key={field.key}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => {
                    const userData = log?.plainUserData || {};
                    return (
                      <tr
                        key={log._id || JSON.stringify(log)}
                        className="hover:bg-gray-50"
                      >
                        {TABLE_FIELDS.map((field) => (
                          <td
                            key={`${log._id || "log"}-${field.key}`}
                            className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                          >
                            {field.key === "aGA"
                              ? hasValue(userData[field.key])
                                ? "Yes"
                                : "No"
                              : displayValue(userData[field.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RokuLogs;

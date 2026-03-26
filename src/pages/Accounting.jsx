import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const TABLE_DAYS = DAY_NAMES.filter((d) => d !== "Sunday");

const DEFAULT_START = "2026-03-08";
const DEFAULT_END = "2026-03-14";

function parseDayToWeekday(dayStr) {
  const [mm, dd, yyyy] = dayStr.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return DAY_NAMES[date.getDay()];
}

function buildBuyerTable(revenue) {
  const emptyDayCell = () => ({ conversionAmount: "", buyerConversionAmount: "" });
  const buyerMap = {};
  const buyerHasComparison = new Set();

  revenue.forEach((dayEntry) => {
    const weekday = parseDayToWeekday(dayEntry.day);
    (dayEntry.records || []).forEach((record) => {
      const buyer = record.buyer;
      if (!buyerMap[buyer]) buyerMap[buyer] = Object.fromEntries(DAY_NAMES.map((d) => [d, emptyDayCell()]));
      buyerMap[buyer][weekday] = {
        conversionAmount: record.conversionAmount ?? "",
        buyerConversionAmount: record.buyerConversionAmount ?? "",
      };
      if (record.buyerConversionAmount != null && String(record.buyerConversionAmount).trim() !== "") {
        buyerHasComparison.add(buyer);
      }
    });
  });

  const buyers = Object.keys(buyerMap)
    .filter((b) => buyerHasComparison.has(b))
    .sort();
  return buyers.map((buyer) => ({
    buyer,
    ...Object.fromEntries(DAY_NAMES.map((d) => [d, buyerMap[buyer][d]])),
  }));
}

function formatAmount(val) {
  if (val === "" || val == null) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(num)) return val;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function parseAmount(val) {
  if (val === "" || val == null) return 0;
  const num = typeof val === "string" ? parseFloat(val) : val;
  return Number.isNaN(num) ? 0 : num;
}

function isOverThreshold(ourAmount, buyerAmount) {
  const our = typeof ourAmount === "number" ? ourAmount : parseAmount(ourAmount);
  const buyer = typeof buyerAmount === "number" ? buyerAmount : parseAmount(buyerAmount);
  if (our <= 0) return false;
  return buyer < our * 0.97;
}

function rowTotals(row) {
  let totalOur = 0;
  let totalBuyer = 0;
  TABLE_DAYS.forEach((day) => {
    const cell = row[day];
    const isObj = typeof cell === "object" && cell !== null;
    if (isObj) {
      totalOur += parseAmount(cell.conversionAmount);
      totalBuyer += parseAmount(cell.buyerConversionAmount);
    }
  });
  return { totalOur, totalBuyer };
}

function formatDateRange(startStr, endStr) {
  if (!startStr || !endStr) return "";
  const format = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  return `${format(startStr)} – ${format(endStr)}`;
}

function Accounting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [showAddBuyerModal, setShowAddBuyerModal] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [addBuyerForm, setAddBuyerForm] = useState({
    buyer: "",
    accountID: "",
  });
  const [addBuyerErrors, setAddBuyerErrors] = useState({});
  const [addBuyerSubmitting, setAddBuyerSubmitting] = useState(false);
  const [addBuyerSubmitError, setAddBuyerSubmitError] = useState(null);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.ACCOUNTING.REVENUE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ start, end }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (Array.isArray(json) && json[0]?.companies) {
        setData(json[0]);
      } else if (json?.companies) {
        setData(json);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e.message || "Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const companies = data?.companies ?? [];
  const pgnmCompany = companies.find((c) => c.companyName === "PGNM");
  const tables = pgnmCompany
    ? [{ companyName: pgnmCompany.companyName, rows: buildBuyerTable(pgnmCompany.revenue ?? []) }]
    : [];

  const dateRangeLabel = formatDateRange(start, end);

  const buyerSearchLower = buyerSearch.trim().toLowerCase();
  const filterRows = (rows) =>
    !buyerSearchLower
      ? rows
      : rows.filter((row) => row.buyer.toLowerCase().includes(buyerSearchLower));

  const handleEditBuyer = (buyerName, companyName) => {
    // Placeholder – will wire up in the future
    console.log("Edit buyer:", buyerName, companyName);
  };

  const closeAddBuyerModal = () => {
    setShowAddBuyerModal(false);
    setAddBuyerForm({ buyer: "", accountID: "" });
    setAddBuyerErrors({});
    setAddBuyerSubmitError(null);
  };

  const validateAddBuyer = () => {
    const errs = {};
    if (!addBuyerForm.buyer?.trim()) errs.buyer = "Buyer is required.";
    if (!addBuyerForm.accountID?.trim()) errs.accountID = "Account ID is required.";
    setAddBuyerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddBuyerSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddBuyer()) return;
    setAddBuyerSubmitting(true);
    setAddBuyerSubmitError(null);
    try {
      const res = await fetch(API_ENDPOINTS.ACCOUNTING.COMPANIES, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyName: addBuyerForm.buyer.trim(),
          accountID: addBuyerForm.accountID.trim(),
          apiToken:
            "09f0c9f0610c100d3fd39e42bcdd71327611addf812f3767339281515f52231e5c4470281d7ab1cfa456fed246be0b07c8fed2ee9eb5137ce8f3dde3c2d042a337d39d9f692c78e58a48b251deef9375d89fa04159778f44d89696be0051ed44ccffdd67ec4c35bb6f79e8167139015f2e671e5a",
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }
      closeAddBuyerModal();
      fetchRevenue();
    } catch (err) {
      setAddBuyerSubmitError(err.message || "Failed to add buyer.");
    } finally {
      setAddBuyerSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounting</h1>
              {dateRangeLabel && (
                <p className="text-gray-600 mt-1">{dateRangeLabel}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddBuyerModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Buyer
              </button>
            </div>
          </div>

          {loading && (
            <p className="text-gray-500">Loading revenue data…</p>
          )}

          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}

          {!loading && !error && tables.length === 0 && (
            <p className="text-gray-500">No revenue data for this period.</p>
          )}

          {!loading && !error && tables.map(({ companyName, rows }) => {
            const filteredRows = filterRows(rows);
            return (
            <div key={companyName} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{companyName}</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 sr-only">Search buyers</label>
                  <input
                    type="text"
                    placeholder="Search buyers..."
                    value={buyerSearch}
                    onChange={(e) => setBuyerSearch(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40 sm:w-48"
                  />
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      {TABLE_DAYS.map((day) => (
                        <th
                          key={day}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {day}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRows.map((row) => (
                      <tr key={row.buyer} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditBuyer(row.buyer, companyName)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Edit buyer"
                              aria-label={`Edit ${row.buyer}`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {row.buyer}
                          </span>
                        </td>
                        {TABLE_DAYS.map((day) => {
                            const cell = row[day];
                            const isObj = typeof cell === "object" && cell !== null;
                            const ourAmount = isObj ? cell.conversionAmount : (cell ?? "");
                            const buyerAmount = isObj ? (cell.buyerConversionAmount ?? "") : "";
                            const highlight = isOverThreshold(ourAmount, buyerAmount);
                            return (
                              <td
                                key={day}
                                className={`px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap ${highlight ? "bg-red-50" : ""}`}
                              >
                                <span className="block">{formatAmount(ourAmount)}</span>
                                {buyerAmount !== "" && buyerAmount != null && (
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    {formatAmount(buyerAmount)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        {(() => {
                            const { totalOur, totalBuyer } = rowTotals(row);
                            const totalHighlight = isOverThreshold(totalOur, totalBuyer);
                            return (
                              <td
                                className={`px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap font-medium ${totalHighlight ? "bg-red-50" : ""}`}
                              >
                                <span className="block">{formatAmount(totalOur)}</span>
                                <span className="block text-xs text-gray-500 mt-0.5">
                                  {formatAmount(totalBuyer)}
                                </span>
                              </td>
                            );
                          })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">No buyers match your search.</p>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {/* Add Buyer Modal */}
      {showAddBuyerModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-900/50"
            aria-hidden="true"
            onClick={closeAddBuyerModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md mx-auto relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleAddBuyerSubmit} className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Buyer</h3>

                {addBuyerSubmitError && (
                  <p className="text-red-600 text-sm mb-4">{addBuyerSubmitError}</p>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="add-buyer-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Buyer <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="add-buyer-name"
                      type="text"
                      required
                      value={addBuyerForm.buyer}
                      onChange={(e) => setAddBuyerForm((f) => ({ ...f, buyer: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. DigiPeak"
                    />
                    {addBuyerErrors.buyer && (
                      <p className="text-red-600 text-xs mt-1">{addBuyerErrors.buyer}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="add-buyer-account" className="block text-sm font-medium text-gray-700 mb-1">
                      Account ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="add-buyer-account"
                      type="text"
                      required
                      value={addBuyerForm.accountID}
                      onChange={(e) => setAddBuyerForm((f) => ({ ...f, accountID: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. RA110a95eea0454b979be600f48e4b6d5e"
                    />
                    {addBuyerErrors.accountID && (
                      <p className="text-red-600 text-xs mt-1">{addBuyerErrors.accountID}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={closeAddBuyerModal}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={addBuyerSubmitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {addBuyerSubmitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Accounting;

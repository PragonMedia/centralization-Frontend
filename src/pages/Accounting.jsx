import { useState, useEffect, useCallback, useMemo } from "react";
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
// Display order: Mon..Sat..Sun (Sunday on the far right)
const TABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Every calendar day in [startStr, endStr] inclusive (YYYY-MM-DD). */
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
  )
    return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** m/d e.g. 3/23 */
function formatDayMonthShort(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Per weekday: formatted m/d strings for each date in range (shown as mini cards in the UI). */
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

const NET_OPTIONS = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

/** Normalize stored net to a filter key; empty / unknown → weekly (default). */
function canonicalizeNet(net) {
  if (net == null || String(net).trim() === "") return "weekly";
  let s = String(net).trim().toLowerCase();
  s = s.replace(/[\s\u2010\u2011\u2012\u2013\u2014\u2212\-_.]+/g, "");
  if (s === "weekly") return "weekly";
  if (s === "biweekly") return "bi-weekly";
  if (s === "monthly") return "monthly";
  return "weekly";
}

function netSelectClassName() {
  return "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
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

/** Weekly / All: arrow moves the range by 7 days. */
const ACCOUNTING_DATE_ARROW_STEP_WEEKLY = 7;
/** Bi-weekly: each block is 14 inclusive days; arrows jump a full block (e.g. 16–29 → 2–15). */
const ACCOUNTING_BIWEEKLY_BLOCK_DAYS = 14;
/** Monthly cycle: ~4 weeks per view; arrows jump one full block. */
const ACCOUNTING_MONTHLY_BLOCK_DAYS = 28;

function getDefaultDateRange() {
  const today = new Date();
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const monday = new Date(endDate);
  const day = monday.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return {
    start: toInputDateString(monday),
    end: toInputDateString(endDate),
  };
}

function parseDayToWeekday(dayStr) {
  const [mm, dd, yyyy] = dayStr.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return DAY_NAMES[date.getDay()];
}

function parseDayStrToDate(dayStr) {
  const [mm, dd, yyyy] = dayStr.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/** Match table buyer names to company rows even when casing/spacing differs. */
function normalizeBuyerKey(name) {
  if (name == null || typeof name !== "string") return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Loose match: "Broker Calls" (Ringba) vs "brokercalls" (DB) → both "brokercalls".
 * Strips non-alphanumeric so spacing/punctuation differences still resolve.
 */
function normalizeBuyerKeyCompact(name) {
  if (name == null || typeof name !== "string") return "";
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mergeCompanyLookupEntry(map, key, accountID, net) {
  if (!key) return;
  const netStr = net != null ? String(net) : "";
  const prev = map.get(key);
  if (!prev) {
    map.set(key, { accountID: accountID || "", net: netStr });
  } else {
    if (!prev.accountID && accountID) prev.accountID = accountID;
    if (prev.net === "" && netStr !== "") prev.net = netStr;
  }
}

/** Net on company docs (tolerate API / serialization quirks). */
function companyNetFromDoc(c) {
  if (!c || typeof c !== "object") return "";
  const raw = c.net ?? c.Net;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim();
}

/** Map Ringba accountID → full company object (for net that only exists on DB company row). */
function buildCompanyByAccountId(allCompanies) {
  const m = new Map();
  for (const c of allCompanies) {
    const aid = c.accountID ?? c.accountId;
    if (aid == null || String(aid).trim() === "") continue;
    m.set(String(aid).trim(), c);
  }
  return m;
}

function parseCompaniesListResponse(json) {
  if (json == null) return null;
  if (Array.isArray(json)) return json;
  const candidates = [
    json.companies,
    json.data,
    json.items,
    json.results,
    json.companyList,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return null;
}

/** Map normalized company name → { accountID, net } from API `companies` list (same as DB docs). */
function buildCompanyLookup(allCompanies) {
  const byNorm = new Map();
  for (const c of allCompanies) {
    const label = c.companyName ?? c.name;
    if (label == null || String(label).trim() === "") continue;
    const str = String(label);
    const aid = c.accountID ?? c.accountId;
    const accountID =
      aid != null && String(aid).trim() !== "" ? String(aid).trim() : "";
    const netStr = companyNetFromDoc(c);
    mergeCompanyLookupEntry(byNorm, normalizeBuyerKey(str), accountID, netStr);
    mergeCompanyLookupEntry(
      byNorm,
      normalizeBuyerKeyCompact(str),
      accountID,
      netStr,
    );
  }
  return byNorm;
}

function lookupCompanyMeta(companyLookup, buyerName) {
  return (
    companyLookup.get(normalizeBuyerKey(buyerName)) ??
    companyLookup.get(normalizeBuyerKeyCompact(buyerName))
  );
}

function recordAccountId(record) {
  let aid =
    record.accountID ??
    record.accountId ??
    record.buyerAccountID ??
    record.ringbaAccountId;
  if (
    (aid == null || String(aid).trim() === "") &&
    record.company &&
    typeof record.company === "object"
  ) {
    aid = record.company.accountID ?? record.company.accountId;
  }
  return aid;
}

function buildBuyerTable(revenue, allCompanies = []) {
  const emptyDayCell = () => ({
    conversionAmount: "",
    buyerConversionAmount: "",
    // Per-date values within the selected range, keyed by the displayed m/d label.
    // Used by the Accounting "Individual" view toggle.
    perDateByLabel: {},
  });
  const buyerMap = {};
  const buyerMeta = {};
  const buyerHasComparison = new Set();
  const companyLookup = buildCompanyLookup(allCompanies);

  revenue.forEach((dayEntry) => {
    const weekday = parseDayToWeekday(dayEntry.day);
    const apiDate = parseDayStrToDate(dayEntry.day);
    const dateLabel =
      apiDate && !Number.isNaN(apiDate.getTime())
        ? formatDayMonthShort(apiDate)
        : "";
    (dayEntry.records || []).forEach((record) => {
      const buyer = record.buyer;
      if (!buyerMap[buyer])
        buyerMap[buyer] = Object.fromEntries(
          DAY_NAMES.map((d) => [d, emptyDayCell()]),
        );
      if (!buyerMeta[buyer]) buyerMeta[buyer] = { accountID: "", net: "" };
      const aid = recordAccountId(record);
      if (aid != null && String(aid).trim() !== "")
        buyerMeta[buyer].accountID = String(aid).trim();
      if (record.net != null) buyerMeta[buyer].net = String(record.net);
      const cell = buyerMap[buyer][weekday];

      // Sum values across multiple weeks in the selected range.
      if (
        record.conversionAmount != null &&
        String(record.conversionAmount).trim() !== ""
      ) {
        const addOur = parseAmount(record.conversionAmount);
        cell.conversionAmount =
          cell.conversionAmount === ""
            ? addOur
            : cell.conversionAmount + addOur;
        if (dateLabel) {
          const per = cell.perDateByLabel[dateLabel] || {
            conversionAmount: "",
            buyerConversionAmount: "",
          };
          per.conversionAmount =
            per.conversionAmount === ""
              ? addOur
              : per.conversionAmount + addOur;
          cell.perDateByLabel[dateLabel] = per;
        }
      }

      if (
        record.buyerConversionAmount != null &&
        String(record.buyerConversionAmount).trim() !== ""
      ) {
        const addBuyer = parseAmount(record.buyerConversionAmount);
        cell.buyerConversionAmount =
          cell.buyerConversionAmount === ""
            ? addBuyer
            : cell.buyerConversionAmount + addBuyer;
        if (dateLabel) {
          const per = cell.perDateByLabel[dateLabel] || {
            conversionAmount: "",
            buyerConversionAmount: "",
          };
          per.buyerConversionAmount =
            per.buyerConversionAmount === ""
              ? addBuyer
              : per.buyerConversionAmount + addBuyer;
          cell.perDateByLabel[dateLabel] = per;
        }
        buyerHasComparison.add(buyer);
      }
    });
  });

  const buyers = Object.keys(buyerMap)
    .filter((b) => buyerHasComparison.has(b))
    .sort();

  buyers.forEach((b) => {
    const fromLookup = lookupCompanyMeta(companyLookup, b);
    if (fromLookup) {
      if (!buyerMeta[b].accountID && fromLookup.accountID) {
        buyerMeta[b].accountID = fromLookup.accountID;
      }
      if (fromLookup.net != null && String(fromLookup.net).trim() !== "") {
        buyerMeta[b].net = String(fromLookup.net).trim();
      }
    }
  });

  const byAccountId = buildCompanyByAccountId(allCompanies);
  buyers.forEach((b) => {
    const id = buyerMeta[b].accountID;
    if (!id) return;
    const co = byAccountId.get(String(id).trim());
    if (!co) return;
    const n = companyNetFromDoc(co);
    if (n) buyerMeta[b].net = n;
  });

  return buyers.map((buyer) => ({
    buyer,
    accountID: buyerMeta[buyer]?.accountID ?? "",
    net: buyerMeta[buyer]?.net ?? "",
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
  const our =
    typeof ourAmount === "number" ? ourAmount : parseAmount(ourAmount);
  const buyer =
    typeof buyerAmount === "number" ? buyerAmount : parseAmount(buyerAmount);
  if (our <= 0) return false;
  return buyer < our * 0.97;
}

function rowTotals(row) {
  let sumOur = 0;
  let sumBuyer = 0;
  let hasOur = false;
  let hasBuyer = false;
  TABLE_DAYS.forEach((day) => {
    const cell = row[day];
    const isObj = typeof cell === "object" && cell !== null;
    if (isObj) {
      if (cell.conversionAmount !== "") {
        sumOur += parseAmount(cell.conversionAmount);
        hasOur = true;
      }
      if (cell.buyerConversionAmount !== "") {
        sumBuyer += parseAmount(cell.buyerConversionAmount);
        hasBuyer = true;
      }
    }
  });
  return {
    totalOur: hasOur ? sumOur : "",
    totalBuyer: hasBuyer ? sumBuyer : "",
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
  return `${format(startStr)} – ${format(endStr)}`;
}

function Accounting() {
  const defaultRange = getDefaultDateRange();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("accounting");
  const [amountMode, setAmountMode] = useState("total");
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);
  const [showAddBuyerModal, setShowAddBuyerModal] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [netFilter, setNetFilter] = useState("all");
  const [addBuyerForm, setAddBuyerForm] = useState({
    buyer: "",
    accountID: "",
    net: "weekly",
  });
  const [addBuyerErrors, setAddBuyerErrors] = useState({});
  const [addBuyerSubmitting, setAddBuyerSubmitting] = useState(false);
  const [addBuyerSubmitError, setAddBuyerSubmitError] = useState(null);

  const [showEditBuyerModal, setShowEditBuyerModal] = useState(false);
  const [editBuyerOriginalAccountId, setEditBuyerOriginalAccountId] =
    useState("");
  const [editBuyerOriginal, setEditBuyerOriginal] = useState({
    companyName: "",
    net: "",
  });
  const [editBuyerForm, setEditBuyerForm] = useState({
    companyName: "",
    net: "weekly",
    apiToken: "",
  });
  const [editBuyerSubmitting, setEditBuyerSubmitting] = useState(false);
  const [editBuyerSubmitError, setEditBuyerSubmitError] = useState(null);
  const [companiesDirectory, setCompaniesDirectory] = useState([]);

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
        throw new Error(
          errBody.error || errBody.message || `HTTP ${res.status}`,
        );
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.ACCOUNTING.COMPANIES, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (!res.ok || cancelled) return;
        const json = await res.json().catch(() => null);
        const list = parseCompaniesListResponse(json);
        if (!cancelled && Array.isArray(list)) setCompaniesDirectory(list);
      } catch {
        /* optional — revenue payload may already include companies */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const companies = data?.companies ?? [];
  const companiesForLookup = useMemo(
    () => [...companies, ...companiesDirectory],
    [companies, companiesDirectory],
  );
  const pgnmCompany = companies.find(
    (c) => normalizeBuyerKey(c.companyName ?? c.name) === "pgnm",
  );
  const tables = pgnmCompany
    ? [
        {
          companyName: pgnmCompany.companyName,
          rows: buildBuyerTable(pgnmCompany.revenue ?? [], companiesForLookup),
        },
      ]
    : [];

  const dateRangeLabel = formatDateRange(start, end);
  const columnDateParts = useMemo(
    () => buildColumnDateParts(start, end),
    [start, end],
  );

  const todayStr = toInputDateString(new Date());
  const arrowStepForNextCheck =
    netFilter === "bi-weekly"
      ? ACCOUNTING_BIWEEKLY_BLOCK_DAYS
      : netFilter === "monthly"
        ? ACCOUNTING_MONTHLY_BLOCK_DAYS
        : ACCOUNTING_DATE_ARROW_STEP_WEEKLY;
  const nextRangeEnd =
    start && end ? shiftDateString(end, arrowStepForNextCheck) : "";
  const canShiftDateRight =
    netFilter === "bi-weekly" || netFilter === "monthly"
      ? Boolean(start && end && end < todayStr)
      : Boolean(start && end && nextRangeEnd) && nextRangeEnd <= todayStr;

  const handleNetFilterChange = (e) => {
    setNetFilter(e.target.value);
  };

  const handleShiftDateRange = (direction) => {
    const today = toInputDateString(new Date());
    const w = ACCOUNTING_DATE_ARROW_STEP_WEEKLY;
    const bi = ACCOUNTING_BIWEEKLY_BLOCK_DAYS;
    const mo = ACCOUNTING_MONTHLY_BLOCK_DAYS;

    if (netFilter === "bi-weekly") {
      if (direction === "prev") {
        setStart(shiftDateString(start, -bi));
        setEnd(shiftDateString(end, -bi));
        return;
      }
      let newStart = shiftDateString(start, bi);
      let newEnd = shiftDateString(end, bi);
      if (newEnd > today) {
        newEnd = today;
        newStart = shiftDateString(today, -(bi - 1));
      }
      setStart(newStart);
      setEnd(newEnd);
      return;
    }

    if (netFilter === "monthly") {
      if (direction === "prev") {
        setStart(shiftDateString(start, -mo));
        setEnd(shiftDateString(end, -mo));
        return;
      }
      let newStart = shiftDateString(start, mo);
      let newEnd = shiftDateString(end, mo);
      if (newEnd > today) {
        newEnd = today;
        newStart = shiftDateString(today, -(mo - 1));
      }
      setStart(newStart);
      setEnd(newEnd);
      return;
    }

    if (direction === "prev") {
      setStart((s) => shiftDateString(s, -w));
      setEnd((e) => shiftDateString(e, -w));
      return;
    }
    const newEnd = shiftDateString(end, w);
    const newStart = shiftDateString(start, w);
    if (newEnd > today) return;
    setStart(newStart);
    setEnd(newEnd);
  };

  const buyerSearchLower = buyerSearch.trim().toLowerCase();
  const filterRows = (rows) => {
    let r = rows;
    if (netFilter !== "all") {
      r = r.filter((row) => canonicalizeNet(row.net) === netFilter);
    }
    if (buyerSearchLower) {
      r = r.filter((row) => row.buyer.toLowerCase().includes(buyerSearchLower));
    }
    return r;
  };
  const buyerDirectoryRows = useMemo(() => {
    const byBuyer = new Map();
    companiesForLookup.forEach((company) => {
      const buyer = String(company.companyName ?? company.name ?? "").trim();
      if (!buyer) return;
      const key = normalizeBuyerKey(buyer);
      if (key === "pgnm") return;
      if (!key || byBuyer.has(key)) return;
      byBuyer.set(key, {
        buyer,
        net: companyNetFromDoc(company),
        accountID: String(company.accountID ?? company.accountId ?? "").trim(),
      });
    });
    return Array.from(byBuyer.values()).sort((a, b) =>
      a.buyer.localeCompare(b.buyer),
    );
  }, [companiesForLookup]);
  const filteredBuyerDirectoryRows = filterRows(buyerDirectoryRows);

  const closeEditBuyerModal = () => {
    setShowEditBuyerModal(false);
    setEditBuyerOriginalAccountId("");
    setEditBuyerOriginal({ companyName: "", net: "" });
    setEditBuyerForm({ companyName: "", net: "weekly", apiToken: "" });
    setEditBuyerSubmitError(null);
  };

  const openEditBuyer = (row) => {
    const netVal = canonicalizeNet(row.net);
    setEditBuyerOriginalAccountId(row.accountID || "");
    setEditBuyerOriginal({
      companyName: row.buyer,
      net: netVal,
    });
    setEditBuyerForm({
      companyName: row.buyer,
      net: netVal,
      apiToken: "",
    });
    setEditBuyerSubmitError(null);
    setShowEditBuyerModal(true);
  };

  const handleEditBuyerSubmit = async (e) => {
    e.preventDefault();
    if (!editBuyerOriginalAccountId.trim()) {
      setEditBuyerSubmitError(
        "This buyer has no Account ID in the response; cannot save edits.",
      );
      return;
    }

    const body = {};
    const nameTrim = editBuyerForm.companyName.trim();
    if (nameTrim !== editBuyerOriginal.companyName.trim()) {
      if (!nameTrim) {
        setEditBuyerSubmitError("Buyer name cannot be empty.");
        return;
      }
      body.companyName = nameTrim;
    }

    if (editBuyerForm.net !== editBuyerOriginal.net) {
      body.net = editBuyerForm.net;
    }

    const tokenTrim = editBuyerForm.apiToken.trim();
    if (tokenTrim) {
      body.apiToken = tokenTrim;
    }

    if (Object.keys(body).length === 0) {
      setEditBuyerSubmitError("Change at least one field, or use Close.");
      return;
    }

    setEditBuyerSubmitting(true);
    setEditBuyerSubmitError(null);
    try {
      const res = await fetch(
        API_ENDPOINTS.ACCOUNTING.UPDATE_COMPANY(
          editBuyerOriginalAccountId.trim(),
        ),
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || errBody.message || `HTTP ${res.status}`,
        );
      }
      closeEditBuyerModal();
      fetchRevenue();
    } catch (err) {
      setEditBuyerSubmitError(err.message || "Failed to update buyer.");
    } finally {
      setEditBuyerSubmitting(false);
    }
  };

  const closeAddBuyerModal = () => {
    setShowAddBuyerModal(false);
    setAddBuyerForm({ buyer: "", accountID: "", net: "weekly" });
    setAddBuyerErrors({});
    setAddBuyerSubmitError(null);
  };

  const validateAddBuyer = () => {
    const errs = {};
    if (!addBuyerForm.buyer?.trim()) errs.buyer = "Buyer is required.";
    if (!addBuyerForm.accountID?.trim())
      errs.accountID = "Account ID is required.";
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
          net: addBuyerForm.net,
          apiToken:
            "09f0c9f0610c100d3fd39e42bcdd71327611addf812f3767339281515f52231e5c4470281d7ab1cfa456fed246be0b07c8fed2ee9eb5137ce8f3dde3c2d042a337d39d9f692c78e58a48b251deef9375d89fa04159778f44d89696be0051ed44ccffdd67ec4c35bb6f79e8167139015f2e671e5a",
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || errBody.message || `HTTP ${res.status}`,
        );
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
            {activeTab === "accounting" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleShiftDateRange("prev")}
                    disabled={!start || !end}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={
                      netFilter === "bi-weekly"
                        ? "Previous two-week block"
                        : netFilter === "monthly"
                          ? "Previous four-week block"
                          : "Shift range back one week"
                    }
                    title={
                      netFilter === "bi-weekly"
                        ? "Go to the previous 14-day period (e.g. weeks 1–2 ↔ 3–4)"
                        : netFilter === "monthly"
                          ? "Go to the previous ~4-week period"
                          : "Shift range back one week"
                    }
                  >
                    ←
                  </button>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Start
                    </label>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      End
                    </label>
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleShiftDateRange("next")}
                    disabled={!canShiftDateRight}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={
                      netFilter === "bi-weekly"
                        ? "Next two-week block"
                        : netFilter === "monthly"
                          ? "Next four-week block"
                          : "Shift range forward one week"
                    }
                    title={
                      canShiftDateRight
                        ? netFilter === "bi-weekly"
                          ? "Go to the next 14-day period (toward today)"
                          : netFilter === "monthly"
                            ? "Go to the next ~4-week period (toward today)"
                            : "Shift range forward one week"
                        : "Range is already at or past today"
                    }
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6" aria-label="Accounting tabs">
              <button
                type="button"
                onClick={() => setActiveTab("accounting")}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                  activeTab === "accounting"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Accounting
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("buyers")}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                  activeTab === "buyers"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Buyers
              </button>
            </nav>
          </div>

          {loading && <p className="text-gray-500">Loading revenue data…</p>}

          {error && <p className="text-red-600 mb-4">{error}</p>}

          {!loading && !error && tables.length === 0 && (
            <p className="text-gray-500">No revenue data for this period.</p>
          )}

          {activeTab === "accounting" &&
            !loading &&
            !error &&
            tables.map(({ companyName, rows }) => {
              const filteredRows = filterRows(rows);
              return (
                <div key={companyName} className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setAmountMode("total")}
                          className={`px-2 py-2 text-xs font-medium ${
                            amountMode === "total"
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Total
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmountMode("individual")}
                          className={`px-2 py-2 text-xs font-medium ${
                            amountMode === "individual"
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Individual
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="accounting-net-filter"
                          className="text-sm font-medium text-gray-700 whitespace-nowrap"
                        >
                          Cycle
                        </label>
                        <select
                          id="accounting-net-filter"
                          value={netFilter}
                          onChange={handleNetFilterChange}
                          className={`${netSelectClassName()} w-[11rem]`}
                        >
                          {NET_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="text-sm font-medium text-gray-700 sr-only">
                        Search buyers
                      </label>
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
                        {filteredRows.map((row) => (
                          <tr key={row.buyer} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                              {row.buyer}
                            </td>
                            {TABLE_DAYS.map((day, dayIndex) => {
                              const cell = row[day];
                              const isObj =
                                typeof cell === "object" && cell !== null;
                              const ourAmountTotal = isObj
                                ? cell.conversionAmount
                                : (cell ?? "");
                              const buyerAmountTotal = isObj
                                ? (cell.buyerConversionAmount ?? "")
                                : "";
                              const highlightTotal =
                                buyerAmountTotal !== "" &&
                                buyerAmountTotal != null &&
                                isOverThreshold(
                                  ourAmountTotal,
                                  buyerAmountTotal,
                                );

                              return (
                                <td
                                  key={day}
                                  className={`px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap ${
                                    amountMode === "total" && highlightTotal ? "bg-red-50" : ""
                                  }`}
                                >
                                  {amountMode === "total" ? (
                                    <>
                                      <span className="block">
                                        {formatAmount(ourAmountTotal)}
                                      </span>
                                      {buyerAmountTotal !== "" &&
                                        buyerAmountTotal != null && (
                                          <span className="block text-xs text-gray-500 mt-0.5">
                                            {formatAmount(buyerAmountTotal)}
                                          </span>
                                        )}
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-end gap-0.5">
                                      {(columnDateParts?.[dayIndex] || [])
                                        .length === 0 ? (
                                        <span className="text-[11px] text-gray-400 tabular-nums">
                                          {formatAmount("")}
                                        </span>
                                      ) : (
                                        (columnDateParts?.[dayIndex] || []).map(
                                          (label) => {
                                            const per = isObj
                                              ? cell.perDateByLabel?.[label] ||
                                                null
                                              : null;
                                            const ourAmount =
                                              per?.conversionAmount ?? "";
                                            const buyerAmount =
                                              per?.buyerConversionAmount ?? "";
                                            const highlight =
                                              buyerAmount !== "" &&
                                              buyerAmount != null &&
                                              isOverThreshold(
                                                ourAmount,
                                                buyerAmount,
                                              );

                                            return (
                                              <div
                                                key={`${day}-${label}`}
                                                className={`rounded border px-1 py-0.5 text-right ${
                                                  highlight
                                                    ? "border-red-200 bg-red-50"
                                                    : "border-gray-200 bg-gray-50"
                                                }`}
                                              >
                                                <div className="text-[11px] leading-tight text-gray-700 tabular-nums">
                                                  {formatAmount(ourAmount)}
                                                </div>
                                                {buyerAmount !== "" &&
                                                  buyerAmount != null && (
                                                    <div className="text-[9px] leading-tight text-gray-500 tabular-nums">
                                                      {formatAmount(
                                                        buyerAmount,
                                                      )}
                                                    </div>
                                                  )}
                                              </div>
                                            );
                                          },
                                        )
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            {(() => {
                              const { totalOur, totalBuyer } = rowTotals(row);
                              const totalHighlight =
                                totalBuyer !== "" &&
                                totalBuyer != null &&
                                isOverThreshold(totalOur, totalBuyer);
                              const maxIndividualPeriods = Math.max(
                                0,
                                ...columnDateParts.map((parts) => parts.length),
                              );

                              return (
                                <td
                                  className={`px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap font-medium ${
                                    totalHighlight ? "bg-red-50" : ""
                                  }`}
                                >
                                  {amountMode === "total" ? (
                                    <>
                                      <span className="block">
                                        {formatAmount(totalOur)}
                                      </span>
                                      <span className="block text-xs text-gray-500 mt-0.5">
                                        {formatAmount(totalBuyer)}
                                      </span>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-end gap-0.5">
                                      {Array.from(
                                        { length: maxIndividualPeriods },
                                        (_, periodIndex) => {
                                          let periodOur = 0;
                                          let periodBuyer = 0;
                                          let hasOur = false;
                                          let hasBuyer = false;

                                          TABLE_DAYS.forEach((day, dayIdx) => {
                                            const label = columnDateParts?.[dayIdx]?.[periodIndex];
                                            if (!label) return;
                                            const dayCell = row[day];
                                            const dayObj =
                                              typeof dayCell === "object" && dayCell !== null
                                                ? dayCell
                                                : null;
                                            const per = dayObj?.perDateByLabel?.[label];
                                            if (!per) return;

                                            if (per.conversionAmount !== "" && per.conversionAmount != null) {
                                              periodOur += parseAmount(per.conversionAmount);
                                              hasOur = true;
                                            }
                                            if (
                                              per.buyerConversionAmount !== "" &&
                                              per.buyerConversionAmount != null
                                            ) {
                                              periodBuyer += parseAmount(per.buyerConversionAmount);
                                              hasBuyer = true;
                                            }
                                          });

                                          const ourVal = hasOur ? periodOur : "";
                                          const buyerVal = hasBuyer ? periodBuyer : "";
                                          const highlight =
                                            buyerVal !== "" &&
                                            buyerVal != null &&
                                            isOverThreshold(ourVal, buyerVal);

                                          return (
                                            <div
                                              key={`total-period-${periodIndex}`}
                                              className={`rounded border px-1 py-0.5 text-right ${
                                                highlight
                                                  ? "border-red-200 bg-red-50"
                                                  : "border-gray-200 bg-gray-50"
                                              }`}
                                            >
                                              <div className="text-[11px] leading-tight text-gray-700 tabular-nums">
                                                {formatAmount(ourVal)}
                                              </div>
                                              <div className="text-[9px] leading-tight text-gray-500 tabular-nums">
                                                {formatAmount(buyerVal)}
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredRows.length === 0 && (
                    <p className="text-gray-500 text-sm mt-2">
                      No buyers match this cycle filter or your search.
                    </p>
                  )}
                </div>
              );
            })}

          {activeTab === "buyers" && !loading && !error && (
            <div className="mb-2">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="buyers-net-filter"
                      className="text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      Cycle
                    </label>
                    <select
                      id="buyers-net-filter"
                      value={netFilter}
                      onChange={handleNetFilterChange}
                      className={`${netSelectClassName()} w-[11rem]`}
                    >
                      {NET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="text-sm font-medium text-gray-700 sr-only">
                    Search buyers
                  </label>
                  <input
                    type="text"
                    placeholder="Search buyers..."
                    value={buyerSearch}
                    onChange={(e) => setBuyerSearch(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40 sm:w-48"
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

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cycle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account ID
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBuyerDirectoryRows.map((row) => (
                      <tr
                        key={`${row.buyer}-${row.accountID || "na"}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.buyer}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {NET_OPTIONS.find(
                            (o) => o.value === canonicalizeNet(row.net),
                          )?.label || "Weekly"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {row.accountID || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditBuyer(row)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredBuyerDirectoryRows.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  No buyers match this cycle filter or your search.
                </p>
              )}
            </div>
          )}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Buyer
                </h3>

                {addBuyerSubmitError && (
                  <p className="text-red-600 text-sm mb-4">
                    {addBuyerSubmitError}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="add-buyer-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Buyer <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="add-buyer-name"
                      type="text"
                      required
                      value={addBuyerForm.buyer}
                      onChange={(e) =>
                        setAddBuyerForm((f) => ({
                          ...f,
                          buyer: e.target.value,
                        }))
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. DigiPeak"
                    />
                    {addBuyerErrors.buyer && (
                      <p className="text-red-600 text-xs mt-1">
                        {addBuyerErrors.buyer}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="add-buyer-account"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Account ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="add-buyer-account"
                      type="text"
                      required
                      value={addBuyerForm.accountID}
                      onChange={(e) =>
                        setAddBuyerForm((f) => ({
                          ...f,
                          accountID: e.target.value,
                        }))
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. RA110a95eea0454b979be600f48e4b6d5e"
                    />
                    {addBuyerErrors.accountID && (
                      <p className="text-red-600 text-xs mt-1">
                        {addBuyerErrors.accountID}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="add-buyer-net"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Billing Cycle
                    </label>
                    <select
                      id="add-buyer-net"
                      value={addBuyerForm.net}
                      onChange={(e) =>
                        setAddBuyerForm((f) => ({ ...f, net: e.target.value }))
                      }
                      className={netSelectClassName()}
                    >
                      {NET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
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

      {/* Edit Buyer Modal */}
      {showEditBuyerModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-900/50"
            aria-hidden="true"
            onClick={closeEditBuyerModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md mx-auto relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleEditBuyerSubmit} className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit buyer
                </h3>

                {!editBuyerOriginalAccountId.trim() && (
                  <p className="text-amber-700 text-sm mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No Ringba Account ID was found for this row. Saving is
                    disabled until the API includes
                    <code className="mx-1">accountID</code>
                    on revenue records or a matching company in the response.
                  </p>
                )}

                {editBuyerSubmitError && (
                  <p className="text-red-600 text-sm mb-4">
                    {editBuyerSubmitError}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="edit-buyer-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Buyer name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-buyer-name"
                      type="text"
                      required
                      value={editBuyerForm.companyName}
                      onChange={(e) =>
                        setEditBuyerForm((f) => ({
                          ...f,
                          companyName: e.target.value,
                        }))
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-buyer-net"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Billing Cycle
                    </label>
                    <select
                      id="edit-buyer-net"
                      value={editBuyerForm.net}
                      onChange={(e) =>
                        setEditBuyerForm((f) => ({ ...f, net: e.target.value }))
                      }
                      className={netSelectClassName()}
                    >
                      {NET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="edit-buyer-api"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      API (Ringba token)
                    </label>
                    <input
                      id="edit-buyer-api"
                      type="password"
                      autoComplete="new-password"
                      value={editBuyerForm.apiToken}
                      onChange={(e) =>
                        setEditBuyerForm((f) => ({
                          ...f,
                          apiToken: e.target.value,
                        }))
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Leave blank to keep the current token"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={closeEditBuyerModal}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={
                      editBuyerSubmitting || !editBuyerOriginalAccountId.trim()
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {editBuyerSubmitting ? "Saving…" : "Save"}
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

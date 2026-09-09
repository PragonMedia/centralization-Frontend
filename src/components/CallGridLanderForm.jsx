import { useState, useEffect, useCallback } from "react";
import TemplatePreview from "./TemplatePreview";
import {
  API_ENDPOINTS,
  getAuthHeaders,
} from "../config/api.js";
import { cachedFetch, CACHE_CONFIG, invalidateCache } from "../utils/cache.js";
import { sanitizeInput, validateInput } from "../utils/sanitization.js";
import { domainMatchesLanderVertical } from "../constants/domainVerticals.js";

/** Lander vertical for domain filtering (domains store Medicare / Medicare PPC). */
const MEDICARE_VERTICAL = "Medicare PPC";
const FINAL_EXPENSE_VERTICAL = "Final Expense";
const DEBT_FORM_VERTICAL = "Debt Form";
const VSL_VERTICAL = "VSL";
const CONCEALED_CARRY_VERTICAL = "Concealed Carry";

const CALLGRID_TRACKED_VERTICALS = new Set([
  MEDICARE_VERTICAL,
  FINAL_EXPENSE_VERTICAL,
]);

const CALLGRID_VERTICALS = [
  { value: MEDICARE_VERTICAL, label: "Medicare" },
  { value: FINAL_EXPENSE_VERTICAL, label: "Final Expense" },
  { value: DEBT_FORM_VERTICAL, label: "Debt Form" },
  { value: VSL_VERTICAL, label: "VSL" },
  { value: CONCEALED_CARRY_VERTICAL, label: "Concealed Carry" },
];

/** Local campaigns (no CallGrid API) — same as Ringba lander creation. */
const LOCAL_CAMPAIGNS_BY_VERTICAL = {
  [DEBT_FORM_VERTICAL]: [
    { id: "paragon-debt", name: "Paragon - Debt" },
  ],
  [VSL_VERTICAL]: [
    { id: "yu-sleep", name: "YU Sleep" },
    { id: "femicore", name: "FemiCore" },
  ],
  [CONCEALED_CARRY_VERTICAL]: [
    { id: "rush-permit", name: "Rush Permit" },
  ],
};

/** Local media buyers by vertical — same availability as lander creation. */
const LOCAL_MEDIA_BUYERS_BY_VERTICAL = {
  [DEBT_FORM_VERTICAL]: [
    { id: "jake-hunter", name: "Jake Hunter" },
    { id: "addy-jaloudi", name: "Addy Jaloudi" },
    { id: "sean-luc", name: "Sean Luc" },
    { id: "nick", name: "Nick" },
  ],
  [VSL_VERTICAL]: [{ id: "nick", name: "Nick" }],
  [CONCEALED_CARRY_VERTICAL]: [
    { id: "nick", name: "Nick" },
    { id: "jake-hunter", name: "Jake Hunter" },
    { id: "addy-jaloudi", name: "Addy Jaloudi" },
    { id: "sean-luc", name: "Sean Luc" },
  ],
};

/** Templates by vertical (CallGrid-tracked + local RTK-only). */
const CALLGRID_TEMPLATES_BY_VERTICAL = {
  [MEDICARE_VERTICAL]: [
    { value: "cg-grocery", label: "Chatbot Grocery" },
    { value: "cg-ss", label: "Chatbot Social Security" },
    { value: "cg-groc-short", label: "Chatbot Grocery Short" },
    { value: "cg-ss-short", label: "Chatbot Social Security Short" },
    { value: "cg-groc-dynamic", label: "Chatbot Grocery Dynamic" },
    { value: "cg-groc-quiz-multi", label: "Chatbot Quiz Multi" },
    { value: "cg-groc-3000", label: "Chatbot Grocery (3300)" },
    { value: "cg-groc-short-3000", label: "Chatbot Grocery Short (3300)" },
    { value: "cg-ss-174", label: "Chatbot Social Security (174)" },
    { value: "cg-ss-short-174", label: "Chatbot Social Security Short (174)" },
  ],
  [FINAL_EXPENSE_VERTICAL]: [
    { value: "cg-fe", label: "Final Expense ($0)" },
    { value: "cg-fe-40", label: "Final Expense ($40k)" },
    { value: "cg-fe-20", label: "Final Expense ($25k)" },
    { value: "cg-fe-25k", label: "Final Expense ($25k) New" },
    { value: "cg-fe-quiz-multi", label: "Final Expense 25k Multi-Step" },
  ],
  [DEBT_FORM_VERTICAL]: [
    { value: "debt-form", label: "Debt Form" },
    { value: "debt-form-25", label: "Debt Form (25)" },
    { value: "homepage-debt", label: "Debt Home" },
  ],
  [VSL_VERTICAL]: [
    { value: "vsl-1", label: "vsl" },
    { value: "femiCore", label: "femiCore" },
    { value: "femicore-vsl", label: "femiCore v2" },
    { value: "femiCore-plain", label: "femiCore Plain" },
  ],
  [CONCEALED_CARRY_VERTICAL]: [
    { value: "ccw", label: "CCW" },
    { value: "gg-ccw-v2", label: "CCW v2" },
    { value: "gg-ccw-plain", label: "CCW Plain" },
  ],
};

function isCallgridTrackedVertical(vertical) {
  return CALLGRID_TRACKED_VERTICALS.has(vertical);
}

function isLocalVertical(vertical) {
  return Boolean(LOCAL_CAMPAIGNS_BY_VERTICAL[vertical]);
}

function filterCampaignsForVertical(campaigns, vertical) {
  const list = Array.isArray(campaigns) ? campaigns : [];
  if (vertical === MEDICARE_VERTICAL) {
    return list.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      return name.includes("medicare") && !name.includes("final expense");
    });
  }
  if (vertical === FINAL_EXPENSE_VERTICAL) {
    return list.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      return (
        name.includes("final expense") ||
        name === "paragon - final expense"
      );
    });
  }
  return [];
}

function templatesForVerticalAndCampaign(vertical, campaignId, campaigns) {
  const all = CALLGRID_TEMPLATES_BY_VERTICAL[vertical] || [];
  if (vertical !== VSL_VERTICAL) return all;

  const campaignName =
    campaigns.find((c) => c.id === campaignId)?.name || "";
  if (campaignName === "YU Sleep") {
    return all.filter((t) => t.value === "vsl-1");
  }
  if (campaignName === "FemiCore") {
    return all.filter(
      (t) =>
        t.value === "femiCore" ||
        t.value === "femicore-vsl" ||
        t.value === "femiCore-plain",
    );
  }
  return all;
}

function defaultTemplateForVertical(vertical, campaignId, campaigns = []) {
  const templates = templatesForVerticalAndCampaign(
    vertical,
    campaignId,
    campaigns,
  );
  return templates[0]?.value || "";
}

function excludeCtvMediaBuyers(buyers) {
  return (Array.isArray(buyers) ? buyers : []).filter((buyer) => {
    const name = String(buyer?.name || "").toLowerCase();
    return !name.includes("ctv");
  });
}

/** Always expose Nick (same as Lander Tech), even when CallGrid has no Nick source. */
function withNickMediaBuyer(buyers) {
  const list = Array.isArray(buyers) ? [...buyers] : [];
  const hasNick = list.some(
    (b) => String(b?.name || "").trim().toLowerCase() === "nick",
  );
  if (!hasNick) {
    list.push({
      id: "nick",
      name: "Nick",
      phoneNumber: "",
      campaignSourceId: null,
      sourceId: "nick",
    });
  }
  return list;
}

function isInjectedNickBuyer(buyer) {
  if (!buyer) return false;
  const name = String(buyer.name || "").trim().toLowerCase();
  const id = String(buyer.id || buyer.sourceId || "");
  return name === "nick" && id === "nick";
}

function localMediaBuyersForVertical(vertical) {
  return withNickMediaBuyer(
    (LOCAL_MEDIA_BUYERS_BY_VERTICAL[vertical] || []).map((b) => ({
      ...b,
      phoneNumber: b.phoneNumber || "",
      campaignSourceId: null,
      sourceId: b.id,
    })),
  );
}

const MEDIA_BUYER_EMAIL_MAP = {
  "Jake Hunter": "jake@paragonmedia.io",
  Jake: "jake@paragonmedia.io",
  "Addy Jaloudi": "addy@paragonmedia.io",
  Addy: "addy@paragonmedia.io",
  "Sean Luc": "sean@paragonmedia.io",
  Sean: "sean@paragonmedia.io",
  Nick: "nick@paragonmedia.io",
  You: null,
};

const EMAIL_TO_MEDIA_BUYER_HINTS = {
  "jake@paragonmedia.io": ["jake hunter", "jake"],
  "addy@paragonmedia.io": ["addy jaloudi", "addy"],
  "sean@paragonmedia.io": ["sean luc", "sean"],
  "nick@paragonmedia.io": ["nick"],
};

function findMediaBuyerForLoggedInUser(buyers, user) {
  const list = Array.isArray(buyers) ? buyers : [];
  if (!user || list.length === 0) return null;

  const firstName = String(user.firstName || "").trim();
  const lastName = String(user.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const email = String(user.email || "").trim().toLowerCase();
  const hints = EMAIL_TO_MEDIA_BUYER_HINTS[email] || [];

  const byExact = fullName
    ? list.find((b) => String(b.name || "").trim() === fullName)
    : null;
  if (byExact) return byExact;

  const byFirst = firstName
    ? list.find(
        (b) =>
          String(b.name || "").trim().toLowerCase() ===
          firstName.toLowerCase(),
      )
    : null;
  if (byFirst) return byFirst;

  const byIncludes = firstName
    ? list.find((b) =>
        String(b.name || "")
          .toLowerCase()
          .includes(firstName.toLowerCase()),
      )
    : null;
  if (byIncludes) return byIncludes;

  for (const hint of hints) {
    const match = list.find((b) =>
      String(b.name || "")
        .toLowerCase()
        .includes(hint),
    );
    if (match) return match;
  }

  return null;
}

function CallGridLanderForm({ selectedTemplate, setSelectedTemplate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [url, setURL] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    organization: "paragon media",
    domain: "",
    route: "",
    template: "cg-grocery",
    rtkID: "",
    phoneNumber: "",
    platform: "",
    createdBy: "",
  });

  const [selectedVertical, setSelectedVertical] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [callgridOrganizationId, setCallgridOrganizationId] = useState(
    "cmqzp5upm023q06jr1r2nas6f",
  );

  const [mediaBuyers, setMediaBuyers] = useState([]);
  const [selectedMediaBuyerId, setSelectedMediaBuyerId] = useState("");
  const [isLoadingMediaBuyers, setIsLoadingMediaBuyers] = useState(false);

  const [availableDomains, setAvailableDomains] = useState([]);
  const [filteredDomains, setFilteredDomains] = useState([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [selectedDomainHasRtkID, setSelectedDomainHasRtkID] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserData, setCurrentUserData] = useState(null);

  const selectedMediaBuyer = mediaBuyers.find(
    (b) => b.id === selectedMediaBuyerId || b.sourceId === selectedMediaBuyerId,
  );
  const isMediaBuyerUser = currentUserRole === "mediaBuyer";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return;
      const user = JSON.parse(raw);
      setCurrentUserRole(user.role || "");
      setCurrentUserEmail(user.email || "");
      setCurrentUserData(user);
      setFormData((prev) => ({
        ...prev,
        createdBy: user.email || "",
      }));
    } catch (err) {
      console.error("Error parsing userData:", err);
    }
    fetchAvailableDomains();
  }, []);

  // Auto-select CallGrid source for logged-in media buyers (hide dropdown)
  useEffect(() => {
    if (!isMediaBuyerUser || !selectedCampaign || mediaBuyers.length === 0) {
      return;
    }
    const match = findMediaBuyerForLoggedInUser(mediaBuyers, currentUserData);
    if (!match) {
      setSelectedMediaBuyerId("");
      setFormData((prev) => ({ ...prev, phoneNumber: "", domain: "" }));
      setError(
        "Could not match your account to a CallGrid media buyer on this campaign.",
      );
      return;
    }
    setSelectedMediaBuyerId(match.id || match.sourceId || "");
    setFormData((prev) => ({
      ...prev,
      phoneNumber: match.phoneNumber || "",
      domain: "",
    }));
    setError("");
  }, [isMediaBuyerUser, selectedCampaign, mediaBuyers, currentUserData]);

  const fetchAvailableDomains = async () => {
    try {
      setIsLoadingDomains(true);
      const response = await cachedFetch(
        API_ENDPOINTS.DOMAINS.LIST,
        { headers: getAuthHeaders() },
        CACHE_CONFIG.DOMAINS,
      );
      if (!response.ok) {
        setAvailableDomains([]);
        return;
      }
      const data = await response.json();
      let domains = [];
      if (Array.isArray(data)) domains = data;
      else if (Array.isArray(data.domains)) domains = data.domains;
      else if (Array.isArray(data.data)) domains = data.data;
      setAvailableDomains(domains);
    } catch (err) {
      console.error("Error fetching domains:", err);
      setAvailableDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const fetchCampaigns = async (vertical) => {
    try {
      setIsLoadingCampaigns(true);
      setError("");
      const response = await fetch(API_ENDPOINTS.CALLGRID.CAMPAIGNS, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Failed to load campaigns (${response.status})`);
      }
      if (data.organizationId) {
        setCallgridOrganizationId(data.organizationId);
      }
      const all = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(filterCampaignsForVertical(all, vertical));
    } catch (err) {
      console.error(err);
      setCampaigns([]);
      setError(err.message || "Failed to load CallGrid campaigns");
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const fetchMediaBuyers = async (campaignId) => {
    if (!campaignId) {
      setMediaBuyers([]);
      return;
    }
    try {
      setIsLoadingMediaBuyers(true);
      setError("");
      const response = await fetch(
        API_ENDPOINTS.CALLGRID.MEDIA_BUYERS(campaignId),
        { headers: getAuthHeaders() },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || `Failed to load media buyers (${response.status})`,
        );
      }
      if (data.organizationId) {
        setCallgridOrganizationId(data.organizationId);
      }
      setMediaBuyers(
        withNickMediaBuyer(
          excludeCtvMediaBuyers(
            Array.isArray(data.mediaBuyers) ? data.mediaBuyers : [],
          ),
        ),
      );
    } catch (err) {
      console.error(err);
      setMediaBuyers(withNickMediaBuyer([]));
      setError(err.message || "Failed to load CallGrid media buyers");
    } finally {
      setIsLoadingMediaBuyers(false);
    }
  };

  const isNickMediaBuyerSelection = useCallback((mediaBuyerName) => {
    if (mediaBuyerName == null || String(mediaBuyerName).trim() === "") {
      return false;
    }
    return String(mediaBuyerName).trim().toLowerCase() === "nick";
  }, []);

  const isNickMediaBuyerEmail = useCallback((email) => {
    if (email == null || String(email).trim() === "") return false;
    return String(email).trim().toLowerCase() === "nick@paragonmedia.io";
  }, []);

  const filterDomainsByUser = useCallback(
    (domains, userEmail, userRole, mediaBuyerName) => {
      if (isNickMediaBuyerSelection(mediaBuyerName)) {
        return domains;
      }
      if (userRole === "mediaBuyer") {
        if (isNickMediaBuyerEmail(userEmail)) {
          return domains;
        }
        return domains.filter((d) => d.assignedTo === userEmail);
      }
      if (["tech", "ceo", "admin"].includes(userRole) && mediaBuyerName) {
        const email = MEDIA_BUYER_EMAIL_MAP[mediaBuyerName];
        if (!email) return domains;
        return domains.filter((d) => d.assignedTo === email);
      }
      return domains;
    },
    [isNickMediaBuyerSelection, isNickMediaBuyerEmail],
  );

  useEffect(() => {
    if (!availableDomains.length) {
      setFilteredDomains([]);
      return;
    }
    let filtered = filterDomainsByUser(
      availableDomains,
      currentUserEmail,
      currentUserRole,
      selectedMediaBuyer?.name,
    );

    const nickGetsAllDomains =
      isNickMediaBuyerSelection(selectedMediaBuyer?.name) ||
      isNickMediaBuyerEmail(currentUserEmail);

    // Nick gets every domain on step 3 — skip vertical filter too
    if (!nickGetsAllDomains && selectedVertical) {
      filtered = filtered.filter((domain) =>
        domainMatchesLanderVertical(domain.vertical, selectedVertical),
      );
    }
    setFilteredDomains(filtered);
  }, [
    availableDomains,
    currentUserEmail,
    currentUserRole,
    selectedMediaBuyer?.name,
    selectedVertical,
    filterDomainsByUser,
    isNickMediaBuyerSelection,
    isNickMediaBuyerEmail,
  ]);

  const handleOrganizationChange = (value) => {
    if (value === "elite") return; // not available yet
    setFormData((prev) => ({ ...prev, organization: value }));
  };

  const handleVerticalChange = (vertical) => {
    setSelectedVertical(vertical);
    setSelectedCampaign("");
    setSelectedMediaBuyerId("");
    setMediaBuyers([]);
    const localCampaigns = LOCAL_CAMPAIGNS_BY_VERTICAL[vertical] || [];
    const defaultTemplate = defaultTemplateForVertical(
      vertical,
      "",
      localCampaigns,
    );
    setFormData((prev) => ({
      ...prev,
      domain: "",
      phoneNumber: "",
      template: defaultTemplate,
      rtkID: "",
      platform: "",
    }));
    setSelectedTemplate(defaultTemplate);
    setSelectedDomainHasRtkID(false);
    if (isCallgridTrackedVertical(vertical)) {
      fetchCampaigns(vertical);
    } else if (isLocalVertical(vertical)) {
      setCampaigns(localCampaigns);
      setIsLoadingCampaigns(false);
    } else {
      setCampaigns([]);
    }
  };

  const handleCampaignChange = (campaignId) => {
    setSelectedCampaign(campaignId);
    setSelectedMediaBuyerId("");
    setFormData((prev) => ({ ...prev, phoneNumber: "" }));

    if (isLocalVertical(selectedVertical)) {
      const buyers = localMediaBuyersForVertical(selectedVertical);
      setMediaBuyers(buyers);
      const nextTemplate = defaultTemplateForVertical(
        selectedVertical,
        campaignId,
        LOCAL_CAMPAIGNS_BY_VERTICAL[selectedVertical] || campaigns,
      );
      setSelectedTemplate(nextTemplate);
      setFormData((prev) => ({ ...prev, template: nextTemplate }));
      // VSL only has Nick — auto-select for everyone
      if (selectedVertical === VSL_VERTICAL && buyers.length === 1) {
        setSelectedMediaBuyerId(buyers[0].id);
      }
      return;
    }

    fetchMediaBuyers(campaignId);
  };

  const handleMediaBuyerChange = (buyerId) => {
    setSelectedMediaBuyerId(buyerId);
    const buyer = mediaBuyers.find(
      (b) => b.id === buyerId || b.sourceId === buyerId,
    );
    setFormData((prev) => ({
      ...prev,
      phoneNumber: buyer?.phoneNumber || "",
      domain: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const steps = [
    {
      id: 1,
      title: "Organization",
      completed: Boolean(formData.organization),
    },
    {
      id: 2,
      title: "Vertical & Campaign",
      completed: Boolean(
        selectedVertical && selectedCampaign && selectedMediaBuyerId,
      ),
    },
    { id: 3, title: "Domain", completed: Boolean(formData.domain) },
    {
      id: 4,
      title: "Lander Details",
      completed: Boolean(
        formData.route &&
          formData.template &&
          formData.platform &&
          (selectedDomainHasRtkID || formData.rtkID),
      ),
    },
  ];

  const canGoNext = () => {
    if (currentStep === 1) return formData.organization === "paragon media";
    if (currentStep === 2) {
      return Boolean(
        selectedVertical && selectedCampaign && selectedMediaBuyerId,
      );
    }
    if (currentStep === 3) return Boolean(formData.domain);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedMediaBuyer) {
      setError("Please select a media buyer");
      return;
    }
    if (!validateInput.required(formData.domain)) {
      setError("Please select a domain");
      return;
    }
    if (!validateInput.required(formData.route)) {
      setError("Please enter a path/route");
      return;
    }
    if (!validateInput.required(formData.template || selectedTemplate)) {
      setError("Please select a template");
      return;
    }
    if (!validateInput.required(formData.platform)) {
      setError("Please select a platform");
      return;
    }

    const domainRtkID =
      availableDomains.find((d) => d.domain === formData.domain)?.rtkID || "";
    const finalRtkID =
      domainRtkID && domainRtkID.trim() !== ""
        ? domainRtkID
        : formData.rtkID || "";
    if (!finalRtkID.trim()) {
      setError("Please enter an RTK ID");
      return;
    }

    const usesCallgrid =
      isCallgridTrackedVertical(selectedVertical) &&
      !isInjectedNickBuyer(selectedMediaBuyer);
    const payload = {
      organization: formData.organization,
      domain: sanitizeInput.domain(formData.domain),
      route: sanitizeInput.route(formData.route),
      template: sanitizeInput.text(formData.template || selectedTemplate),
      platform: sanitizeInput.text(formData.platform),
      rtkID: sanitizeInput.id(finalRtkID),
      phoneNumber: sanitizeInput.phone(selectedMediaBuyer.phoneNumber || ""),
      ringbaID: "",
      createdBy: sanitizeInput.email(currentUserEmail || formData.createdBy),
    };

    if (usesCallgrid) {
      payload.trackingPlatform = "callgrid";
      payload.callgridOrganizationId = callgridOrganizationId;
      payload.callgridCampaignId = selectedCampaign;
      payload.callgridCampaignSourceId =
        selectedMediaBuyer.campaignSourceId ||
        selectedMediaBuyer.sourceId ||
        selectedMediaBuyer.id;
      payload.callgridMediaBuyerName = selectedMediaBuyer.name;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(API_ENDPOINTS.ROUTES.CREATE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.error || result.message || `HTTP ${response.status}`,
        );
      }

      invalidateCache.domains?.();
      const landerUrl = `${payload.domain}/${payload.route}`;
      setURL(landerUrl);
      setShowSuccessModal(true);
      setCurrentStep(1);
      setSelectedVertical("");
      setSelectedCampaign("");
      setSelectedMediaBuyerId("");
      setMediaBuyers([]);
      setCampaigns([]);
      setSelectedDomainHasRtkID(false);
      setFormData({
        organization: "paragon media",
        domain: "",
        route: "",
        template: "cg-grocery",
        rtkID: "",
        phoneNumber: "",
        platform: "",
        createdBy: currentUserEmail,
      });
      setSelectedTemplate("cg-grocery");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create lander");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep === step.id
                  ? "bg-blue-600 text-white"
                  : step.completed
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
              }`}
            >
              {step.completed && currentStep !== step.id ? "✓" : step.id}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                currentStep === step.id
                  ? "text-blue-600"
                  : step.completed
                    ? "text-green-600"
                    : "text-gray-500"
              }`}
            >
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-1 w-12 ${
                  step.completed ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Select Organization</h2>
      <label className="flex cursor-pointer items-center rounded-lg border-2 border-gray-200 p-4 hover:border-blue-300">
        <input
          type="radio"
          name="organization"
          value="paragon media"
          checked={formData.organization === "paragon media"}
          onChange={(e) => handleOrganizationChange(e.target.value)}
          className="mr-4"
        />
        <div>
          <div className="font-medium text-gray-900">Paragon Media</div>
          <div className="text-sm text-gray-500">
            CallGrid org: {callgridOrganizationId}
          </div>
        </div>
      </label>
      <label className="flex cursor-not-allowed items-center rounded-lg border-2 border-gray-100 bg-gray-50 p-4 opacity-60">
        <input type="radio" name="organization" value="elite" disabled className="mr-4" />
        <div>
          <div className="font-medium text-gray-900">Elite</div>
          <div className="text-sm text-gray-500">Coming soon</div>
        </div>
      </label>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Vertical, Campaign & Media Buyer
      </h2>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Vertical <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedVertical}
          onChange={(e) => handleVerticalChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Vertical</option>
          {CALLGRID_VERTICALS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Campaign <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedCampaign}
          onChange={(e) => handleCampaignChange(e.target.value)}
          disabled={!selectedVertical || isLoadingCampaigns}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">
            {isLoadingCampaigns
              ? isCallgridTrackedVertical(selectedVertical)
                ? "Loading CallGrid campaigns..."
                : "Loading campaigns..."
              : "Select Campaign"}
          </option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedCampaign && (
          <p className="mt-1 text-xs text-gray-500">
            Campaign ID: {selectedCampaign}
          </p>
        )}
      </div>

      <div>
        {isMediaBuyerUser ? (
          selectedCampaign && (
            <p className="text-sm text-gray-600">
              {isLoadingMediaBuyers
                ? "Loading your media buyer details…"
                : selectedMediaBuyer
                  ? `Media buyer auto-filled: ${selectedMediaBuyer.name}`
                  : "No matching media buyer found for your account on this campaign."}
            </p>
          )
        ) : (
          <>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Media Buyer <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMediaBuyerId}
              onChange={(e) => handleMediaBuyerChange(e.target.value)}
              disabled={!selectedCampaign || isLoadingMediaBuyers}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">
                {isLoadingMediaBuyers
                  ? "Loading media buyers..."
                  : "Select Media Buyer"}
              </option>
              {mediaBuyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.phoneNumber ? ` (${b.phoneNumber})` : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const filteredByInput = filteredDomains.filter((domain) =>
      domain.domain.toLowerCase().includes(formData.domain.toLowerCase()),
    );

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Select Domain</h2>
        <div className="relative">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Domain <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.domain}
            onChange={(e) => {
              const domainValue = e.target.value;
              const matched = availableDomains.find(
                (d) => d.domain === domainValue,
              );
              const hasRtk =
                Boolean(matched?.rtkID) && matched.rtkID.trim() !== "";
              setSelectedDomainHasRtkID(hasRtk);
              setFormData((prev) => ({
                ...prev,
                domain: domainValue,
                rtkID: hasRtk ? matched.rtkID : "",
                platform: matched?.platform || prev.platform,
              }));
              setShowDomainDropdown(true);
            }}
            onFocus={() => setShowDomainDropdown(true)}
            onBlur={() => setTimeout(() => setShowDomainDropdown(false), 150)}
            placeholder={
              isLoadingDomains ? "Loading domains..." : "Type to search domains"
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
          {showDomainDropdown && filteredByInput.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {filteredByInput.map((domain) => (
                <li key={domain.domain}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const hasRtk =
                        Boolean(domain.rtkID) && domain.rtkID.trim() !== "";
                      setSelectedDomainHasRtkID(hasRtk);
                      setFormData((prev) => ({
                        ...prev,
                        domain: domain.domain,
                        rtkID: hasRtk ? domain.rtkID : "",
                        platform: domain.platform || prev.platform,
                      }));
                      setShowDomainDropdown(false);
                    }}
                  >
                    <div className="font-medium">{domain.domain}</div>
                    <div className="text-xs text-gray-500">
                      {domain.assignedTo || "—"} · {domain.vertical || "No vertical"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Same domain list/rules as Ringba lander creation (filtered by
            media buyer + selected vertical).
          </p>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Landing Page Details
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Path
          </label>
          <input
            type="text"
            name="route"
            value={formData.route}
            onChange={handleChange}
            placeholder="nn"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              setFormData((prev) => ({ ...prev, template: e.target.value }));
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectedVertical}
          >
            <option value="">
              {!selectedVertical
                ? "Please select a vertical first"
                : "Select Template"}
            </option>
            {templatesForVerticalAndCampaign(
              selectedVertical,
              selectedCampaign,
              campaigns,
            ).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {!selectedDomainHasRtkID && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              RT Campaign ID
            </label>
            <input
              type="text"
              name="rtkID"
              value={formData.rtkID}
              onChange={handleChange}
              placeholder="677086c62cca41d88a6b6e2d"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {selectedDomainHasRtkID && (
          <div className="space-y-3">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">RT Campaign ID:</span>{" "}
                {formData.rtkID ||
                  availableDomains.find((d) => d.domain === formData.domain)
                    ?.rtkID ||
                  "N/A"}
                <span className="ml-2 text-xs text-blue-600">
                  (Using domain&apos;s RT Campaign ID)
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <div className="h-[80vh] overflow-hidden overflow-y-auto rounded-lg border">
          <TemplatePreview
            selectedTemplate={selectedTemplate}
            organization={formData.organization}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lander Creation</h1>
        <p className="mt-1 text-sm text-gray-500">
          CallGrid-tracked verticals (Medicare / Final Expense) pull live
          CallGrid campaigns. Debt Form, VSL, and Concealed Carry use the same
          local campaigns, templates, and media buyers as Lander Tech (RTK
          only).
        </p>
      </div>

      {renderProgress()}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <div className="mt-8 flex justify-between border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1 || isSubmitting}
            className="rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canGoNext() || isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !canGoNext()}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Lander"}
            </button>
          )}
        </div>
      </form>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Lander Created
            </h3>
            <a
              href={`http://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 block break-all text-blue-600 hover:text-blue-800"
            >
              {url}
            </a>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallGridLanderForm;

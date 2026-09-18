import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import AddDomainModal from "./AddDomainModal";
import DomainPopupModal from "./DomainPopupModal";
import TrashModal from "./TrashModal";
import DomainHeader from "./domains/DomainHeader";
import DomainFilters from "./domains/DomainFilters";
import DomainTable from "./domains/DomainTable";
import DomainStats from "./domains/DomainStats";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
import { cachedFetch, CACHE_CONFIG } from "../utils/cache.js";
import { filterDomains, getFilterOptions } from "../utils/domainFilters.js";
import { getCertificationTagColor } from "../constants/certificationTags.js";

const PURGE_ALL_TIMEOUT_MS = 15 * 60 * 1000;

function DomainsName() {
  const [domainData, setDomainData] = useState(null); // Start with null to show loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedMediaBuyer, setSelectedMediaBuyer] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("");
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showDomainPopup, setShowDomainPopup] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [showPurgeAllConfirm, setShowPurgeAllConfirm] = useState(false);

  const fetchDomains = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the auth token from localStorage
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.error("No authentication token found");
        setError("Authentication required");
        setDomainData([]);
        return;
      }

      const response = await cachedFetch(
        API_ENDPOINTS.DOMAINS.LIST,
        {
          headers: getAuthHeaders(),
        },
        CACHE_CONFIG.DOMAINS
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      console.log("From cache:", response.fromCache);

      // Ensure we have an array, if not, try to extract it from the response
      let domains = [];
      if (Array.isArray(data)) {
        domains = data;
      } else if (data && Array.isArray(data.domains)) {
        domains = data.domains;
      } else if (data && Array.isArray(data.data)) {
        domains = data.data;
      } else {
        console.warn("Unexpected data structure:", data);
        domains = []; // Set empty array as fallback
      }

      setDomainData(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      setError(error.message);
      setDomainData([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Update selectedDomain when domainData changes (after refresh)
  useEffect(() => {
    if (selectedDomain && domainData && domainData.length > 0) {
      const updatedDomain = domainData.find(
        (d) => d.domain === selectedDomain.domain
      );
      if (updatedDomain) {
        // Always update to ensure modal shows latest data after edits
        // This ensures rtkID and other field changes are reflected immediately
        setSelectedDomain(updatedDomain);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainData]);

  // Get current user info for filtering
  const getCurrentUser = () => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        return {
          email: parsedUserData.email,
          role: parsedUserData.role,
        };
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }
    return null;
  };

  // Filter domains using simplified filtering logic
  const filteredDomains = domainData
    ? filterDomains(domainData, {
        currentUser: getCurrentUser(),
        searchTerm,
        selectedOrganization,
        selectedPlatform,
        selectedMediaBuyer,
        selectedVertical,
      })
    : [];

  // Get available filter options (including media buyers)
  const filterOptions = domainData
    ? getFilterOptions(domainData)
    : { mediaBuyers: [], platforms: [], verticals: [] };

  // Debug logging
  console.log("Filtering Debug:", {
    selectedOrganization,
    selectedPlatform,
    selectedMediaBuyer,
    selectedVertical,
    totalDomains: domainData?.length || 0,
    filteredDomains: filteredDomains.length,
    domainOrganizations: domainData?.map((d) => d.organization) || [],
    domainPlatforms: domainData?.map((d) => d.platform) || [],
    domainMediaBuyers: domainData?.map((d) => d.assignedTo) || [],
  });

  // Handle domain click to show popup
  const handleDomainClick = (domain) => {
    setSelectedDomain(domain);
    setShowDomainPopup(true);
  };

  // Handle media buyer click to filter
  const handleMediaBuyerClick = (email) => {
    if (selectedMediaBuyer === email) {
      // If already selected, clear the filter
      setSelectedMediaBuyer("");
    } else {
      // Set the filter to this media buyer
      setSelectedMediaBuyer(email);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedOrganization("");
    setSelectedPlatform("");
    setSelectedMediaBuyer("");
    setSelectedVertical("");
  };

  // Get organization color
  const getOrganizationColor = (organization) => {
    switch (organization) {
      case "Elite":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Paragon":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Fluent":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getCertificationColor = getCertificationTagColor;

  // Check if current user should see Media Buyer column
  const shouldShowMediaBuyerColumn = () => {
    const currentUser = getCurrentUser();
    return (
      currentUser && (currentUser.role === "tech" || currentUser.role === "ceo" || currentUser.role === "admin")
    );
  };

  // Get media buyer name from email
  const getMediaBuyerName = (email) => {
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
        return "Unknown";
    }
  };

  // Check if current user can edit a domain/route
  const canEditDomain = (domain) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;

    // CEO, Tech, and Admin can edit all domains
    if (
      currentUser.role === "ceo" ||
      currentUser.role === "tech" ||
      currentUser.role === "admin"
    ) {
      return true;
    }

    // Regular users can only edit domains assigned to them
    return domain.assignedTo === currentUser.email;
  };

  // Check if current user can add domains (not mediaBuyer)
  const canAddDomains = () => {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.role !== "mediaBuyer";
  };

  const canPurgeAll = () => {
    const role = getCurrentUser()?.role?.toLowerCase() || "";
    return ["tech", "ceo", "admin"].includes(role);
  };

  const handlePurgeAllConfirm = async () => {
    setShowPurgeAllConfirm(false);
    if (isPurgingAll) return;
    setIsPurgingAll(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      PURGE_ALL_TIMEOUT_MS,
    );

    try {
      const res = await fetch(API_ENDPOINTS.DOMAINS.REGENERATE_AND_PURGE_ALL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ delayMs: 500 }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(
          body.message ||
            body.error ||
            `Purge all failed (HTTP ${res.status})`,
        );
      }

      const summary = body.summary || {};
      const failPart = summary.failCount
        ? ` (${summary.failCount} failed — nginx: ${summary.nginxFailCount ?? 0}, purge: ${summary.purgeFailCount ?? 0})`
        : "";
      toast.success(
        body.message ||
          `Done: ${summary.successCount ?? 0}/${summary.total ?? 0} succeeded${failPart}`,
        { autoClose: 8000 },
      );

      const failures = Array.isArray(body.results)
        ? body.results.filter((r) => r && r.ok === false)
        : [];
      if (failures.length > 0) {
        const preview = failures
          .slice(0, 5)
          .map((r) => r.domain || r.name || "unknown")
          .join(", ");
        toast.warning(
          `${failures.length} domain(s) failed: ${preview}${
            failures.length > 5 ? "…" : ""
          }`,
          { autoClose: 10000 },
        );
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        toast.error(
          "Purge all timed out after 15 minutes. Check the server and try again.",
        );
      } else {
        toast.error(err.message || "Failed to purge all domains.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsPurgingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <DomainHeader
          getCurrentUser={getCurrentUser}
          canAddDomains={canAddDomains}
          onAddDomain={() => setShowAddDomainModal(true)}
          canPurgeAll={canPurgeAll}
          onPurgeAll={() => setShowPurgeAllConfirm(true)}
          isPurgingAll={isPurgingAll}
          purgeDisabled={false}
        />

        {/* Stats */}
        <DomainStats filteredDomains={filteredDomains} />

        {/* Content Section */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LoadingSpinner size="large" text="Loading domains..." />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <ErrorMessage
              error={error}
              onRetry={fetchDomains}
              variant="error"
            />
          </div>
        ) : (
          <>
            {/* Search & Filter Bar - Always visible */}
            <DomainFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedOrganization={selectedOrganization}
              setSelectedOrganization={setSelectedOrganization}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              selectedMediaBuyer={selectedMediaBuyer}
              setSelectedMediaBuyer={setSelectedMediaBuyer}
              selectedVertical={selectedVertical}
              setSelectedVertical={setSelectedVertical}
              getMediaBuyerName={getMediaBuyerName}
              availableMediaBuyers={filterOptions.mediaBuyers}
              availablePlatforms={filterOptions.platforms}
              availableVerticals={filterOptions.verticals}
              currentUserRole={getCurrentUser()?.role}
              onClearFilters={clearAllFilters}
              onOpenTrash={() => setShowTrashModal(true)}
            />

            {/* Domain Table or Empty State */}
            {Array.isArray(filteredDomains) && filteredDomains.length > 0 ? (
              <DomainTable
                filteredDomains={filteredDomains}
                shouldShowMediaBuyerColumn={shouldShowMediaBuyerColumn()}
                getOrganizationColor={getOrganizationColor}
                getCertificationColor={getCertificationColor}
                getMediaBuyerName={getMediaBuyerName}
                handleDomainClick={handleDomainClick}
                handleMediaBuyerClick={handleMediaBuyerClick}
                selectedMediaBuyer={selectedMediaBuyer}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg mb-4">
                  {searchTerm
                    ? `No domains found matching "${searchTerm}"`
                    : selectedMediaBuyer
                    ? `No domains found for ${getMediaBuyerName(
                        selectedMediaBuyer
                      )} yet`
                    : selectedVertical
                    ? `No domains found for ${selectedVertical} vertical yet`
                    : selectedOrganization && selectedPlatform
                    ? `No domains found for ${selectedOrganization} organization on ${selectedPlatform} platform yet`
                    : selectedOrganization
                    ? `No domains found for ${selectedOrganization} organization yet`
                    : selectedPlatform
                    ? `No domains found for ${selectedPlatform} platform yet`
                    : "No domains found"}
                </p>
                {(searchTerm ||
                  selectedOrganization ||
                  selectedPlatform ||
                  selectedMediaBuyer ||
                  selectedVertical) && (
                  <div className="flex gap-3 justify-center flex-wrap">
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                      >
                        Clear Search
                      </button>
                    )}
                    {selectedOrganization && (
                      <button
                        onClick={() => setSelectedOrganization("")}
                        className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium"
                      >
                        Show All Organizations
                      </button>
                    )}
                    {selectedPlatform && (
                      <button
                        onClick={() => setSelectedPlatform("")}
                        className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium"
                      >
                        Show All Platforms
                      </button>
                    )}
                    {selectedMediaBuyer && (
                      <button
                        onClick={() => setSelectedMediaBuyer("")}
                        className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium"
                      >
                        Show All Media Buyers
                      </button>
                    )}
                    {selectedVertical && (
                      <button
                        onClick={() => setSelectedVertical("")}
                        className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium"
                      >
                        Show All Verticals
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Domain Modal */}
      <AddDomainModal
        isOpen={showAddDomainModal}
        onClose={() => setShowAddDomainModal(false)}
        onSuccess={fetchDomains}
      />

      {/* Domain Popup Modal */}
      <DomainPopupModal
        isOpen={showDomainPopup}
        onClose={() => setShowDomainPopup(false)}
        domain={selectedDomain}
        refreshData={async () => {
          // Invalidate cache to ensure fresh data
          const { invalidateCache } = await import("../utils/cache.js");
          invalidateCache.domains();
          await fetchDomains();
        }}
        canEditDomain={canEditDomain}
        purgeDisabled={isPurgingAll}
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        onRestored={fetchDomains}
      />

      {/* Purge All confirmation */}
      {showPurgeAllConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50"
            aria-hidden="true"
            onClick={() => !isPurgingAll && setShowPurgeAllConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Purge + regenerate all domains?
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-2">
                This regenerates nginx and purges Cloudflare for every active
                domain. It can take several minutes.
              </p>
              <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Do not close this page while the job is running.
              </p>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowPurgeAllConfirm(false)}
                  className="px-5 py-2.5 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllConfirm}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium"
                >
                  Purge All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DomainsName;

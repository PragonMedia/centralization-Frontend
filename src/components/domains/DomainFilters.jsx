import React from "react";

const DomainFilters = ({
  searchTerm,
  setSearchTerm,
  selectedOrganization,
  setSelectedOrganization,
  selectedPlatform,
  setSelectedPlatform,
  selectedMediaBuyer,
  setSelectedMediaBuyer,
  getMediaBuyerName,
  availableMediaBuyers = [],
  availablePlatforms = [],
  currentUserRole,
  onClearFilters,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Search & Filter
            {(searchTerm ||
              selectedOrganization ||
              selectedPlatform ||
              selectedMediaBuyer) && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                (Filters Active)
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            Find specific domains or routes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search domains, ID, or ringbaID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 lg:w-80"
            />
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              title="Clear search"
            >
              <svg
                className="w-5 h-5"
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
          )}
        </div>
      </div>

      {/* Organization Filter */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Organization:
            </span>
          </div>
          <button
            onClick={() => setSelectedOrganization("")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
              !selectedOrganization
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            All Organizations
          </button>
          <button
            onClick={() => setSelectedOrganization("Elite")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
              selectedOrganization === "Elite"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            Elite
          </button>
          <button
            onClick={() => setSelectedOrganization("Paragon")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
              selectedOrganization === "Paragon"
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300"
            }`}
          >
            Paragon
          </button>
        </div>

        {/* Platform Filter */}
        {availablePlatforms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Platform:
                </span>
              </div>
              <button
                onClick={() => setSelectedPlatform("")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                  !selectedPlatform
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                All Platforms
              </button>
              {availablePlatforms.map((platform) => {
                // Get color based on platform name
                const getPlatformColor = (platformName) => {
                  const name = platformName?.toLowerCase() || "";
                  if (name === "google") {
                    return "bg-red-100 text-red-700 border border-red-200";
                  } else if (name === "liftoff") {
                    return "bg-green-100 text-green-700 border border-green-200";
                  } else if (name === "bigo") {
                    return "bg-purple-100 text-purple-700 border border-purple-200";
                  } else if (name === "facebook") {
                    return "bg-blue-100 text-blue-700 border border-blue-200";
                  } else if (name === "dv 360" || name === "dv360") {
                    return "bg-indigo-100 text-indigo-700 border border-indigo-200";
                  }
                  // Default color
                  return "bg-gray-100 text-gray-700 border border-gray-200";
                };

                return (
                  <button
                    key={platform}
                    onClick={() =>
                      setSelectedPlatform(
                        selectedPlatform === platform ? "" : platform
                      )
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      selectedPlatform === platform
                        ? getPlatformColor(platform)
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Media Buyer Filter - Only show for Tech/CEO/Admin users */}
        {availableMediaBuyers.length > 0 && currentUserRole !== "mediaBuyer" && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Media Buyer:
                </span>
              </div>
              <button
                onClick={() => setSelectedMediaBuyer("")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                  !selectedMediaBuyer
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                All Media Buyers
              </button>
              {availableMediaBuyers.map((email) => (
                <button
                  key={email}
                  onClick={() =>
                    setSelectedMediaBuyer(
                      selectedMediaBuyer === email ? "" : email
                    )
                  }
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    selectedMediaBuyer === email
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {getMediaBuyerName ? getMediaBuyerName(email) : email}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainFilters;

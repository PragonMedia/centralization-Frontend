import React from "react";

const DomainFilters = ({
  searchTerm,
  setSearchTerm,
  selectedOrganization,
  setSelectedOrganization,
  selectedPlatform,
  setSelectedPlatform,
  selectedMediaBuyer,
  // setSelectedMediaBuyer, // Not used in this component
  // getMediaBuyerName, // Not used in this component
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
            <button
              onClick={() => setSelectedPlatform("Facebook")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                selectedPlatform === "Facebook"
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              Facebook
            </button>
            <button
              onClick={() => setSelectedPlatform("Google")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                selectedPlatform === "Google"
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              Google
            </button>
            <button
              onClick={() => setSelectedPlatform("Liftoff")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                selectedPlatform === "Liftoff"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              Liftoff
            </button>
            <button
              onClick={() => setSelectedPlatform("Bigo")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                selectedPlatform === "Bigo"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              Bigo
            </button>
          </div>
        </div>

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

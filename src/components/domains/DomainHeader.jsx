import React from "react";

const DomainHeader = ({ getCurrentUser, canAddDomains, onAddDomain }) => {
  const currentUser = getCurrentUser();

  const getUserAccessInfo = () => {
    if (currentUser?.email === "jake@paragonmedia.io") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Showing only domains assigned to Jake</span>
        </div>
      );
    } else if (currentUser?.email === "addy@paragonmedia.io") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Showing only domains assigned to Addy</span>
        </div>
      );
    } else if (currentUser?.email === "neil@paragonmedia.io") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span>Showing only domains assigned to Neil</span>
        </div>
      );
    } else if (currentUser?.role === "tech" || currentUser?.role === "ceo") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Showing all domains (Tech/CEO access - can edit all)</span>
        </div>
      );
    } else if (currentUser?.role === "admin") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span>Showing all domains (Admin access - can edit all)</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0-9c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Domain Management
            </h1>
          </div>

          {/* User Access Info */}
          {getUserAccessInfo()}
        </div>

        {/* Add Domain Button - Only for non-mediaBuyer users */}
        {canAddDomains() && (
          <div className="flex items-center gap-3">
            <button
              onClick={onAddDomain}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Domain
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainHeader;


























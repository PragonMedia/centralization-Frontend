import React from "react";

const DetailsModal = ({ isOpen, onClose, routeData, domainName, domainRtkID }) => {
  if (!isOpen || !routeData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const details = [
    { label: "Domain", value: domainName },
    { label: "Route", value: routeData.route || "N/A" },
    { label: "Template", value: routeData.template || "N/A" },
    { label: "Platform", value: routeData.platform || "N/A" },
    { label: "RTK ID", value: domainRtkID || "N/A" }, // RTK ID comes from domain level, not route
    { label: "Ringba ID", value: routeData.ringbaID || "N/A" },
    { label: "Phone Number", value: routeData.phoneNumber || "N/A" },
    { label: "Created At", value: formatDate(routeData.createdAt) },
    { label: "Updated At", value: formatDate(routeData.updatedAt) },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Route Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
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
        </div>

        <div className="p-6">
          {/* Route Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {details.map((detail, index) => (
                <div key={index}>
                  <label className="text-sm font-medium text-gray-500">
                    {detail.label}
                  </label>
                  <p className="text-lg font-semibold text-gray-900 break-all">
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;

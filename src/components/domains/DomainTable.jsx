import React from "react";

const DomainTable = ({
  filteredDomains,
  shouldShowMediaBuyerColumn,
  getOrganizationColor,
  getCertificationColor,
  getMediaBuyerName,
  handleDomainClick,
  handleMediaBuyerClick,
  selectedMediaBuyer,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {shouldShowMediaBuyerColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media Buyer
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Certification Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDomains.map((domain, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {shouldShowMediaBuyerColumn && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            selectedMediaBuyer === domain.assignedTo
                              ? "bg-blue-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`text-sm font-medium ${
                              selectedMediaBuyer === domain.assignedTo
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {getMediaBuyerName(domain.assignedTo)?.charAt(0) ||
                              "?"}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <button
                          onClick={() =>
                            handleMediaBuyerClick(domain.assignedTo)
                          }
                          className={`text-sm font-medium transition-colors hover:underline ${
                            selectedMediaBuyer === domain.assignedTo
                              ? "text-blue-600"
                              : "text-gray-900 hover:text-blue-600"
                          }`}
                        >
                          {getMediaBuyerName(domain.assignedTo) || "Unknown"}
                        </button>
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {domain.domain || "Unknown"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOrganizationColor(
                      domain.organization
                    )}`}
                  >
                    {domain.organization || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {domain.id || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {domain.platform || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDomainClick(domain)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                  >
                    {domain.domain || "Unknown"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {domain.certificationTags &&
                    Array.isArray(domain.certificationTags) ? (
                      domain.certificationTags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCertificationColor(
                            tag
                          )}`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DomainTable;



























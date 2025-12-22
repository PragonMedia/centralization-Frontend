import React from "react";

const DomainStats = ({ filteredDomains }) => {
  const totalRoutes = filteredDomains.reduce(
    (total, domain) =>
      total + (Array.isArray(domain.routes) ? domain.routes.length : 0),
    0
  );

  const activeDomains = filteredDomains.filter(
    (domain) => Array.isArray(domain.routes) && domain.routes.length > 0
  ).length;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {filteredDomains.length}
          </div>
          <div className="text-sm text-gray-600">Total Domains</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalRoutes}</div>
          <div className="text-sm text-gray-600">Total Routes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {activeDomains}
          </div>
          <div className="text-sm text-gray-600">Active Domains</div>
        </div>
      </div>
    </div>
  );
};

export default DomainStats;
































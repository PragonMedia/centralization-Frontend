import React, { useState } from "react";
import EditModal from "./EditModal";
import DetailsModal from "./DetailsModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

function DomainRoutes({ title, answer, refreshData, organization, domainRtkID }) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showDomainEditModal, setShowDomainEditModal] = useState(false);
  const [showRouteEditModal, setShowRouteEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDomainModal, setShowDeleteDomainModal] = useState(false);
  const [showDeleteRouteModal, setShowDeleteRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [selectedRouteForDetails, setSelectedRouteForDetails] = useState(null);
  const [routeToDelete, setRouteToDelete] = useState(null);

  const deleteRoute = async (domain, route) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/domain/${domain}/route/${route}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete route: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Route deleted successfully:", result);
      refreshData();
    } catch (error) {
      console.error("Error deleting route:", error);
    }
  };

  const deleteDomain = async (domain) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/domain/${domain}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete route: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Route deleted successfully:", result);
      refreshData();
    } catch (error) {
      console.error("Error deleting route:", error);
    }
  };

  const handleDomainEdit = async (formData) => {
    try {
      console.log("Editing domain:", title, "with data:", formData);

      const updateData = {
        oldDomain: title, // Current domain name
        newDomain: formData.domain, // New domain name from form
      };

      console.log("Sending domain update data to API:", updateData);

      // Get auth token for authorization header
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        "http://localhost:3000/api/v1/updateDomain",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update domain: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Domain updated successfully:", result);

      // Refresh data immediately
      refreshData();
    } catch (error) {
      console.error("Error updating domain:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleRouteEdit = async (formData) => {
    try {
      // Get user email for createdBy field (required by API)
      let createdBy = "jake@paragonmedia.io"; // Default fallback
      const userData = localStorage.getItem("userData");
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          createdBy = parsedUserData.email || "jake@paragonmedia.io";
        } catch (err) {
          console.error("Error parsing user data:", err);
        }
      }

      // Use the organization that already exists in the route data from backend
      const organization = editingRoute.organization || "elite"; // Fallback to "elite" if not set

      const updateData = {
        createdBy: createdBy,
        domain: title,
        route: editingRoute.route, // Original route (for finding the route to update)
        newRoute: formData.route, // New route value
        template: editingRoute.template, // Old template
        newTemplate: formData.template, // New template
        rtkID: editingRoute.rtkID, // Old RTK ID
        newRtkID: formData.rtkID, // New RTK ID
        organization: organization,
        ringbaID: editingRoute.ringbaID,
        phoneNumber: editingRoute.phoneNumber,
      };

      console.log("Sending update data to API:", updateData);

      // Get auth token for authorization header
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3000/api/v1/updateData", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update route: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Route updated successfully:", result);

      // Refresh data immediately
      refreshData();
    } catch (error) {
      console.error("Error updating route:", error);
    }
  };

  const openRouteEditModal = (route) => {
    setEditingRoute(route);
    setShowRouteEditModal(true);
  };

  const openDetailsModal = (route) => {
    setSelectedRouteForDetails(route);
    setShowDetailsModal(true);
  };

  const openDeleteDomainModal = () => {
    setShowDeleteDomainModal(true);
  };

  const openDeleteRouteModal = (route) => {
    setRouteToDelete(route);
    setShowDeleteRouteModal(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Domain Header - Always Visible */}
      <div
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => setAccordionOpen(!accordionOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
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
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              {/* Organization Tag */}
              {organization && (
                <span
                  className={`px-3 py-1 text-xs font-medium text-white rounded-full capitalize ${
                    organization === "Elite"
                      ? "bg-purple-500"
                      : organization === "Paragon"
                      ? "bg-blue-500"
                      : organization === "Fluent"
                      ? "bg-orange-500"
                      : "bg-gray-500"
                  }`}
                >
                  {organization}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {Array.isArray(answer)
                ? `${answer.length} route${answer.length !== 1 ? "s" : ""}`
                : "0 routes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Domain Actions - Only show when dropdown is open */}
          {accordionOpen && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDomainEditModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-all duration-200 hover:scale-105 font-medium"
              >
                Edit Domain
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDomainModal();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-700 transition-all duration-200 hover:scale-105 font-medium"
              >
                Delete Domain
              </button>
            </div>
          )}

          {/* Dropdown Arrow */}
          <div className="p-2 bg-gray-100 rounded-xl">
            <svg
              className={`w-5 h-5 text-gray-600 transition-all duration-300 ease-in-out ${
                accordionOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Routes Dropdown Content */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          accordionOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {Array.isArray(answer) && answer.length > 0 ? (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="p-4 bg-gray-100 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                Routes
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {answer.map((route, index) => (
                <div
                  key={index}
                  className="p-6 hover:bg-white transition-all duration-200 ease-out transform hover:scale-[1.01]"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <svg
                            className="w-4 h-4 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                        <div>
                          <a
                            href={`http://${title}/${route.route}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {`${title}/${route.route}`}
                          </a>
                          <p className="text-sm text-gray-600 mt-1">
                            Template:{" "}
                            <span className="font-medium">
                              {route.template}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Route Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            RTK ID
                          </p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {domainRtkID || "N/A"}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Ringba ID
                          </p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {route.ringbaID || "N/A"}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Phone Number
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {route.phoneNumber || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-6">
                      <a
                        href={`http://${title}/${route.route}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-purple-700 transition-all duration-200 hover:scale-105 font-medium"
                      >
                        View
                      </a>
                      <button
                        onClick={() => openDetailsModal(route)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition-all duration-200 hover:scale-105 font-medium"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => openRouteEditModal(route)}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-all duration-200 hover:scale-105 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteRouteModal(route)}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-700 transition-all duration-200 hover:scale-105 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 bg-gray-50 p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <p className="text-gray-600 text-lg mb-2">
              No routes found for this domain
            </p>
            <p className="text-gray-500 text-sm">
              Routes will appear here once they are created
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditModal
        isOpen={showDomainEditModal}
        onClose={() => setShowDomainEditModal(false)}
        onSave={handleDomainEdit}
        type="domain"
        initialData={{ domain: title }}
      />

      <EditModal
        isOpen={showRouteEditModal}
        onClose={() => setShowRouteEditModal(false)}
        onSave={handleRouteEdit}
        type="route"
        initialData={editingRoute}
      />

      <DetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        routeData={selectedRouteForDetails}
        domainName={title}
        domainRtkID={domainRtkID}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteDomainModal}
        onClose={() => setShowDeleteDomainModal(false)}
        onConfirm={() => deleteDomain(title)}
        itemType="domain"
        itemName={title}
        domainName={title}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteRouteModal}
        onClose={() => setShowDeleteRouteModal(false)}
        onConfirm={() => deleteRoute(title, routeToDelete?.route)}
        itemType="route"
        itemName={routeToDelete ? `${title}/${routeToDelete.route}` : ""}
        domainName={title}
      />
    </div>
  );
}

export default DomainRoutes;

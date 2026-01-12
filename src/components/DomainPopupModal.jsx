import { useState, useEffect } from "react";
import EditModal from "./EditModal";
import DetailsModal from "./DetailsModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import LoadingSpinner from "./LoadingSpinner";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const DomainPopupModal = ({
  isOpen,
  onClose,
  domain,
  refreshData,
  canEditDomain,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [viewingRoute, setViewingRoute] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  // Auto-close success modal after 3 seconds and refresh data
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(async () => {
        setShowSuccessModal(false);
        setSuccessMessage("");
        // Refresh data to ensure latest domain info is shown
        await refreshData();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, refreshData]);

  if (!isOpen || !domain) return null;

  const routes = Array.isArray(domain.routes) ? domain.routes : [];

  // Get current user info for role-based permissions
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
        return null;
      }
    }
    return null;
  };

  // Check if current user can edit domains (not mediaBuyer role)
  const canEditDomains = () => {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.role !== "mediaBuyer";
  };

  // Check if mediaBuyer can edit RT ID (only for domains assigned to them)
  const canEditRtkID = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role === "mediaBuyer") {
      return domain.assignedTo === currentUser.email;
    }
    return false;
  };

  // Check if current user can edit routes
  const canEditRoutes = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;

    // CEO, Tech, and Admin can edit all routes
    if (
      currentUser.role === "ceo" ||
      currentUser.role === "tech" ||
      currentUser.role === "admin"
    ) {
      return true;
    }

    // Media buyers can edit routes in domains assigned to them
    if (currentUser.role === "mediaBuyer") {
      return domain.assignedTo === currentUser.email;
    }

    // Regular users (Jake, Addy, Sean) can edit routes in domains assigned to them
    return domain.assignedTo === currentUser.email;
  };

  const handleRouteEdit = (route) => {
    setEditingRoute(route);
    setShowEditModal(true);
  };

  const handleRouteDetails = (route) => {
    setViewingRoute(route);
    setShowDetailsModal(true);
  };

  const handleRouteDelete = (route) => {
    setDeletingItem({ type: "route", data: route, domain: domain.domain });
    setShowDeleteModal(true);
  };

  const handleDomainDelete = () => {
    setDeletingItem({ type: "domain", data: domain });
    setShowDeleteModal(true);
  };

  const handleDomainEdit = () => {
    setEditingRoute({
      domain: domain.domain,
      organization: domain.organization,
      id: domain.id,
      platform: domain.platform,
      rtkID: domain.rtkID || "",
      certificationTags: domain.certificationTags || [],
      assignedTo: domain.assignedTo || domain.createdBy,
      isDomain: true,
    });
    setShowEditModal(true);
  };

  const handleRtkIDEdit = () => {
    setEditingRoute({
      domain: domain.domain,
      rtkID: domain.rtkID || "",
      isDomain: true,
      isRtkIDOnly: true, // Flag to show only RT ID field
    });
    setShowEditModal(true);
  };

  const copyUrlToClipboard = async (route) => {
    const url = `http://${domain.domain}/${route.route}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(`${domain.domain}/${route.route}`);
      // Clear the feedback after 2 seconds
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedUrl(`${domain.domain}/${route.route}`);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Domain: {domain.domain}
            </h2>
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
            {/* Domain Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Organization
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {domain.organization || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {domain.id || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Platform
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {domain.platform || "N/A"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">
                  RTK ID
                </label>
                <p className="text-lg font-semibold text-gray-900 break-all">
                  {domain.rtkID || "N/A"}
                </p>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">
                  Certification Tags
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {domain.certificationTags &&
                  Array.isArray(domain.certificationTags) ? (
                    domain.certificationTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </div>
              </div>
            </div>

            {/* Domain Actions */}
            {canEditDomain && canEditDomain(domain) && canEditDomains() && (
              <div className="mb-6 flex gap-3">
                <button
                  onClick={handleDomainEdit}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Edit Domain
                </button>
                <button
                  onClick={handleDomainDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete Domain
                </button>
              </div>
            )}

            {/* Media Buyer RT ID Edit Button */}
            {canEditRtkID() && (
              <div className="mb-6 flex gap-3">
                <button
                  onClick={handleRtkIDEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit RT ID
                </button>
              </div>
            )}

            {/* Routes Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Routes ({routes.length})
              </h3>

              {routes.length > 0 ? (
                <div className="space-y-4">
                  {routes.map((route, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyUrlToClipboard(route)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors group"
                            title="Copy URL to clipboard"
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${
                                copiedUrl === `${domain.domain}/${route.route}`
                                  ? "text-green-600"
                                  : "text-purple-600 group-hover:text-purple-700"
                              }`}
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
                          </button>
                          <span className="font-medium text-gray-900">
                            {domain.domain}/{route.route}
                            {copiedUrl ===
                              `${domain.domain}/${route.route}` && (
                              <span className="ml-2 text-sm text-green-600 font-normal">
                                ✓ Copied!
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`http://${domain.domain}/${route.route}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleRouteDetails(route)}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Details
                          </button>
                          {canEditRoutes() && (
                            <>
                              <button
                                onClick={() => handleRouteEdit(route)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRouteDelete(route)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
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
                  <p>No routes found for this domain</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRoute(null);
          }}
          onSave={async (data) => {
            setIsEditing(true);
            try {
              if (editingRoute?.isDomain) {
                // Check if this is RT ID only edit (for mediaBuyers)
                if (editingRoute?.isRtkIDOnly) {
                  // RT ID only update (for mediaBuyers)
                  const updateData = {
                    oldDomain: domain.domain,
                    newDomain: domain.domain, // Keep same domain
                    oldOrganization: domain.organization,
                    newOrganization: domain.organization, // Keep same organization
                    oldId: domain.id,
                    newId: domain.id, // Keep same ID
                    oldPlatform: domain.platform,
                    newPlatform: domain.platform, // Keep same platform
                    oldRtkID: domain.rtkID || "",
                    newRtkID: data.rtkID || "",
                    oldCertificationTags: domain.certificationTags || [],
                    newCertificationTags: domain.certificationTags || [], // Keep same tags
                    oldAssignedTo: domain.assignedTo || domain.createdBy,
                    newAssignedTo: domain.assignedTo || domain.createdBy, // Keep same assignedTo
                  };

                  console.log("Sending RT ID only update data to API:", updateData);

                  const response = await fetch(API_ENDPOINTS.DOMAINS.UPDATE, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updateData),
                  });

                  if (!response.ok) {
                    let errorMessage = `Failed to update RT Campaign ID: ${response.statusText}`;
                    try {
                      const errorData = await response.json();
                      console.error("API Error Response:", errorData);
                      errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                      const errorText = await response.text();
                      console.error("Error response text:", errorText);
                      errorMessage = errorText || errorMessage;
                    }
                    throw new Error(errorMessage);
                  }

                  const result = await response.json();
                  console.log("RT Campaign ID updated successfully:", result);
                  
                  // Close edit modal
                  setShowEditModal(false);
                  setEditingRoute(null);
                  
                  // Refresh data to get updated domain info
                  await refreshData();
                } else {
                  // Full domain editing (for Tech/CEO/Admin)
                  const updateData = {
                    oldDomain: domain.domain, // Current domain name
                    newDomain: data.domain, // New domain name from form
                    oldOrganization: domain.organization,
                    newOrganization: data.organization,
                    oldId: domain.id,
                    newId: data.id,
                    oldPlatform: domain.platform,
                    newPlatform: data.platform,
                    oldRtkID: domain.rtkID || "",
                    newRtkID: data.rtkID || "",
                    oldCertificationTags: domain.certificationTags || [],
                    newCertificationTags: Array.isArray(data.certificationTags) 
                      ? data.certificationTags 
                      : [],
                    oldAssignedTo: domain.assignedTo || domain.createdBy,
                    newAssignedTo: data.assignedTo,
                  };

                  console.log("Sending domain update data to API:", updateData);

                  const response = await fetch(API_ENDPOINTS.DOMAINS.UPDATE, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updateData),
                  });

                  if (!response.ok) {
                    let errorMessage = `Failed to update domain: ${response.statusText}`;
                    try {
                      const errorData = await response.json();
                      console.error("API Error Response:", errorData);
                      errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                      const errorText = await response.text();
                      console.error("Error response text:", errorText);
                      errorMessage = errorText || errorMessage;
                    }
                    throw new Error(errorMessage);
                  }

                  const result = await response.json();
                  console.log("Domain updated successfully:", result);
                  
                  // Close edit modal
                  setShowEditModal(false);
                  setEditingRoute(null);
                  
                  // Refresh data to get updated domain info
                  await refreshData();
                }
              } else {
                // Handle route editing
                const updateData = {
                  domain: domain.domain,
                  route: editingRoute.route, // Current route path
                  newRoute: data.route, // New route path from form
                  oldTemplate: editingRoute.template,
                  newTemplate: data.template,
                  organization: editingRoute.organization || "paragon media",
                  ringbaID: editingRoute.ringbaID,
                  phoneNumber: editingRoute.phoneNumber,
                  createdBy: editingRoute.createdBy,
                };

                console.log("Sending route update data to API:", updateData);

                const response = await fetch(API_ENDPOINTS.ROUTES.UPDATE_DATA, {
                  method: "PUT",
                  headers: getAuthHeaders(),
                  body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                  let errorMessage = `Failed to update route: ${response.statusText}`;
                  try {
                    const errorData = await response.json();
                    console.error("API Error Response:", errorData);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                  } catch (parseError) {
                    try {
                      const errorText = await response.text();
                      console.error("Error response text:", errorText);
                      errorMessage = errorText || errorMessage;
                    } catch (textError) {
                      console.error("Could not parse error response:", textError);
                    }
                  }
                  throw new Error(errorMessage);
                }

                const result = await response.json();
                console.log("Route updated successfully:", result);
                
                // Close edit modal
                setShowEditModal(false);
                setEditingRoute(null);
                
                // Refresh data to get updated route info
                await refreshData();
                
                // Keep domain details modal open to show updated route info
                // Success is indicated by the refresh
              }
            } catch (error) {
              console.error("Error updating:", error);
              alert(`Error: ${error.message}`);
              // Close modal even on error
              setShowEditModal(false);
              setEditingRoute(null);
            } finally {
              setIsEditing(false);
            }
          }}
          isLoading={isEditing}
          type={editingRoute?.isDomain ? "domain" : "route"}
          initialData={editingRoute}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <DetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingRoute(null);
          }}
          routeData={viewingRoute}
          domainName={domain.domain}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingItem(null);
          }}
          onConfirm={async () => {
            try {
              if (deletingItem?.type === "domain") {
                // Handle domain deletion
                const response = await fetch(
                  API_ENDPOINTS.DOMAINS.DELETE(domain.domain),
                  {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                  }
                );

                if (!response.ok) {
                  let errorMessage = `Failed to delete domain: ${response.statusText}`;
                  try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                  } catch (parseError) {
                    try {
                      const errorText = await response.text();
                      errorMessage = errorText || errorMessage;
                    } catch (textError) {
                      console.error("Could not parse error response:", textError);
                    }
                  }
                  throw new Error(errorMessage);
                }

                console.log("Domain deleted successfully");
                
                // Show success modal
                setSuccessMessage("Domain deleted successfully");
                setShowSuccessModal(true);
              } else if (deletingItem?.type === "route") {
                // Handle route deletion
                const response = await fetch(
                  API_ENDPOINTS.ROUTES.DELETE(domain.domain, deletingItem.data.route),
                  {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                  }
                );

                if (!response.ok) {
                  let errorMessage = `Failed to delete route: ${response.statusText}`;
                  try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                  } catch (parseError) {
                    try {
                      const errorText = await response.text();
                      errorMessage = errorText || errorMessage;
                    } catch (textError) {
                      console.error("Could not parse error response:", textError);
                    }
                  }
                  throw new Error(errorMessage);
                }

                console.log("Route deleted successfully");
                
                // Show success modal
                setSuccessMessage("Route deleted successfully");
                setShowSuccessModal(true);
              }

              // Close modals and refresh data
              setShowDeleteModal(false);
              setDeletingItem(null);
              refreshData();
              onClose(); // Close the popup modal after deletion
            } catch (error) {
              console.error("Error during deletion:", error);
              alert(`Error: ${error.message}`);
            }
          }}
          itemType={deletingItem?.type === "domain" ? "domain" : "route"}
          itemName={
            deletingItem?.type === "domain"
              ? domain.domain
              : `${domain.domain}/${deletingItem?.data?.route}`
          }
          domainName={domain.domain}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto relative">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Success</h3>
              <button
                onClick={async () => {
                  setShowSuccessModal(false);
                  setSuccessMessage("");
                  // Refresh data one more time to ensure latest data is shown
                  await refreshData();
                }}
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
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-center text-gray-700 text-lg font-medium">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DomainPopupModal;

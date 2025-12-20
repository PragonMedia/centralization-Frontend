import { useState } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
import { sanitizeInput, validateInput } from "../utils/sanitization.js";
import { invalidateCache } from "../utils/cache.js";

const AddDomainModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    domain: "",
    assignedTo: "",
    organization: "Paragon", // Default to match API default
    id: "",
    platform: "",
    certificationTags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [idError, setIdError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const formatDomainName = (domain) => {
    return sanitizeInput.domain(domain);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let processedValue = value;

    // Apply sanitization based on field type
    if (name === "domain") {
      processedValue = formatDomainName(value);
    } else if (name === "id") {
      processedValue = sanitizeInput.id(value);
      setIdError(""); // Clear ID error when user types
    } else if (name === "assignedTo") {
      processedValue = sanitizeInput.email(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleDomainBlur = (e) => {
    // Only add .com when user finishes typing (on blur)
    const { value } = e.target;
    if (value && !value.includes(".")) {
      setFormData((prev) => ({
        ...prev,
        domain: value + ".com",
      }));
    }
  };

  const handleCertificationChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      certificationTags: checked
        ? [...prev.certificationTags, value]
        : prev.certificationTags.filter((tag) => tag !== value),
    }));
  };

  // Check ID uniqueness
  const checkIdUniqueness = async (id) => {
    if (!id.trim()) return true;

    try {
      const response = await fetch(API_ENDPOINTS.DOMAINS.LIST, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const domains = Array.isArray(data)
          ? data
          : data.domains || data.data || [];
        const isUnique = !domains.some((domain) => domain.id === id);
        return isUnique;
      }
      return true; // If API fails, allow submission
    } catch (error) {
      console.error("Error checking ID uniqueness:", error);
      return true; // If API fails, allow submission
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate domain format
    if (!validateInput.domain(formData.domain)) {
      setError("Please enter a valid domain name (e.g., example.com)");
      return;
    }

    // Validate required fields
    if (
      !validateInput.required(formData.domain) ||
      !validateInput.required(formData.assignedTo) ||
      !validateInput.required(formData.organization) ||
      !validateInput.required(formData.id) ||
      !validateInput.required(formData.platform)
    ) {
      setError("All required fields must be filled");
      return;
    }

    // Validate email format
    if (!validateInput.email(formData.assignedTo)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check ID uniqueness
    const isIdUnique = await checkIdUniqueness(formData.id);
    if (!isIdUnique) {
      setIdError("This ID already exists. Please choose a different ID.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setIdError("");

    try {
      // Log request details for debugging
      console.log("Submitting domain creation request:", {
        endpoint: API_ENDPOINTS.DOMAINS.CREATE,
        headers: getAuthHeaders(),
        body: formData,
      });

      const response = await fetch(API_ENDPOINTS.DOMAINS.CREATE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("API Error Response:", errorData);
          errorMessage =
            errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (parseError) {
          console.error("Could not parse error response as JSON:", parseError);
          try {
            const errorText = await response.text();
            console.error("Error response text:", errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error("Could not get error as text:", textError);
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Domain added successfully:", result);

      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache.domains();

      // Reset form
      setFormData({
        domain: "",
        assignedTo: "",
        organization: "Paragon",
        id: "",
        platform: "",
        certificationTags: [],
      });

      // Show success modal
      setShowSuccessModal(true);

      // Refresh domain list
      onSuccess();
    } catch (error) {
      console.error("Error adding domain:", error);
      setError(error.message || "Failed to add domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Domain</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                onBlur={handleDomainBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter domain name (spaces become hyphens, .com added if missing)"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                For
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a user</option>
                <option value="addy@paragonmedia.io">Addy</option>
                <option value="jake@paragonmedia.io">Jake</option>
                <option value="sean@paragonmedia.io">Sean</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              >
                <option value="">Select an organization</option>
                <option value="Paragon">Paragon</option>
                <option value="Elite">Elite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  idError ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Enter unique ID (e.g., AJ_ELITE_MEDI_PPC_YT9)"
                required
                disabled={isSubmitting}
              />
              {idError && (
                <p className="text-red-500 text-sm mt-1">{idError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a platform</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="DV 360">DV 360</option>
                <option value="Liftoff">Liftoff</option>
                <option value="Bigo">Bigo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Tags
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value="G2"
                    checked={formData.certificationTags.includes("G2")}
                    onChange={handleCertificationChange}
                    className="mr-2 w-4 h-4 text-blue-600 bg-white border border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-700">G2</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value="Political"
                    checked={formData.certificationTags.includes("Political")}
                    onChange={handleCertificationChange}
                    className="mr-2 w-4 h-4 text-blue-600 bg-white border border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-700">Political</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </div>
                ) : (
                  "Add Domain"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
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
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Domain Added Successfully!
              </h3>
              <p className="text-gray-600 text-center mb-6">
                The domain has been created and added to your list.
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDomainModal;

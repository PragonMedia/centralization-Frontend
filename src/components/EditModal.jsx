import React, { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "./LoadingSpinner";

const EditModal = ({ isOpen, onClose, onSave, type, initialData, isLoading = false }) => {
  const [formData, setFormData] = useState({});

  // Template options by vertical - stored values (for DB) and display names
  const templatesByVertical = {
    "Medicare PPC": [
      { value: "cb-groc", label: "Chatbot Grocery" },
      { value: "cb-ss", label: "Chatbot Social Security" },
      { value: "el-cb-groc", label: "Chatbot Grocery" }, // Elite version
      { value: "el-cb-ss", label: "Chatbot Social Security" }, // Elite version
    ],
    "Debt PPC": [
      { value: "gg-debt-v1", label: "debt" },
    ],
    Sweeps: [
      { value: "sweep", label: "Sweep" },
    ],
    Nutra: [
      { value: "nutra-lp1", label: "Nutra Landing Page 1" },
      { value: "nutra-lp2", label: "Nutra Landing Page 2" },
      { value: "nutra-supplement", label: "Supplement Sales" },
    ],
    Casino: [
      { value: "casino-lp1", label: "Casino Landing Page 1" },
      { value: "casino-lp2", label: "Casino Landing Page 2" },
      { value: "casino-signup", label: "Casino Signup" },
    ],
  };

  // Function to determine vertical from template value
  const getVerticalFromTemplate = (templateValue) => {
    if (!templateValue) return null;
    
    // Medicare PPC templates
    if (templateValue === "cb-groc" || templateValue === "cb-ss" || 
        templateValue === "el-cb-groc" || templateValue === "el-cb-ss") {
      return "Medicare PPC";
    }
    // Debt PPC templates
    if (templateValue.startsWith("debt-") || templateValue === "gg-debt-v1") {
      return "Debt PPC";
    }
    // Sweeps templates
    if (templateValue === "sweep") {
      return "Sweeps";
    }
    // Nutra templates
    if (templateValue.startsWith("nutra-")) {
      return "Nutra";
    }
    // Casino templates
    if (templateValue.startsWith("casino-")) {
      return "Casino";
    }
    
    return null;
  };

  // Get templates based on current template value
  const getTemplates = () => {
    if (type !== "route") return [];
    
    const currentTemplate = formData.template || initialData?.template;
    const vertical = getVerticalFromTemplate(currentTemplate);
    
    if (vertical && templatesByVertical[vertical]) {
      return templatesByVertical[vertical];
    }
    
    // Fallback: return all templates if we can't determine vertical
    return Object.values(templatesByVertical).flat();
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        certificationTags: initialData.certificationTags || [],
      });
    }
  }, [initialData, type]);

  // Get templates based on current template value - recalculate when formData or initialData changes
  const templates = useMemo(() => {
    return getTemplates();
  }, [formData.template, initialData?.template, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent submission while loading
    onSave(formData);
    // Don't close modal here - let parent handle it after async operation
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCertificationChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      certificationTags: checked
        ? [...(prev.certificationTags || []), value]
        : (prev.certificationTags || []).filter((tag) => tag !== value),
    }));
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto relative max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-2xl">
            <LoadingSpinner size="large" text="Saving changes..." />
          </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === "domain" && initialData?.isRtkIDOnly
              ? "Edit RT ID"
              : `Edit ${type === "domain" ? "Domain" : "Route"}`}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "domain" && initialData?.isRtkIDOnly ? (
              // RT ID Only Edit (for mediaBuyers)
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RT Campaign ID
                </label>
                <input
                  type="text"
                  name="rtkID"
                  value={formData.rtkID || ""}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder={initialData?.rtkID || "Enter RT Campaign ID"}
                  required
                />
              </div>
            ) : type === "domain" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter domain name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <select
                    name="organization"
                    value={formData.organization || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select an organization</option>
                    <option value="Paragon">Paragon</option>
                    <option value="Elite">Elite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter unique ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    name="platform"
                    value={formData.platform || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select a platform</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="DV 360">DV 360</option>
                    <option value="Bigo">Bigo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RT Campaign ID
                  </label>
                  <input
                    type="text"
                    name="rtkID"
                    value={formData.rtkID || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder={initialData?.rtkID || "Enter RT Campaign ID"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certification Tags
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="certificationTags"
                        value="G2"
                        checked={
                          formData.certificationTags?.includes("G2") || false
                        }
                        onChange={handleCertificationChange}
                        disabled={isLoading}
                        className="mr-2 w-4 h-4 text-blue-600 bg-white border-2 border-black rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-gray-700">G2</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="certificationTags"
                        value="Political"
                        checked={
                          formData.certificationTags?.includes("Political") ||
                          false
                        }
                        onChange={handleCertificationChange}
                        disabled={isLoading}
                        className="mr-2 w-4 h-4 text-blue-600 bg-white border-2 border-black rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-gray-700">Political</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media Buyer
                  </label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Media Buyer</option>
                    <option value="addy@paragonmedia.io">Addy</option>
                    <option value="jake@paragonmedia.io">Jake</option>
                    <option value="sean@paragonmedia.io">Sean Luc</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route Path
                  </label>
                  <input
                    type="text"
                    name="route"
                    value={formData.route || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter route path"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <select
                    name="template"
                    value={formData.template || ""}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.value} value={template.value}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModal;

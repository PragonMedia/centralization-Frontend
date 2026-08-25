import React, { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { PLATFORMS } from "../constants/platforms.js";
import {
  CERTIFICATION_TAGS,
} from "../constants/certificationTags.js";
import {
  getDomainVerticalSelectOptions,
  resolveDomainVerticalForUpdate,
} from "../constants/domainVerticals.js";

const EditModal = ({
  isOpen,
  onClose,
  onSave,
  type,
  initialData,
  isLoading = false,
  domainVertical: domainVerticalProp,
}) => {
  const [formData, setFormData] = useState({});

  // Template options by vertical - stored values (for DB) and display names
  const templatesByVertical = {
    "Medicare PPC": [
      { value: "cb-groc", label: "Chatbot Grocery" },
      { value: "cb-groc-nolgo", label: "Chatbot Grocery no-logo" },
      { value: "groc-dynamic", label: "Grocery Dynamic" },
      { value: "groc-quiz-multi", label: "Quiz Multi" },
      { value: "cb-ss", label: "Chatbot Social Security" },
      { value: "el-cb-groc", label: "Chatbot Grocery" },
      { value: "el-cb-ss", label: "Chatbot Social Security" },
      { value: "el-groc-dynamic", label: "Grocery Dynamic" },
      { value: "el-groc-multi", label: "Quiz Multi" },
    ],
    "Medicare PPC CallGrid": [
      { value: "cg-grocery", label: "Chatbot Grocery" },
      { value: "cg-ss", label: "Chatbot Social Security" },
      { value: "cg-groc-short", label: "Chatbot Grocery Short" },
      { value: "cg-ss-short", label: "Chatbot Social Security Short" },
      { value: "cg-groc-dynamic", label: "Chatbot Grocery Dynamic" },
      { value: "cg-groc-quiz-multi", label: "Chatbot Quiz Multi" },
      { value: "cg-groc-3000", label: "Chatbot Grocery (3300)" },
      { value: "cg-groc-short-3000", label: "Chatbot Grocery Short (3300)" },
      { value: "cg-ss-174", label: "Chatbot Social Security (174)" },
      { value: "cg-ss-short-174", label: "Chatbot Social Security Short (174)" },
    ],
    "Debt PPC": [
      { value: "gg-debt-v1", label: "Quiz Debt" },
      { value: "quiz-debt", label: "Quiz Debt V2" },
      { value: "cb-debt", label: "Chatbot Debt" },
      { value: "homepage-debt", label: "Debt Homepage" },
    ],
    "Debt Form": [
      { value: "debt-form", label: "Debt Form" },
      { value: "debt-form-25", label: "Debt Form (25)" },
    ],
    "Final Expense": [
      { value: "cb-fe", label: "Final Expense $0" },
      { value: "fe-40", label: "Final Expense ($40k)" },
      { value: "cb-fe-25", label: "Final Expense ($25)" },
      { value: "cb-fe-25k", label: "Final Expense ($25k) New" },
    ],
    "Final Expense CallGrid": [
      { value: "cg-fe", label: "Final Expense ($0)" },
      { value: "cg-fe-40", label: "Final Expense ($40k)" },
      { value: "cg-fe-20", label: "Final Expense ($25k)" },
      { value: "cg-fe-25k", label: "Final Expense ($25k) New" },
    ],
    Medicaid: [{ value: "medicaid", label: "Medicaid" }],
    ACA: [{ value: "aca-58", label: "ACA 58" }],
    VSL: [
      { value: "vsl-1", label: "vsl" },
      { value: "femiCore", label: "femiCore" },
      { value: "femicore-vsl", label: "femiCore v2" },
      { value: "femiCore-plain", label: "femiCore Plain" },
    ],
    "Concealed Carry": [
      { value: "ccw", label: "CCW" },
      { value: "gg-ccw-v2", label: "CCW v2" },
      { value: "gg-ccw-plain", label: "CCW Plain" },
    ],
  };

  // Function to determine vertical from template value
  const getVerticalFromTemplate = (templateValue) => {
    if (!templateValue) return null;
    
    // CallGrid Final Expense templates (before generic cg- Medicare check)
    if (
      templateValue === "cg-fe" ||
      templateValue === "cg-fe-40" ||
      templateValue === "cg-fe-20" ||
      templateValue === "cg-fe-25k" ||
      templateValue.startsWith("cg-fe")
    ) {
      return "Final Expense";
    }
    // CallGrid Medicare templates
    if (
      templateValue === "cg-grocery" ||
      templateValue === "cg-ss" ||
      templateValue === "cg-groc-short" ||
      templateValue === "cg-ss-short" ||
      templateValue === "cg-groc-dynamic" ||
      templateValue === "cg-groc-quiz-multi" ||
      templateValue === "cg-groc-3000" ||
      templateValue === "cg-groc-short-3000" ||
      templateValue === "cg-ss-174" ||
      templateValue === "cg-ss-short-174" ||
      templateValue.startsWith("cg-")
    ) {
      return "Medicare PPC";
    }
    // Medicare PPC templates
    if (templateValue === "cb-groc" || templateValue === "cb-groc-nolgo" || templateValue === "cb-ss" || 
        templateValue === "groc-dynamic" || templateValue === "groc-quiz-multi" ||
        templateValue === "cb-groc-short" || templateValue === "cb-ss-short" ||
        templateValue === "el-cb-groc" || templateValue === "el-cb-ss" || templateValue === "el-groc-dynamic" ||
        templateValue === "el-groc-multi" ||
        templateValue === "el-cb-groc-3000" || templateValue === "el-cb-groc-short-3000" ||
        templateValue === "el-ss-groc-174" || templateValue === "el-cb-ss-short-174") {
      return "Medicare PPC";
    }
    // Debt Form templates (check before Debt PPC — debt-form-25 also starts with debt-)
    if (templateValue === "debt-form" || templateValue === "debt-form-25") {
      return "Debt Form";
    }
    // Debt PPC templates
    if (
      templateValue === "gg-debt-v1" ||
      templateValue === "quiz-debt" ||
      templateValue === "cb-debt" ||
      templateValue === "homepage-debt" ||
      templateValue.startsWith("debt-")
    ) {
      return "Debt PPC";
    }
    if (
      templateValue === "cb-fe" ||
      templateValue === "fe-40" ||
      templateValue === "cb-fe-25" ||
      templateValue === "cb-fe-25k" ||
      templateValue === "cg-fe" ||
      templateValue === "cg-fe-40" ||
      templateValue === "cg-fe-20" ||
      templateValue === "cg-fe-25k"
    ) {
      return "Final Expense";
    }
    if (templateValue === "medicaid") {
      return "Medicaid";
    }
    if (templateValue === "aca-58" || templateValue.startsWith("aca-")) {
      return "ACA";
    }
    // VSL templates
    if (
      templateValue === "vsl-1" ||
      templateValue === "femiCore" ||
      templateValue === "femicore-vsl" ||
      templateValue === "femiCore-plain" ||
      templateValue.startsWith("vsl-")
    ) {
      return "VSL";
    }
    // Concealed Carry templates
    if (
      templateValue === "ccw" ||
      templateValue === "gg-ccw-v2" ||
      templateValue === "gg-ccw-plain"
    ) {
      return "Concealed Carry";
    }

    return null;
  };

  /** Map domain.vertical (incl. legacy) → template list key(s). */
  const getTemplateVerticalKeysFromDomainVertical = (
    domainVertical,
    useCallgridTemplates,
  ) => {
    if (!domainVertical) return null;
    const v = String(domainVertical).trim();
    if (v === "Medicare" || v === "Medicare PPC") {
      return [useCallgridTemplates ? "Medicare PPC CallGrid" : "Medicare PPC"];
    }
    if (v === "Final Expense") {
      return [
        useCallgridTemplates ? "Final Expense CallGrid" : "Final Expense",
      ];
    }
    if (v === "Debt") return ["Debt PPC", "Debt Form"];
    if (templatesByVertical[v]) return [v];
    return null;
  };

  const isCallgridRouteContext = (routeData, currentTemplate) => {
    if (String(routeData?.trackingPlatform || "").toLowerCase() === "callgrid") {
      return true;
    }
    const template = currentTemplate || routeData?.template || "";
    return String(template).startsWith("cg-");
  };

  // Prefer domain.vertical; CallGrid Medicare/FE routes only get cg-* templates
  const getTemplates = () => {
    if (type !== "route") return [];

    const domainVertical =
      initialData?.domainVertical ||
      domainVerticalProp ||
      null;
    const currentTemplate = formData.template || initialData?.template || "";
    const useCallgridTemplates = isCallgridRouteContext(
      initialData,
      currentTemplate,
    );

    let keys = getTemplateVerticalKeysFromDomainVertical(
      domainVertical,
      useCallgridTemplates,
    );
    if (!keys) {
      const inferred = getVerticalFromTemplate(currentTemplate);
      if (inferred === "Medicare PPC") {
        keys = [
          useCallgridTemplates ? "Medicare PPC CallGrid" : "Medicare PPC",
        ];
      } else if (inferred === "Final Expense") {
        keys = [
          useCallgridTemplates ? "Final Expense CallGrid" : "Final Expense",
        ];
      } else {
        keys = inferred ? [inferred] : null;
      }
    }

    let list = keys
      ? keys.flatMap((key) => templatesByVertical[key] || [])
      : Object.values(templatesByVertical).flat();

    // Safety: never mix Ringba + CallGrid Medicare/FE templates
    const isMedOrFeList = (keys || []).some(
      (k) =>
        k === "Medicare PPC" ||
        k === "Medicare PPC CallGrid" ||
        k === "Final Expense" ||
        k === "Final Expense CallGrid",
    );
    if (isMedOrFeList) {
      list = useCallgridTemplates
        ? list.filter((t) => String(t.value).startsWith("cg-"))
        : list.filter((t) => !String(t.value).startsWith("cg-"));
    }

    // Keep current template visible even if missing from the filtered set
    if (
      currentTemplate &&
      !list.some((t) => t.value === currentTemplate)
    ) {
      list = [
        { value: currentTemplate, label: currentTemplate },
        ...list,
      ];
    }

    return list;
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        certificationTags: initialData.certificationTags || [],
        vertical: initialData.vertical || "",
      });
    }
  }, [initialData, type]);

  // Get templates based on domain vertical (preferred) or current template
  const templates = useMemo(() => {
    return getTemplates();
  }, [
    formData.template,
    initialData?.template,
    initialData?.domainVertical,
    initialData?.trackingPlatform,
    domainVerticalProp,
    type,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent submission while loading
    const payload = { ...formData };
    if (type === "domain" && !initialData?.isRtkIDOnly) {
      payload.vertical = resolveDomainVerticalForUpdate(formData.vertical);
    }
    onSave(payload);
    // Don't close modal here - let parent handle it after async operation
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (type === "domain" && name === "organization") {
        const options = getDomainVerticalSelectOptions(value, prev.vertical);
        if (prev.vertical && !options.includes(prev.vertical)) {
          next.vertical = "";
        }
      }

      return next;
    });
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
                <p className="mt-2 text-sm text-red-600 font-medium">
                  By editing this you will change the RedTrack Campaign ID for all pages under this domain!
                </p>
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
                    {PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vertical
                  </label>
                  <select
                    name="vertical"
                    value={
                      formData.vertical == null ? "" : String(formData.vertical)
                    }
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Not set</option>
                    {getDomainVerticalSelectOptions(
                      formData.organization,
                      formData.vertical,
                    ).map((vertical) => (
                      <option key={vertical} value={vertical}>
                        {vertical}
                      </option>
                    ))}
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
                    {CERTIFICATION_TAGS.map(({ value, label }) => (
                      <label key={value} className="flex items-center">
                        <input
                          type="checkbox"
                          name="certificationTags"
                          value={value}
                          checked={
                            formData.certificationTags?.includes(value) || false
                          }
                          onChange={handleCertificationChange}
                          disabled={isLoading}
                          className="mr-2 w-4 h-4 text-blue-600 bg-white border-2 border-black rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-gray-700">{label}</span>
                      </label>
                    ))}
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
                  >
                    <option value="">Select Media Buyer</option>
                    <option value="addy@paragonmedia.io">Addy</option>
                    <option value="jake@paragonmedia.io">Jake</option>
                    <option value="nick@paragonmedia.io">Nick</option>
                    <option value="sean@paragonmedia.io">Sean</option>
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

import React from "react";
import { API_CONFIG } from "../config/api.js";

const TemplatePreview = ({ selectedTemplate, organization }) => {
  const base = API_CONFIG.TEMPLATE_PREVIEW_BASE_URL;
  const isElite =
    organization && String(organization).toLowerCase() === "elite";

  const templates = [
    // Paragon Media / Elite - Medicare PPC
    {
      id: "cb-groc",
      name: "Chatbot Grocery",
      previewUrl: "https://approved-template.com/groc",
      elitePreviewUrl: "https://approved-template.com/el-groc",
    },
    {
      id: "cg-grocery",
      name: "Chatbot Grocery (CallGrid)",
      previewUrl: "https://approved-template.com/groc",
      elitePreviewUrl: "https://approved-template.com/el-groc",
    },
    {
      id: "cg-ss",
      name: "Chatbot Social Security (CallGrid)",
      previewUrl: "https://approved-template.com/ss",
    },
    {
      id: "cg-groc-short",
      name: "Chatbot Grocery Short (CallGrid)",
      previewUrl: "https://approved-template.com/groc-short",
    },
    {
      id: "cg-ss-short",
      name: "Chatbot Social Security Short (CallGrid)",
      previewUrl: "https://approved-template.com/ss-short",
    },
    {
      id: "cg-groc-dynamic",
      name: "Chatbot Grocery Dynamic (CallGrid)",
      previewUrl: "https://approved-template.com/dynamic/?amount=1200",
    },
    {
      id: "cg-groc-quiz-multi",
      name: "Chatbot Quiz Multi (CallGrid)",
      previewUrl: "https://approved-template.com/multi",
    },
    {
      id: "cg-groc-3000",
      name: "Chatbot Grocery (3300) (CallGrid)",
      previewUrl: "https://approved-template.com/nn3000/",
    },
    {
      id: "cg-groc-short-3000",
      name: "Chatbot Grocery Short (3300) (CallGrid)",
      previewUrl: "https://approved-template.com/nn-short-3000/",
    },
    {
      id: "cg-ss-174",
      name: "Chatbot Social Security (174) (CallGrid)",
      previewUrl: "https://approved-template.com/ss174/",
    },
    {
      id: "cg-ss-short-174",
      name: "Chatbot Social Security Short (174) (CallGrid)",
      previewUrl: "https://approved-template.com/ss-short-174/",
    },
    {
      id: "cb-groc-nolgo",
      name: "Chatbot Grocery no-logo",
      previewUrl: "https://approved-template.com/nologo/",
    },
    {
      id: "groc-dynamic",
      name: "Grocery Dynamic",
      previewUrl: "https://approved-template.com/dynamic/?amount=1200",
    },
    {
      id: "groc-quiz-multi",
      name: "Quiz Multi",
      previewUrl: "https://approved-template.com/multi",
    },
    {
      id: "cb-ss",
      name: "Chatbot Social Security",
      previewUrl: "https://approved-template.com/ss",
      elitePreviewUrl: "https://approved-template.com/el-ss",
    },
    {
      id: "cb-groc-short",
      name: "Chatbot Grocery Short",
      previewUrl: "https://approved-template.com/groc-short",
      elitePreviewUrl: "https://approved-template.com/el-groc-short",
    },
    {
      id: "cb-ss-short",
      name: "Chatbot Social Security Short",
      previewUrl: "https://approved-template.com/ss-short",
      elitePreviewUrl: "https://approved-template.com/el-ss-short",
    },
    {
      id: "cb-groc-geoedge",
      name: "Chatbot Grocery GeoEdge",
      previewUrl: "https://approved-template.com/geo",
    },
    {
      id: "quiz-grocery",
      name: "Grocery Quiz",
      previewUrl: "https://approved-template.com/quiz",
    },
    // Paragon Media - Spanish Medicare
    {
      id: "es-cb-groc-short",
      name: "Chatbot Grocery Short",
      previewUrl: `${base}/es-cb-groc-short/`,
      elitePreviewUrl: "https://pgnmapprovedlanderv-templates.com/nn-short-el",
    },
    {
      id: "es-cb-groc",
      name: "Chatbot Grocery Spanish",
      previewUrl: "https://pgnmapprovedlander.com/nn-span",
    },
    {
      id: "es-cb-ss",
      name: "Chatbot Social Security Spanish",
      previewUrl: "https://pgnmapprovedlander.com/ss-span",
    },
    {
      id: "es-cb-ss-short",
      name: "Chatbot Social Security Short",
      previewUrl: `${base}/es-cb-ss-short/`,
      elitePreviewUrl: "https://pgnmapprovedlanderv-templates.com/ss-short-el",
    },
    // Elite - Medicare (3000)
    {
      id: "el-cb-groc-3000",
      name: "Chatbot Grocery (3000)",
      previewUrl: "https://approved-template.com/nn3000/",
    },
    {
      id: "el-cb-groc-short-3000",
      name: "Chatbot Grocery Short (3000)",
      previewUrl: "https://approved-template.com/nn-short-3000/",
    },
    {
      id: "el-ss-groc-174",
      name: "Chatbot Social Security ($174)",
      previewUrl: "https://approved-template.com/ss174/",
    },
    {
      id: "el-cb-ss-short-174",
      name: "Chatbot Social Security Short ($174)",
      previewUrl: "https://approved-template.com/ss-short-174/",
    },
    {
      id: "el-groc-dynamic",
      name: "Grocery Dynamic",
      previewUrl: "https://approved-template.com/dynamic/?amount=1200",
    },
    {
      id: "el-groc-multi",
      name: "Quiz Multi",
      previewUrl: "https://approved-template.com/el-multi/html1.html",
    },
    // Paragon Media - Debt PPC
    {
      id: "gg-debt-v1",
      name: "Quiz Debt",
      previewUrl: "https://approved-template.com/debt",
    },
    {
      id: "quiz-debt",
      name: "Quiz Debt V2",
      previewUrl: "https://approved-template.com/quiz-debt-v2/",
    },
    {
      id: "cb-debt",
      name: "Chatbot Debt",
      previewUrl: "https://approved-template.com/cb-debt/",
    },
    {
      id: "homepage-debt",
      name: "Debt Home",
      previewUrl: "https://approved-template.com/home/",
    },
    {
      id: "debt-form",
      name: "Debt Form",
      previewUrl: "https://approved-template.com/df/",
    },
    {
      id: "debt-form-25",
      name: "Debt Form (25)",
      previewUrl: "https://approved-template.com/df-25/",
    },
    {
      id: "debt-multi-20",
      name: "Debt multi 20k",
      previewUrl: "https://approved-template.com/multi20/html1.html",
    },
    // Paragon Media - Final Expense
    {
      id: "cb-fe",
      name: "Final Expense $0",
      previewUrl: `https://approved-template.com/fe/`,
    },
    {
      id: "fe-40",
      name: "Final Expense ($40k)",
      previewUrl: "https://approved-template.com/fe40/",
    },
    {
      id: "cb-fe-25",
      name: "Final Expense ($25)",
      previewUrl: "https://approved-template.com/fe-25/",
    },
    {
      id: "cb-fe-25k",
      name: "Final Expense ($25k) New",
      previewUrl: "https://approved-template.com/25k/",
    },
    {
      id: "cg-fe",
      name: "Final Expense ($0) (CallGrid)",
      previewUrl: "https://approved-template.com/fe/",
    },
    {
      id: "cg-fe-40",
      name: "Final Expense ($40k) (CallGrid)",
      previewUrl: "https://approved-template.com/fe40/",
    },
    {
      id: "cg-fe-20",
      name: "Final Expense ($25k) (CallGrid)",
      previewUrl: "https://approved-template.com/fe-25/",
    },
    {
      id: "cg-fe-25k",
      name: "Final Expense ($25k) New (CallGrid)",
      previewUrl: "https://approved-template.com/25k/",
    },
    {
      id: "cg-fe-quiz-multi",
      name: "Final Expense 25k Multi-Step (CallGrid)",
      previewUrl: "https://approved-template.com/femulti/html1.html",
    },
    // Paragon Media - Medicaid
    {
      id: "medicaid",
      name: "Medicaid",
      previewUrl: "http://approved-template.com/med",
    },
    // Paragon Media - ACA
    {
      id: "aca-58",
      name: "ACA 58",
      previewUrl: "https://approved-template.com/aca58/",
    },
    // Paragon Media - VSL
    {
      id: "vsl-1",
      name: "vsl",
      previewUrl: "https://approved-template.com/vsl/",
    },
    {
      id: "femiCore",
      name: "femiCore",
      previewUrl: "https://approved-template.com/femicore/",
    },
    {
      id: "femicore-vsl",
      name: "femiCore v2",
      previewUrl: "https://approved-template.com/femiv2/",
    },
    {
      id: "femiCore-plain",
      name: "femiCore Plain",
      previewUrl: "https://approved-template.com/femicore-plain/",
    },
    // Paragon Media - Concealed Carry
    {
      id: "ccw",
      name: "CCW",
      previewUrl: "https://approved-template.com/ccw/",
    },
    {
      id: "gg-ccw-v2",
      name: "CCW v2",
      previewUrl: "https://approved-template.com/ccw-v2/",
    },
    {
      id: "gg-ccw-plain",
      name: "CCW Plain",
      previewUrl: "https://approved-template.com/ccw-plain/",
    },
  ];

  const matched =
    templates.find((t) => t.id === selectedTemplate) || templates[0];
  const previewUrl =
    isElite && matched.elitePreviewUrl
      ? matched.elitePreviewUrl
      : matched.previewUrl;
  const currentTemplate = { ...matched, previewUrl };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Template Preview
        </h2>
        <p className="text-gray-600">Live preview of the selected template</p>
      </div>

      {/* Live Website Preview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Live Preview</h4>
        <div className="relative">
          <div className="bg-gray-100 p-2 rounded-t-lg border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <span className="text-xs text-gray-600 font-mono">
                {currentTemplate.previewUrl}
              </span>
            </div>
            <div className="text-xs text-gray-500">Live Website</div>
          </div>
          <iframe
            key={currentTemplate.previewUrl}
            src={currentTemplate.previewUrl}
            title={`${currentTemplate.name} Preview`}
            className="w-full h-[80vh] border-0 rounded-b-lg"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />

        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;

import React from "react";
import { API_CONFIG } from "../config/api.js";

const TemplatePreview = ({ selectedTemplate, organization }) => {
  const base = API_CONFIG.TEMPLATE_PREVIEW_BASE_URL;
  const isElite = organization && String(organization).toLowerCase() === "elite";

  const templates = [
    // Paragon Media / Elite - Medicare PPC
    { id: "cb-groc", name: "Chatbot Grocery", previewUrl: "https://approved-template.com/groc", elitePreviewUrl: "https://approved-template.com/el-groc" },
    { id: "cb-ss", name: "Chatbot Social Security", previewUrl: "https://approved-template.com/ss", elitePreviewUrl: "https://approved-template.com/el-ss" },
    { id: "cb-groc-short", name: "Chatbot Grocery Short", previewUrl: "https://approved-template.com/groc-short", elitePreviewUrl: "https://approved-template.com/el-groc-short" },
    { id: "cb-ss-short", name: "Chatbot Social Security Short", previewUrl: "https://approved-template.com/ss-short", elitePreviewUrl: "https://approved-template.com/el-ss-short" },
    { id: "cb-groc-geoedge", name: "Chatbot Grocery GeoEdge", previewUrl: "https://approved-template.com/geo" },
    { id: "quiz-grocery", name: "Grocery Quiz", previewUrl: "https://approved-template.com/quiz" },
    // Paragon Media - Spanish Medicare
    { id: "es-cb-groc-short", name: "Chatbot Grocery Short", previewUrl: `${base}/es-cb-groc-short/`, elitePreviewUrl: "https://pgnmapprovedlanderv-templates.com/nn-short-el" },
    { id: "es-cb-groc", name: "Chatbot Grocery Spanish", previewUrl: "https://pgnmapprovedlander.com/nn-span" },
    { id: "es-cb-ss", name: "Chatbot Social Security Spanish", previewUrl: "https://pgnmapprovedlander.com/ss-span" },
    { id: "es-cb-ss-short", name: "Chatbot Social Security Short", previewUrl: `${base}/es-cb-ss-short/`, elitePreviewUrl: "https://pgnmapprovedlanderv-templates.com/ss-short-el" },
    // Elite - Medicare (3000)
    { id: "el-cb-groc-3000", name: "Chatbot Grocery (3000)", previewUrl: "https://approved-template.com/nn3000/" },
    { id: "el-cb-groc-short-3000", name: "Chatbot Grocery Short (3000)", previewUrl: "https://approved-template.com/nn-short-3000/" },
    { id: "el-ss-groc-174", name: "Chatbot Social Security ($174)", previewUrl: "https://approved-template.com/ss174/" },
    { id: "el-cb-ss-short-174", name: "Chatbot Social Security Short ($174)", previewUrl: "https://approved-template.com/ss-short-174/" },
    // Paragon Media - Debt PPC
    { id: "gg-debt-v1", name: "debt", previewUrl: "https://approved-template.com/debt" },
    // Paragon Media - Final Expense
    { id: "cb-fe", name: "Final Expense", previewUrl: `${base}/cb-fe/` },
    // Paragon Media - Sweeps
    { id: "sweep", name: "Sweep", previewUrl: "https://pgnmapprovedlander.com/sweeps" },
    { id: "stimulus", name: "Stimulus", previewUrl: "https://pgnmapprovedlander.com/stim" },
    // Nutra, Casino (URLs TBD)
    { id: "nutra-lp1", name: "Nutra Landing Page 1", previewUrl: `${base}/nutra-lp1/` },
    { id: "nutra-lp2", name: "Nutra Landing Page 2", previewUrl: `${base}/nutra-lp2/` },
    { id: "nutra-supplement", name: "Supplement Sales", previewUrl: `${base}/nutra-supplement/` },
    { id: "casino-lp1", name: "Casino Landing Page 1", previewUrl: `${base}/casino-lp1/` },
    { id: "casino-lp2", name: "Casino Landing Page 2", previewUrl: `${base}/casino-lp2/` },
    { id: "casino-signup", name: "Casino Signup", previewUrl: `${base}/casino-signup/` },
  ];

  const matched = templates.find((t) => t.id === selectedTemplate) || templates[0];
  const previewUrl =
    isElite && matched.elitePreviewUrl ? matched.elitePreviewUrl : matched.previewUrl;
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

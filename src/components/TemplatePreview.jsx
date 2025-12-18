import React from "react";
import { API_CONFIG } from "../config/api.js";

const TemplatePreview = ({ selectedTemplate }) => {
  const templates = [
    {
      id: "cb-groc",
      name: "Chatbot Grocery",
      previewUrl: `${API_CONFIG.TEMPLATE_PREVIEW_BASE_URL}/cb-groc/`,
    },
    {
      id: "cb-ss",
      name: "Chatbot Social Security",
      previewUrl: `${API_CONFIG.TEMPLATE_PREVIEW_BASE_URL}/cb-ss/`,
    },
  ];

  const currentTemplate =
    templates.find((t) => t.id === selectedTemplate) || templates[0];

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

import { useState } from "react";
import CallGridLanderForm from "../components/CallGridLanderForm";

function CallGridLander() {
  const [selectedTemplate, setSelectedTemplate] = useState("cg-grocery");

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <CallGridLanderForm
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
        />
      </div>
    </div>
  );
}

export default CallGridLander;

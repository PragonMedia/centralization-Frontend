import { useState } from "react";
import LanderCreationForm from "../components/LanderCreationForm";

function LanderCreation() {
  const [selectedTemplate, setSelectedTemplate] = useState("cb-groc");

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <LanderCreationForm
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
        />
      </div>
    </div>
  );
}

export default LanderCreation;

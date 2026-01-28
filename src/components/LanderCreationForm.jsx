import { useState, useEffect, useCallback } from "react";
import TemplatePreview from "./TemplatePreview";
import EditModal from "./EditModal";
import {
  API_ENDPOINTS,
  getAuthHeaders,
  getRingbaHeaders,
} from "../config/api.js";
import { cachedFetch, CACHE_CONFIG, invalidateCache } from "../utils/cache.js";
import { sanitizeInput, validateInput } from "../utils/sanitization.js";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

// Move constants outside component to avoid dependency issues
const JakeDetails = {
  ringbaID: "CAd4c016a37829477688c3482fb6fd01de",
  phoneNumber: "+18664982822",
};
const AddyDetails = {
  ringbaID: "CAd4c016a37829477688c3482fb6fd01de",
  phoneNumber: "+18447840433",
};
const SeanDetails = {
  ringbaID: "CAd4c016a37829477688c3482fb6fd01de",
  phoneNumber: "+18333530496",
};
const EliteDetails = {
  ringbaID: "CA96589cff1d5d4fa48f459da7dbd3a728",
  phoneNumber: "+13213980346",
};

function LanderCreationForm({ selectedTemplate, setSelectedTemplate }) {
  // Vertical options
  const allVerticals = [
    "Medicare PPC",
    "Debt PPC",
    "Sweeps",
    "Nutra",
    "Casino",
  ];

  // Filter verticals based on organization
  // When Elite is selected, only show Medicare PPC
  const getFilteredVerticals = () => {
    if (formData.organization === "elite") {
      return ["Medicare PPC"];
    }
    return allVerticals;
  };

  // Template options by vertical - stored values (for DB) and display names
  const templatesByVertical = {
    "Medicare PPC": [
      { value: "cb-groc", label: "Chatbot Grocery" },
      { value: "cb-ss", label: "Chatbot Social Security" },
      { value: "cb-groc-short", label: "Chatbot Grocery Short" },
      { value: "cb-ss-short", label: "Chatbot Social Security Short" },
      { value: "es-cb-groc", label: "Chatbot Grocery Spanish" },
      { value: "es-cb-ss", label: "Chatbot Social Security Spanish" },
      { value: "es-cb-groc-short", label: "Chatbot Grocery Short" },
      { value: "es-cb-ss-short", label: "Chatbot Social Security Short" },
    ],
    "Debt PPC": [{ value: "gg-debt-v1", label: "debt" }],
    Sweeps: [
      { value: "sweep", label: "Sweep" },
      { value: "stimulus", label: "Stimulus" },
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

  // Dummy campaigns by vertical (for non-Medicare PPC verticals)
  const dummyCampaignsByVertical = {
    "Debt PPC": [
      { id: "debt-campaign-1", name: "Debt Relief Campaign 1" },
      { id: "debt-campaign-2", name: "Debt Consolidation Campaign" },
      { id: "debt-campaign-3", name: "Credit Repair Campaign" },
    ],
    Sweeps: [
      { id: "sweep", name: "$750 Walmart Gift Card" },
      { id: "stimulus", name: "Stimulus" },
    ],
    Nutra: [
      { id: "nutra-campaign-1", name: "Weight Loss Supplement Campaign" },
      { id: "nutra-campaign-2", name: "Muscle Building Campaign" },
      { id: "nutra-campaign-3", name: "Vitamin Supplement Campaign" },
    ],
    Casino: [
      { id: "casino-campaign-1", name: "Casino Signup Bonus Campaign" },
      { id: "casino-campaign-2", name: "Online Casino Promo Campaign" },
      { id: "casino-campaign-3", name: "Casino Welcome Bonus Campaign" },
    ],
  };

  const platformOptions = ["Facebook", "Google", "Liftoff", "Bigo"];

  const [url, setURL] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRtkIDEditModal, setShowRtkIDEditModal] = useState(false);
  const [isUpdatingRtkID, setIsUpdatingRtkID] = useState(false);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [formData, setFormData] = useState({
    organization: "paragon media",
    domain: "",
    route: "",
    template: "cb-groc", // Default template
    rtkID: "",
    phoneNumber: "",
    ringbaID: "",
    createdBy: "",
    platform: "",
  });
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [selectedDomainHasRtkID, setSelectedDomainHasRtkID] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [mediaBuyers, setMediaBuyers] = useState([]);
  const [selectedMediaBuyerFromCampaign, setSelectedMediaBuyerFromCampaign] =
    useState("");
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [filteredDomains, setFilteredDomains] = useState([]);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState("");

  // Function to auto-fill details for mediaBuyer role users
  const autoFillForMediaBuyer = useCallback(
    (userData) => {
      if (!userData || !campaignDetails) return;

      // If Elite organization is selected, use EliteDetails
      if (formData.organization === "elite") {
        setFormData((prev) => ({
          ...prev,
          ringbaID: EliteDetails.ringbaID,
          phoneNumber: EliteDetails.phoneNumber,
        }));
        return;
      }

      // Get user's name variations for flexible matching
      const firstName = (userData.firstName || "").trim();
      const lastName = (userData.lastName || "").trim();
      const userFullName = `${firstName} ${lastName}`.trim();
      const userFirstName = firstName;

      console.log("Looking for user with flexible matching:", {
        fullName: userFullName,
        firstName: userFirstName,
        availableMediaBuyers: mediaBuyers.map((b) => b.name),
      });

      // Try multiple matching strategies:
      // 1. Exact match (full name)
      // 2. First name match (case-insensitive)
      // 3. Partial match (name contains first name, case-insensitive)
      let matchingMediaBuyer = null;

      // Strategy 1: Exact match
      matchingMediaBuyer = mediaBuyers.find(
        (buyer) => buyer.name && buyer.name.trim() === userFullName
      );

      // Strategy 2: First name match (case-insensitive)
      if (!matchingMediaBuyer && userFirstName) {
        matchingMediaBuyer = mediaBuyers.find(
          (buyer) =>
            buyer.name &&
            buyer.name.trim().toLowerCase() === userFirstName.toLowerCase()
        );
      }

      // Strategy 3: Partial match - Ringba name contains first name (case-insensitive)
      if (!matchingMediaBuyer && userFirstName) {
        matchingMediaBuyer = mediaBuyers.find(
          (buyer) =>
            buyer.name &&
            buyer.name
              .trim()
              .toLowerCase()
              .includes(userFirstName.toLowerCase())
        );
      }

      // Strategy 4: Reverse partial match - first name contains Ringba name (case-insensitive)
      if (!matchingMediaBuyer && userFirstName) {
        matchingMediaBuyer = mediaBuyers.find(
          (buyer) =>
            buyer.name &&
            userFirstName
              .toLowerCase()
              .includes(buyer.name.trim().toLowerCase())
        );
      }

      if (matchingMediaBuyer) {
        console.log("Found matching media buyer with flexible matching:", {
          matchedName: matchingMediaBuyer.name,
          userFullName: userFullName,
          campaignId: matchingMediaBuyer.campaignId,
          e164Number: matchingMediaBuyer.e164Number,
        });
        setFormData((prev) => ({
          ...prev,
          ringbaID: matchingMediaBuyer.campaignId,
          phoneNumber: matchingMediaBuyer.e164Number,
        }));
      } else {
        console.warn("No matching media buyer found for:", {
          userFullName: userFullName,
          firstName: userFirstName,
          availableNames: mediaBuyers.map((b) => b.name),
        });
      }
    },
    [campaignDetails, mediaBuyers, formData.organization]
  );

  // Initialize form with user details from localStorage and fetch domains
  useEffect(() => {
    try {
      // Get email and role from userData
      let userEmail = "";
      let userRole = "";
      const userData = localStorage.getItem("userData");

      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          userEmail = parsedUserData.email || "";
          userRole = parsedUserData.role || "";
        } catch (err) {
          console.error("Error parsing user data:", err);
        }
      }

      console.log("Current user email:", userEmail);
      console.log("Current user role:", userRole);

      setCurrentUserRole(userRole);

      // Check if user is Tech/CEO/Admin - they can select media buyer
      if (userRole === "tech" || userRole === "ceo" || userRole === "admin") {
        // For Tech/CEO/Admin, don't auto-fill details yet - wait for media buyer selection
        setFormData((prev) => ({
          ...prev,
          createdBy: userEmail, // Set createdBy to current user
        }));
      } else {
        // For regular users (Jake, Addy, Sean), auto-fill their details
        if (userEmail === "jake@paragonmedia.io") {
          setFormData((prev) => ({
            ...prev,
            ringbaID: JakeDetails.ringbaID,
            phoneNumber: JakeDetails.phoneNumber,
            createdBy: "jake@paragonmedia.io",
          }));
        } else if (userEmail === "addy@paragonmedia.io") {
          setFormData((prev) => ({
            ...prev,
            ringbaID: AddyDetails.ringbaID,
            phoneNumber: AddyDetails.phoneNumber,
            createdBy: "addy@paragonmedia.io",
          }));
        } else if (userEmail === "sean@paragonmedia.io") {
          setFormData((prev) => ({
            ...prev,
            ringbaID: SeanDetails.ringbaID,
            phoneNumber: SeanDetails.phoneNumber,
            createdBy: "sean@paragonmedia.io",
          }));
        } else {
          // Default to Jake's details for other users
          setFormData((prev) => ({
            ...prev,
            ringbaID: JakeDetails.ringbaID,
            phoneNumber: JakeDetails.phoneNumber,
            createdBy: "jake@paragonmedia.io",
          }));
        }
      }

      // Fetch domains after user data is loaded
      // Campaigns will be fetched when vertical is selected
      fetchAvailableDomains();
    } catch (error) {
      console.error("Error in LanderCreationForm useEffect:", error);
    }
  }, []);

  // Auto-fill for mediaBuyer users when campaign details are loaded
  useEffect(() => {
    if (
      currentUserRole === "mediaBuyer" &&
      campaignDetails &&
      mediaBuyers.length > 0
    ) {
      const userData = localStorage.getItem("userData");
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          autoFillForMediaBuyer(parsedUserData, selectedCampaign);
        } catch (err) {
          console.error("Error parsing user data:", err);
        }
      }
    }
  }, [
    campaignDetails,
    mediaBuyers,
    currentUserRole,
    selectedCampaign,
    autoFillForMediaBuyer,
  ]);

  // Function to handle campaign selection and auto-fill details
  const handleCampaignChange = (campaignId) => {
    setSelectedCampaign(campaignId);
    setSelectedMediaBuyerFromCampaign(""); // Reset media buyer selection

    // If Elite organization is selected
    if (formData.organization === "elite") {
      // For CEO/TECH/ADMIN users, still fetch campaign details to show media buyers dropdown
      // For mediaBuyer users, use EliteDetails directly
      if (
        currentUserRole === "tech" ||
        currentUserRole === "ceo" ||
        currentUserRole === "admin"
      ) {
        // Still fetch campaign details for CEO/TECH/ADMIN to populate media buyers
        // But set EliteDetails for ringbaID and phoneNumber
        setFormData((prev) => ({
          ...prev,
          ringbaID: EliteDetails.ringbaID,
          phoneNumber: EliteDetails.phoneNumber,
        }));

        // For Medicare PPC and Debt PPC, fetch campaign details to get media buyers
        if (
          selectedVertical === "Medicare PPC" ||
          selectedVertical === "Debt PPC"
        ) {
          // Find the selected campaign to check its name
          const selectedCampaignObj = campaigns.find(
            (campaign) => campaign.id === campaignId
          );
          const campaignName = selectedCampaignObj?.name || "";

          // If "Paragon - Spanish Medicare" is selected, use "Paragon - Medicare" as fallback
          // since they share the same media buyers
          let fallbackCampaignId = null;
          if (campaignName === "Paragon - Spanish Medicare") {
            const paragonMedicareCampaign = campaigns.find(
              (campaign) => campaign.name === "Paragon - Medicare"
            );
            fallbackCampaignId = paragonMedicareCampaign?.id || null;
          }

          fetchCampaignDetails(campaignId, fallbackCampaignId);
          return;
        }

        // For other verticals, show all media buyers
        if (selectedVertical) {
          setMediaBuyers([
            { name: "Jake Hunter" },
            { name: "Addy Jaloudi" },
            { name: "Sean Luc" },
          ]);
          return;
        }
      } else {
        // For mediaBuyer users, use EliteDetails directly and don't fetch campaign details
        setFormData((prev) => ({
          ...prev,
          ringbaID: EliteDetails.ringbaID,
          phoneNumber: EliteDetails.phoneNumber,
        }));
        return;
      }
    }

    // For Medicare PPC and Debt PPC, fetch campaign details to get media buyers from Ringba
    if (
      selectedVertical === "Medicare PPC" ||
      selectedVertical === "Debt PPC"
    ) {
      // Find the selected campaign to check its name
      const selectedCampaignObj = campaigns.find(
        (campaign) => campaign.id === campaignId
      );
      const campaignName = selectedCampaignObj?.name || "";

      // If "Paragon - Spanish Medicare" is selected, use "Paragon - Medicare" as fallback
      // since they share the same media buyers
      let fallbackCampaignId = null;
      if (campaignName === "Paragon - Spanish Medicare") {
        const paragonMedicareCampaign = campaigns.find(
          (campaign) => campaign.name === "Paragon - Medicare"
        );
        fallbackCampaignId = paragonMedicareCampaign?.id || null;
      }

      fetchCampaignDetails(campaignId, fallbackCampaignId);
      return;
    }

    // For other non-Medicare PPC verticals, show all media buyers
    if (selectedVertical) {
      setMediaBuyers([
        { name: "Jake Hunter" },
        { name: "Addy Jaloudi" },
        { name: "Sean Luc" },
      ]);
      return;
    }

    // Fallback: fetch campaign details if no vertical is selected
    fetchCampaignDetails(campaignId, null);
  };

  // Function to handle media buyer selection from campaign
  const handleMediaBuyerFromCampaignChange = (mediaBuyerName) => {
    setSelectedMediaBuyerFromCampaign(mediaBuyerName);

    // If Elite organization is selected, don't use campaign data
    if (formData.organization === "elite") {
      setFormData((prev) => ({
        ...prev,
        ringbaID: EliteDetails.ringbaID,
        phoneNumber: EliteDetails.phoneNumber,
        // Don't change createdBy - it should remain as the logged-in user
      }));
      return;
    }

    // Find the selected media buyer in the current media buyers list
    const selectedMediaBuyerData = mediaBuyers.find(
      (buyer) => buyer.name === mediaBuyerName
    );

    // If we have campaign details from Ringba (Medicare/Debt PPC), use those
    if (
      selectedMediaBuyerData &&
      selectedMediaBuyerData.campaignId &&
      selectedMediaBuyerData.e164Number
    ) {
      // Update form data with media buyer details from Ringba
      // Don't change createdBy - it should remain as the logged-in user
      setFormData((prev) => ({
        ...prev,
        ringbaID: selectedMediaBuyerData.campaignId,
        phoneNumber: selectedMediaBuyerData.e164Number,
      }));
    } else {
      // For non-Medicare/Debt PPC verticals, use hardcoded details
      let ringbaID = "";
      let phoneNumber = "";

      if (mediaBuyerName === "Jake Hunter") {
        ringbaID = JakeDetails.ringbaID;
        phoneNumber = JakeDetails.phoneNumber;
      } else if (mediaBuyerName === "Addy Jaloudi") {
        ringbaID = AddyDetails.ringbaID;
        phoneNumber = AddyDetails.phoneNumber;
      } else if (mediaBuyerName === "Sean Luc") {
        ringbaID = SeanDetails.ringbaID;
        phoneNumber = SeanDetails.phoneNumber;
      }

      setFormData((prev) => ({
        ...prev,
        ringbaID: ringbaID,
        phoneNumber: phoneNumber,
        // Don't change createdBy - it should remain as the logged-in user
      }));
    }
  };

  // Multi-step navigation functions
  const nextStep = () => {
    if (currentStep < 4) {
      // Validate current step before proceeding
      if (validateCurrentStep()) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Validate current step before proceeding
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Organization selection
        if (!formData.organization) {
          alert("Please select an organization");
          return false;
        }
        return true;

      case 2:
        // Step 2: Vertical and Campaign
        if (!selectedVertical) {
          alert("Please select a vertical");
          return false;
        }
        if (!selectedCampaign) {
          alert("Please select a campaign");
          return false;
        }
        // For non-mediaBuyer roles, also check media buyer selection
        if (
          currentUserRole !== "mediaBuyer" &&
          !selectedMediaBuyerFromCampaign
        ) {
          alert("Please select a media buyer");
          return false;
        }
        return true;

      case 3:
        // Step 3: Domain selection
        if (!formData.domain) {
          alert("Please select a domain");
          return false;
        }
        return true;

      case 4:
        // Step 4: Landing page details
        if (!formData.route) {
          alert("Please enter a path");
          return false;
        }
        if (!selectedTemplate) {
          alert("Please select a template");
          return false;
        }
        // Only require rtkID if domain doesn't already have one
        if (!selectedDomainHasRtkID && !formData.rtkID) {
          alert("Please enter RT Campaign ID");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Validate all fields before final submission
  const validateAllFields = () => {
    // Check all required fields
    if (!formData.organization) {
      alert("Please select an organization");
      return false;
    }
    if (!selectedVertical) {
      alert("Please select a vertical");
      return false;
    }
    if (!selectedCampaign) {
      alert("Please select a campaign");
      return false;
    }
    if (currentUserRole !== "mediaBuyer" && !selectedMediaBuyerFromCampaign) {
      alert("Please select a media buyer");
      return false;
    }
    if (!formData.domain) {
      alert("Please select a domain");
      return false;
    }
    if (!formData.route) {
      alert("Please enter a path");
      return false;
    }
    if (!selectedTemplate) {
      alert("Please select a template");
      return false;
    }
    // Only require rtkID if domain doesn't already have one
    if (!selectedDomainHasRtkID && !formData.rtkID) {
      alert("Please enter RT Campaign ID");
      return false;
    }
    return true;
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to filter domains based on user role
  const filterDomainsByUser = useCallback(
    (domains, userEmail, userRole) => {
      console.log("Filtering domains for user:", { userEmail, userRole });
      console.log("Available domains:", domains);
      console.log("Sample domain object:", domains[0]);
      console.log(
        "Domain object keys:",
        domains[0] ? Object.keys(domains[0]) : "No domains"
      );

      if (userRole === "mediaBuyer") {
        // For mediaBuyer users, only show domains assigned to them
        // Only check assignedTo - createdBy is the admin who created the domain, not the mediaBuyer
        const filtered = domains.filter((domain) => {
          console.log(
            "Checking domain:",
            domain.domain,
            "assignedTo:",
            domain.assignedTo,
            "userEmail:",
            userEmail
          );
          return domain.assignedTo === userEmail;
        });
        console.log("Filtered domains for mediaBuyer:", filtered);
        console.log("Number of domains before filtering:", domains.length);
        console.log("Number of domains after filtering:", filtered.length);

        return filtered;
      } else if (
        userRole === "tech" ||
        userRole === "ceo" ||
        userRole === "admin"
      ) {
        // For tech/ceo/admin users, filter based on selected media buyer
        if (selectedMediaBuyerFromCampaign) {
          // Map media buyer names to emails (handle variations in names from Ringba API)
          const mediaBuyerEmailMap = {
            "Jake Hunter": "jake@paragonmedia.io",
            Jake: "jake@paragonmedia.io", // Ringba API might return just "Jake"
            "Addy Jaloudi": "addy@paragonmedia.io",
            Addy: "addy@paragonmedia.io", // Ringba API might return just "Addy"
            "Sean Luc": "sean@paragonmedia.io",
            Sean: "sean@paragonmedia.io", // Ringba API might return just "Sean"
          };

          const selectedEmail =
            mediaBuyerEmailMap[selectedMediaBuyerFromCampaign];
          console.log(
            "Filtering domains for selected media buyer:",
            selectedMediaBuyerFromCampaign,
            "email:",
            selectedEmail
          );

          const filtered = domains.filter((domain) => {
            console.log(
              "Checking domain:",
              domain.domain,
              "assignedTo:",
              domain.assignedTo,
              "selectedEmail:",
              selectedEmail
            );
            // Only check assignedTo - createdBy is the admin who created the domain
            return domain.assignedTo === selectedEmail;
          });

          console.log("Filtered domains for selected media buyer:", filtered);
          return filtered;
        }

        // If no media buyer selected, show all domains
        console.log("No media buyer selected, showing all domains");
        return domains;
      } else {
        // For other roles, show all domains
        console.log("Showing all domains for role:", userRole);
        return domains;
      }
    },
    [selectedMediaBuyerFromCampaign]
  );

  // Update filtered domains when availableDomains, user, or vertical changes
  useEffect(() => {
    if (availableDomains.length > 0) {
      const userData = localStorage.getItem("userData");
      console.log("Raw userData from localStorage:", userData);
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          console.log("Parsed userData:", parsedUserData);
          console.log(
            "About to filter domains for:",
            parsedUserData.email,
            "with role:",
            parsedUserData.role,
            "and vertical:",
            selectedVertical
          );
          let filtered = filterDomainsByUser(
            availableDomains,
            parsedUserData.email,
            parsedUserData.role
          );

          // Filter by vertical if selected and domain has vertical property
          if (selectedVertical && filtered.length > 0) {
            filtered = filtered.filter((domain) => {
              // If domain has a vertical property, filter by it
              // Otherwise, include all domains (for backward compatibility)
              return domain.vertical === selectedVertical || !domain.vertical;
            });
            console.log(
              "Filtered by vertical:",
              selectedVertical,
              "Result:",
              filtered
            );
          }

          console.log("Filtered result:", filtered);
          setFilteredDomains(filtered);
        } catch (err) {
          console.error("Error parsing user data:", err);
          setFilteredDomains(availableDomains);
        }
      } else {
        console.log("No userData found in localStorage");
        setFilteredDomains(availableDomains);
      }
    }
  }, [
    availableDomains,
    currentUserRole,
    selectedMediaBuyerFromCampaign,
    selectedVertical,
    filterDomainsByUser,
  ]);

  // Function to fetch campaigns based on selected vertical
  const fetchCampaigns = async (vertical, organization = null) => {
    // Use provided organization or fall back to formData.organization
    const currentOrganization = organization || formData.organization;
    try {
      setIsLoadingCampaigns(true);

      // For Medicare PPC and Debt PPC, fetch from Ringba API
      if (vertical === "Medicare PPC" || vertical === "Debt PPC") {
        const response = await cachedFetch(
          API_ENDPOINTS.RINGBA.CAMPAIGNS,
          {
            method: "GET",
            headers: getRingbaHeaders(),
          },
          CACHE_CONFIG.CAMPAIGNS
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Campaigns API Response:", data);
        console.log("From cache:", response.fromCache);

        // Extract campaigns array from the response
        const campaignsData = data.campaigns || [];

        console.log("All campaigns from API:", campaignsData);
        console.log("Current organization:", currentOrganization);
        console.log("Selected vertical:", vertical);

        // Filter campaigns based on vertical and organization
        let filteredCampaigns = [];
        if (vertical === "Medicare PPC") {
          // If Elite organization is selected, show "Elite - Medicare"
          // Otherwise, show "Paragon - Medicare" and "Paragon - Spanish Medicare"
          const isElite =
            currentOrganization === "elite" ||
            currentOrganization?.toLowerCase() === "elite";
          console.log("Is Elite organization?", isElite);

          if (isElite) {
            // For Elite, use "Paragon - Medicare" campaign but display as "Elite - Medicare"
            filteredCampaigns = campaignsData
              .filter((campaign) => {
                const matches =
                  campaign.name === "Paragon - Medicare" ||
                  campaign.name?.toLowerCase() === "paragon - medicare";
                return matches;
              })
              .map((campaign) => ({
                ...campaign,
                name: "Elite - Medicare", // Change display name to "Elite - Medicare"
              }));
            console.log(
              "Filtered Elite campaigns (displayed as Elite - Medicare):",
              filteredCampaigns
            );
          } else {
            // For Paragon Media, show both "Paragon - Medicare" and "Paragon - Spanish Medicare"
            filteredCampaigns = campaignsData.filter((campaign) => {
              const campaignName = campaign.name?.toLowerCase() || "";
              const matches =
                campaign.name === "Paragon - Medicare" ||
                campaignName === "paragon - medicare" ||
                campaign.name === "Paragon - Spanish Medicare" ||
                campaignName === "paragon - spanish medicare";
              return matches;
            });
            console.log("Filtered Paragon campaigns:", filteredCampaigns);
          }
        } else if (vertical === "Debt PPC") {
          // Filter to only show "Paragon - Debt" campaign
          filteredCampaigns = campaignsData.filter(
            (campaign) => campaign.name === "Paragon - Debt"
          );
        }

        setCampaigns(filteredCampaigns);
      } else {
        // For other verticals, use dummy campaigns
        const dummyCampaigns = dummyCampaignsByVertical[vertical] || [];
        console.log(`Using dummy campaigns for ${vertical}:`, dummyCampaigns);
        setCampaigns(dummyCampaigns);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Handler for vertical selection change
  const handleVerticalChange = (vertical) => {
    setSelectedVertical(vertical);
    setSelectedCampaign(""); // Reset campaign selection
    setSelectedMediaBuyerFromCampaign(""); // Reset media buyer selection
    setMediaBuyers([]); // Reset media buyers
    setFormData((prev) => ({
      ...prev,
      domain: "", // Reset domain
      template: "", // Reset template
    }));

    // Fetch campaigns for the selected vertical
    if (vertical) {
      fetchCampaigns(vertical, formData.organization);
    } else {
      setCampaigns([]);
    }
  };

  // Function to fetch campaign details and extract media buyers
  const fetchCampaignDetails = async (
    campaignId,
    fallbackCampaignId = null
  ) => {
    if (!campaignId) return;

    try {
      const response = await cachedFetch(
        API_ENDPOINTS.RINGBA.CAMPAIGN_DETAILS(campaignId),
        {
          method: "GET",
          headers: getRingbaHeaders(),
        },
        CACHE_CONFIG.CAMPAIGN_DETAILS
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Campaign Details API Response:", data);
      console.log("From cache:", response.fromCache);

      setCampaignDetails(data);

      // Extract media buyers from jsTags
      if (data.jsTags && typeof data.jsTags === "object") {
        const mediaBuyersArray = Object.values(data.jsTags).map((jsTag) => ({
          name: jsTag.name,
          campaignId: jsTag.campaignId,
          e164Number: jsTag.previousNumber?.e164Number || "N/A",
        }));

        console.log("Extracted media buyers:", mediaBuyersArray);
        setMediaBuyers(mediaBuyersArray);
      } else {
        // If no media buyers found and fallback is available, try fallback
        if (fallbackCampaignId) {
          console.log(
            "No media buyers found, trying fallback campaign:",
            fallbackCampaignId
          );
          return fetchCampaignDetails(fallbackCampaignId);
        }
        setMediaBuyers([]);
      }
    } catch (error) {
      console.error("Error fetching campaign details:", error);
      // If fetch failed and fallback is available, try fallback
      if (fallbackCampaignId) {
        console.log(
          "Fetch failed, trying fallback campaign:",
          fallbackCampaignId
        );
        return fetchCampaignDetails(fallbackCampaignId);
      }
      setCampaignDetails(null);
      setMediaBuyers([]);
    }
  };

  // Function to fetch all available domains
  const fetchAvailableDomains = async () => {
    try {
      setIsLoadingDomains(true);
      const token = localStorage.getItem("authToken");
      console.log("Auth token:", token ? "Found" : "Not found");

      if (!token) {
        console.log("No auth token, skipping domain fetch");
        setIsLoadingDomains(false);
        return;
      }

      console.log("Fetching domains from API...");
      const response = await cachedFetch(
        API_ENDPOINTS.DOMAINS.LIST,
        {
          headers: getAuthHeaders(),
        },
        CACHE_CONFIG.DOMAINS
      );

      console.log("API response status:", response.status);
      console.log("From cache:", response.fromCache);

      if (response.ok) {
        const data = await response.json();
        console.log("API response data:", data);

        // Ensure we have an array, if not, try to extract it from the response
        let domains = [];
        if (Array.isArray(data)) {
          domains = data;
        } else if (data && Array.isArray(data.domains)) {
          domains = data.domains;
        } else if (data && Array.isArray(data.data)) {
          domains = data.data;
        } else {
          console.warn("Unexpected data structure:", data);
          domains = []; // Set empty array as fallback
        }

        console.log("Extracted domains:", domains);
        setAvailableDomains(domains);
      } else {
        console.error(
          "API response not ok:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching available domains:", error);
      setAvailableDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  // Function to filter domains based on user input

  // Function to validate domain
  const validateDomain = (domain) => {
    if (!domain.trim()) {
      return false;
    }

    // Check if domain exists in availableDomains (which are now objects)
    const isValid = availableDomains.some(
      (domainObj) => domainObj.domain === domain
    );

    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "organization") {
      // Reset template when organization changes (default to first template)
      const newTemplate = "cb-groc";
      setSelectedTemplate(newTemplate);

      // Update ringbaID and phoneNumber based on organization
      if (value === "elite") {
        // Always use EliteDetails when Elite is selected
        // Reset vertical to empty and let user select (but only Medicare PPC will be available)
        setSelectedVertical("");
        setSelectedCampaign("");
        setSelectedMediaBuyerFromCampaign("");
        setMediaBuyers([]);
        setFormData((prev) => ({
          ...prev,
          organization: value,
          template: newTemplate,
          ringbaID: EliteDetails.ringbaID,
          phoneNumber: EliteDetails.phoneNumber,
          domain: "", // Reset domain
        }));
      } else {
        // For paragon media, use user-specific details
        let ringbaID = "";
        let phoneNumber = "";

        // For Tech/CEO/Admin users, use selected media buyer details from campaign
        if (
          currentUserRole === "tech" ||
          currentUserRole === "ceo" ||
          currentUserRole === "admin"
        ) {
          // Use the ringbaID and phoneNumber from formData (already set by handleMediaBuyerFromCampaignChange)
          ringbaID = formData.ringbaID;
          phoneNumber = formData.phoneNumber;
        } else {
          // For regular users, use their own details
          const userData = localStorage.getItem("userData");
          if (userData) {
            try {
              const parsedUserData = JSON.parse(userData);
              const userEmail = parsedUserData.email || "";

              if (userEmail === "jake@paragonmedia.io") {
                ringbaID = JakeDetails.ringbaID;
                phoneNumber = JakeDetails.phoneNumber;
              } else if (userEmail === "addy@paragonmedia.io") {
                ringbaID = AddyDetails.ringbaID;
                phoneNumber = AddyDetails.phoneNumber;
              } else if (userEmail === "sean@paragonmedia.io") {
                ringbaID = SeanDetails.ringbaID;
                phoneNumber = SeanDetails.phoneNumber;
              } else {
                // Default for other users
                ringbaID = EliteDetails.ringbaID;
                phoneNumber = EliteDetails.phoneNumber;
              }
            } catch (err) {
              console.error("Error parsing user data:", err);
            }
          }
        }

        setFormData((prev) => ({
          ...prev,
          organization: value,
          template: newTemplate,
          ringbaID,
          phoneNumber,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));

      // If it's the domain field, validate
      if (name === "domain") {
        validateDomain(value);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted! Current formData:", formData);

    // Validate all required fields before submission
    if (!validateAllFields()) {
      return; // Stop submission if validation fails
    }

    // Get current user data to set createdBy
    const userData = localStorage.getItem("userData");
    let currentUserEmail = "";
    let currentUserRole = "";

    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        currentUserEmail = parsedUserData.email || "";
        currentUserRole = parsedUserData.role || "";
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }

    // For mediaBuyer users, validate that they have access to the selected domain
    if (currentUserRole === "mediaBuyer" && formData.domain) {
      const selectedDomain = availableDomains.find(
        (domain) => domain.domain === formData.domain
      );

      if (selectedDomain) {
        // Only check assignedTo - createdBy is the admin who created the domain
        const hasAccess = selectedDomain.assignedTo === currentUserEmail;

        if (!hasAccess) {
          alert(
            `You don't have access to create landing pages for domain: ${formData.domain}`
          );
          return;
        }
      }
    }

    // Keep organization as-is (backend accepts "paragon media", "elite" format)
    const normalizeOrganization = (org) => {
      if (!org) return "";
      return org.trim(); // Just trim whitespace, keep original format
    };

    // Keep domain as-is (should include .com from form input)
    const domainValue = sanitizeInput.domain(formData.domain || "");

    // Get template value and transform if needed for Elite + Medicare PPC
    let templateValue = sanitizeInput.text(
      formData.template || selectedTemplate || ""
    );
    const normalizedOrg = normalizeOrganization(formData.organization || "");

    // Transform template values for Elite organization with Medicare PPC vertical
    if (
      normalizedOrg.toLowerCase() === "elite" &&
      selectedVertical === "Medicare PPC"
    ) {
      if (templateValue === "cb-groc") {
        templateValue = "el-cb-groc";
      } else if (templateValue === "cb-ss") {
        templateValue = "el-cb-ss";
      }
    }

    // Get rtkID from domain if available, otherwise use form input
    const domainRtkID = formData.domain
      ? availableDomains.find((d) => d.domain === formData.domain)?.rtkID || ""
      : "";
    const finalRtkID =
      domainRtkID && domainRtkID.trim() !== ""
        ? domainRtkID
        : formData.rtkID || "";

    // Sanitize and validate form data
    const sanitizedFormData = {
      organization: normalizedOrg,
      domain: domainValue, // Keep full domain with .com
      route: sanitizeInput.route(formData.route || ""),
      template: templateValue,
      platform: sanitizeInput.text(formData.platform || selectedPlatform || ""),
      rtkID: sanitizeInput.id(finalRtkID), // Use domain's rtkID if available
      ringbaID: sanitizeInput.id(formData.ringbaID || ""),
      phoneNumber: sanitizeInput.phone(formData.phoneNumber || ""),
      createdBy: sanitizeInput.email(
        formData.createdBy || currentUserEmail || ""
      ),
    };

    // Validate sanitized data
    if (!validateInput.required(sanitizedFormData.domain)) {
      alert("Please enter a valid domain name");
      return;
    }

    if (!validateInput.domain(sanitizedFormData.domain)) {
      alert("Please enter a valid domain name");
      return;
    }

    if (!validateInput.required(sanitizedFormData.route)) {
      alert("Please enter a valid route path");
      return;
    }

    if (!validateInput.required(sanitizedFormData.template)) {
      alert("Please select a template");
      return;
    }

    if (!validateInput.required(sanitizedFormData.platform)) {
      alert("Please select a platform");
      return;
    }

    if (!validateInput.required(sanitizedFormData.organization)) {
      alert("Please select an organization");
      return;
    }

    // Validate rtkID - use finalRtkID which includes domain's rtkID if available
    if (!finalRtkID || finalRtkID.trim() === "") {
      alert("Please enter a valid RTK ID");
      return;
    }

    if (!validateInput.required(sanitizedFormData.createdBy)) {
      alert("Please ensure you are properly logged in");
      return;
    }

    // Format data as single object (backend expects object, not array)
    const requestBody = sanitizedFormData;

    // Log what's being submitted to the API
    console.log("=== SUBMITTING LANDING PAGE CREATION ===");
    console.log("API Endpoint:", API_ENDPOINTS.ROUTES.CREATE);
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    console.log("Sanitized Form Data:", sanitizedFormData);
    console.log("RTK ID being sent:", sanitizedFormData.rtkID);
    console.log("FormData.rtkID (raw):", formData.rtkID);
    console.log("Field Checks:", {
      organization: sanitizedFormData.organization,
      domain: sanitizedFormData.domain,
      route: sanitizedFormData.route,
      template: sanitizedFormData.template,
      platform: sanitizedFormData.platform,
      createdBy: sanitizedFormData.createdBy,
      rtkID: sanitizedFormData.rtkID,
    });
    console.log("Headers:", getAuthHeaders());

    // Get auth token from localStorage
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.ROUTES.CREATE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("API Error Response:", errorData);
          errorMessage =
            errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          // Try to get response as text
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

      // Show success modal
      setShowSuccessModal(true);

      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache.domains();

      // Reset form
      setSelectedDomainHasRtkID(false);
      setFormData({
        organization: "paragon media",
        domain: "",
        route: "",
        template: "",
        rtkID: "",
        ringbaID: "",
        phoneNumber: "",
        createdBy: "",
        platform: "",
      });

      // Reset form to step 1
      setCurrentStep(1);

      // Reset other state
      setSelectedTemplate("cb-groc");
      setSelectedPlatform("");
      setSelectedCampaign("");
      setSelectedMediaBuyerFromCampaign("");
      setSelectedVertical("");

      // Set URL for the modal
      setURL(`${sanitizedFormData.domain}/${sanitizedFormData.route}`);
    } catch (error) {
      console.error("Error:", error);
      // You could add a state for error messages and display them to the user
      alert(`Failed to create landing page: ${error.message}`);
    }
  };

  // Progress Bar Component
  const ProgressBar = () => {
    const steps = [
      { number: 1, title: "Organization", completed: currentStep >= 1 },
      { number: 2, title: "Vertical & Campaign", completed: currentStep >= 2 },
      { number: 3, title: "Domain", completed: currentStep >= 3 },
      { number: 4, title: "Details", completed: currentStep >= 4 },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {step.number}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  step.completed ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-4 ${
                    step.completed ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Step 1: Organization Selection
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Select Organization
      </h2>
      <div className="space-y-4">
        <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
          <input
            type="radio"
            name="organization"
            value="paragon media"
            checked={formData.organization === "paragon media"}
            onChange={handleChange}
            className="mr-4"
          />
          <div>
            <div className="font-medium text-gray-900">Paragon Media</div>
            <div className="text-sm text-gray-500">
              Dynamic campaign data from API
            </div>
          </div>
        </label>

        <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
          <input
            type="radio"
            name="organization"
            value="elite"
            checked={formData.organization === "elite"}
            onChange={handleChange}
            className="mr-4"
          />
          <div>
            <div className="font-medium text-gray-900">Elite</div>
            <div className="text-sm text-gray-500">Fixed Elite details</div>
          </div>
        </label>
      </div>
    </div>
  );

  // Step 2: Vertical and Campaign Selection
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Vertical & Campaign
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vertical <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedVertical}
            onChange={(e) => handleVerticalChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select Vertical</option>
            {getFilteredVerticals().map((vertical) => (
              <option key={vertical} value={vertical}>
                {vertical}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCampaign}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isLoadingCampaigns || !selectedVertical}
          >
            <option value="">
              {!selectedVertical
                ? "Please select a vertical first"
                : isLoadingCampaigns
                ? "Loading campaigns..."
                : "Select Campaign"}
            </option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        {/* Media Buyer Selection - Only for non-mediaBuyer users after campaign selection */}
        {currentUserRole !== "mediaBuyer" &&
          selectedCampaign &&
          (mediaBuyers.length > 0 ||
            (selectedVertical &&
              selectedVertical !== "Medicare PPC" &&
              selectedVertical !== "Debt PPC")) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media Buyer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMediaBuyerFromCampaign}
                onChange={(e) =>
                  handleMediaBuyerFromCampaignChange(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Media Buyer</option>
                {/* For Medicare PPC and Debt PPC, show media buyers from Ringba API */}
                {selectedVertical === "Medicare PPC" ||
                selectedVertical === "Debt PPC"
                  ? mediaBuyers.map((buyer, index) => (
                      <option key={index} value={buyer.name}>
                        {buyer.name}
                      </option>
                    ))
                  : /* For other verticals, show all media buyers */
                    mediaBuyers.map((buyer, index) => (
                      <option key={index} value={buyer.name}>
                        {buyer.name}
                      </option>
                    ))}
              </select>
            </div>
          )}
      </div>
    </div>
  );

  // Step 3: Domain Selection
  const renderStep3 = () => {
    console.log("renderStep3 - filteredDomains:", filteredDomains);
    console.log(
      "renderStep3 - filteredDomains length:",
      filteredDomains.length
    );
    console.log("renderStep3 - isLoadingDomains:", isLoadingDomains);
    console.log("renderStep3 - currentUserRole:", currentUserRole);
    console.log("renderStep3 - availableDomains:", availableDomains);
    console.log(
      "renderStep3 - availableDomains length:",
      availableDomains.length
    );

    // Filter domains based on input
    const filteredByInput = filteredDomains.filter((domain) =>
      domain.domain.toLowerCase().includes(formData.domain.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Domain</h2>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domain
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => {
                const domainValue = e.target.value;
                // Check if the typed domain exists and has rtkID
                const matchedDomain = availableDomains.find(
                  (d) => d.domain === domainValue
                );
                const hasRtkID =
                  matchedDomain?.rtkID && matchedDomain.rtkID.trim() !== "";
                setSelectedDomainHasRtkID(hasRtkID);

                setFormData((prev) => ({
                  ...prev,
                  domain: domainValue,
                  rtkID: hasRtkID
                    ? matchedDomain.rtkID || prev.rtkID
                    : prev.rtkID,
                }));
              }}
              onFocus={() => setShowDomainDropdown(true)}
              onBlur={() => {
                // Delay hiding dropdown to allow clicks on options
                setTimeout(() => setShowDomainDropdown(false), 200);
              }}
              placeholder={
                isLoadingDomains
                  ? "Loading domains..."
                  : "Type to search or click to see all domains..."
              }
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoadingDomains}
              autoComplete="off"
            />

            {/* Dropdown arrow icon */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
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

            {/* Dropdown/Suggestions */}
            {showDomainDropdown && filteredDomains.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredByInput.length > 0 ? (
                  filteredByInput.map((domain, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        // Check if domain has rtkID and auto-populate it
                        const hasRtkID =
                          domain.rtkID && domain.rtkID.trim() !== "";
                        setSelectedDomainHasRtkID(hasRtkID);

                        setFormData((prev) => ({
                          ...prev,
                          domain: domain.domain,
                          platform: domain.platform || prev.platform,
                          rtkID: hasRtkID ? domain.rtkID : prev.rtkID, // Use domain's rtkID if available
                        }));
                        setSelectedPlatform(domain.platform || "");
                        setShowDomainDropdown(false);
                      }}
                    >
                      <div className="text-sm text-gray-900">
                        {domain.domain}
                      </div>
                    </div>
                  ))
                ) : formData.domain ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No domains found matching "{formData.domain}"
                  </div>
                ) : (
                  // Show all domains when no search term
                  filteredDomains.map((domain, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        // Check if domain has rtkID and auto-populate it
                        const hasRtkID =
                          domain.rtkID && domain.rtkID.trim() !== "";
                        setSelectedDomainHasRtkID(hasRtkID);

                        setFormData((prev) => ({
                          ...prev,
                          domain: domain.domain,
                          platform: domain.platform || prev.platform,
                          rtkID: hasRtkID ? domain.rtkID : prev.rtkID, // Use domain's rtkID if available
                        }));
                        setSelectedPlatform(domain.platform || "");
                        setShowDomainDropdown(false);
                      }}
                    >
                      <div className="text-sm text-gray-900">
                        {domain.domain}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {currentUserRole === "mediaBuyer" ? (
            <p className="mt-2 text-sm text-gray-500">
              Showing only domains assigned to you
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Showing all available domains
            </p>
          )}
          {currentUserRole === "tech" ||
          currentUserRole === "ceo" ||
          currentUserRole === "admin" ? (
            selectedMediaBuyerFromCampaign ? (
              <p className="mt-2 text-sm text-gray-500">
                Showing domains assigned to {selectedMediaBuyerFromCampaign}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Select a media buyer to filter domains
              </p>
            )
          ) : null}
        </div>
      </div>
    );
  };

  // Step 4: Path, Template, and RT Campaign ID
  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Landing Page Details
      </h2>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Path
          </label>
          <input
            type="text"
            name="route"
            value={formData.route}
            onChange={handleChange}
            placeholder="nn"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              setFormData((prev) => ({ ...prev, template: e.target.value }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!selectedVertical}
          >
            <option value="">
              {!selectedVertical
                ? "Please select a vertical first"
                : "Select Template"}
            </option>
            {(() => {
              // Filter templates based on selected campaign
              const allTemplates = templatesByVertical[selectedVertical] || [];

              // Find the selected campaign to get its name
              const selectedCampaignObj = campaigns.find(
                (campaign) => campaign.id === selectedCampaign
              );
              const campaignName = selectedCampaignObj?.name || "";

              let filteredTemplates = [];

              if (selectedVertical === "Medicare PPC") {
                if (campaignName === "Paragon - Medicare") {
                  // For "Paragon - Medicare", show cb-groc, cb-ss, cb-groc-short, cb-ss-short
                  filteredTemplates = allTemplates.filter(
                    (template) =>
                      template.value === "cb-groc" ||
                      template.value === "cb-ss" ||
                      template.value === "cb-groc-short" ||
                      template.value === "cb-ss-short"
                  );
                } else if (campaignName === "Paragon - Spanish Medicare") {
                  // For "Paragon - Spanish Medicare", show only es-cb-groc and es-cb-ss
                  filteredTemplates = allTemplates.filter(
                    (template) =>
                      template.value === "es-cb-groc" ||
                      template.value === "es-cb-ss"
                  );
                } else if (campaignName === "Elite - Medicare") {
                  // For "Elite - Medicare", show cb-groc, cb-ss (transformed at submit) and es-cb-groc-short, es-cb-ss-short (saved as-is)
                  filteredTemplates = allTemplates.filter(
                    (template) =>
                      template.value === "cb-groc" ||
                      template.value === "cb-ss" ||
                      template.value === "es-cb-groc-short" ||
                      template.value === "es-cb-ss-short"
                  );
                } else {
                  // Fallback: show all templates (for other campaigns or if campaign not selected)
                  filteredTemplates = allTemplates;
                }
              } else if (selectedVertical === "Sweeps") {
                if (campaignName === "Stimulus") {
                  // For "Stimulus" campaign, show only Stimulus template
                  filteredTemplates = allTemplates.filter(
                    (template) => template.value === "stimulus"
                  );
                } else if (campaignName === "$750 Walmart Gift Card") {
                  // For "$750 Walmart Gift Card" campaign, show only Sweep template
                  filteredTemplates = allTemplates.filter(
                    (template) => template.value === "sweep"
                  );
                } else {
                  // Fallback: show all templates (for other campaigns or if campaign not selected)
                  filteredTemplates = allTemplates;
                }
              } else {
                // For other verticals, show all templates
                filteredTemplates = allTemplates;
              }

              return filteredTemplates.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ));
            })()}
          </select>
        </div>

        {!selectedDomainHasRtkID && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RT Campaign ID
            </label>
            <input
              type="text"
              name="rtkID"
              value={formData.rtkID}
              onChange={handleChange}
              placeholder="677086c62cca41d88a6b6e2d"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        {selectedDomainHasRtkID && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">RT Campaign ID:</span>{" "}
                {formData.rtkID ||
                  availableDomains.find((d) => d.domain === formData.domain)
                    ?.rtkID ||
                  "N/A"}
                <span className="ml-2 text-xs text-blue-600">
                  (Using domain's RT Campaign ID)
                </span>
              </p>
            </div>
            {/* Edit RT ID Button for Media Buyers */}
            {currentUserRole === "mediaBuyer" && (
              <button
                type="button"
                onClick={() => setShowRtkIDEditModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Edit RT ID
              </button>
            )}
          </div>
        )}
      </div>

      {/* Template Preview Below Form Fields */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="border rounded-lg overflow-hidden h-[80vh] overflow-y-auto">
          <TemplatePreview selectedTemplate={selectedTemplate} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Card Layout */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ProgressBar />

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create Landing Page
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" />

          {/* Modal */}
          <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md mx-4 z-50 relative">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
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

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Lander Created Successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Your new lander has been created and is ready to use.
              </p>

              {/* Lander Link */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 mb-2 font-medium">
                  Your New Lander:
                </p>
                <a
                  href={`http://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium break-all"
                >
                  {url}
                </a>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit RT ID Modal for Media Buyers */}
      {showRtkIDEditModal && (
        <EditModal
          isOpen={showRtkIDEditModal}
          onClose={() => {
            setShowRtkIDEditModal(false);
          }}
          onSave={async (data) => {
            setIsUpdatingRtkID(true);
            try {
              const selectedDomain = availableDomains.find(
                (d) => d.domain === formData.domain
              );

              if (!selectedDomain) {
                throw new Error("Domain not found");
              }

              const updateData = {
                oldDomain: selectedDomain.domain,
                newDomain: selectedDomain.domain,
                oldOrganization: selectedDomain.organization,
                newOrganization: selectedDomain.organization,
                oldId: selectedDomain.id,
                newId: selectedDomain.id,
                oldPlatform: selectedDomain.platform,
                newPlatform: selectedDomain.platform,
                oldRtkID: selectedDomain.rtkID || "",
                newRtkID: data.rtkID || "",
                oldCertificationTags: selectedDomain.certificationTags || [],
                newCertificationTags: selectedDomain.certificationTags || [],
                oldAssignedTo:
                  selectedDomain.assignedTo || selectedDomain.createdBy,
                newAssignedTo:
                  selectedDomain.assignedTo || selectedDomain.createdBy,
              };

              const response = await fetch(API_ENDPOINTS.DOMAINS.UPDATE, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData),
              });

              if (!response.ok) {
                let errorMessage = `Failed to update RT Campaign ID: ${response.statusText}`;
                try {
                  const errorData = await response.json();
                  errorMessage =
                    errorData.error || errorData.message || errorMessage;
                } catch {
                  try {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                  } catch {
                    // Keep default errorMessage
                  }
                }
                throw new Error(errorMessage);
              }

              const result = await response.json();
              console.log("RT Campaign ID updated successfully:", result);

              // Update formData with new rtkID
              setFormData((prev) => ({
                ...prev,
                rtkID: data.rtkID || "",
              }));

              // Refresh available domains to get updated rtkID
              const domainsResponse = await fetch(API_ENDPOINTS.DOMAINS.LIST, {
                headers: getAuthHeaders(),
              });
              if (domainsResponse.ok) {
                const domainsData = await domainsResponse.json();
                const domains = Array.isArray(domainsData)
                  ? domainsData
                  : domainsData.domains || domainsData.data || [];
                setAvailableDomains(domains);
              }

              // Close modal
              setShowRtkIDEditModal(false);
            } catch (error) {
              console.error("Error updating RT Campaign ID:", error);
              alert(`Error: ${error.message}`);
            } finally {
              setIsUpdatingRtkID(false);
            }
          }}
          isLoading={isUpdatingRtkID}
          type="domain"
          initialData={{
            domain: formData.domain,
            rtkID:
              availableDomains.find((d) => d.domain === formData.domain)
                ?.rtkID || "",
            isRtkIDOnly: true,
          }}
        />
      )}
    </>
  );
}

export default LanderCreationForm;

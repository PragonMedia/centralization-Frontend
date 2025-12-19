// Simplified domain filtering logic
export const filterDomains = (domains, filters) => {
  if (!Array.isArray(domains)) return [];

  return domains.filter((domain) => {
    const currentUser = filters.currentUser;
    const searchTerm = filters.searchTerm?.toLowerCase() || "";
    const selectedOrganization = filters.selectedOrganization;
    const selectedPlatform = filters.selectedPlatform;
    const selectedMediaBuyer = filters.selectedMediaBuyer;

    // User-based filtering logic
    if (!shouldUserSeeDomain(domain, currentUser)) {
      return false;
    }

    // Apply organization filter if selected
    if (selectedOrganization && domain.organization !== selectedOrganization) {
      return false;
    }

    // Apply platform filter if selected
    if (selectedPlatform && domain.platform !== selectedPlatform) {
      return false;
    }

    // Apply media buyer filter if selected (only for Tech/CEO users)
    if (selectedMediaBuyer && domain.assignedTo !== selectedMediaBuyer) {
      return false;
    }

    // Apply search filter if search term exists
    if (searchTerm) {
      return matchesSearchTerm(domain, searchTerm);
    }

    return true;
  });
};

// Check if user should see this domain based on their role
const shouldUserSeeDomain = (domain, currentUser) => {
  if (!currentUser) return true; // Show all if no user context

  const userEmail = currentUser.email;
  const userRole = currentUser.role;

  // Specific user filtering
  if (
    userEmail === "jake@paragonmedia.io" &&
    domain.assignedTo !== "jake@paragonmedia.io"
  ) {
    return false;
  }

  if (
    userEmail === "addy@paragonmedia.io" &&
    domain.assignedTo !== "addy@paragonmedia.io"
  ) {
    return false;
  }

  if (
    userEmail === "neil@paragonmedia.io" &&
    domain.assignedTo !== "neil@paragonmedia.io"
  ) {
    return false;
  }

  // Tech, CEO, and Admin users can see all domains
  if (userRole === "tech" || userRole === "ceo" || userRole === "admin") {
    return true;
  }

  // Default: show all domains
  return true;
};

// Check if domain matches search term
const matchesSearchTerm = (domain, searchTerm) => {
  // Search by domain name
  if (domain.domain?.toLowerCase().includes(searchTerm)) {
    return true;
  }

  // Search by domain ID
  if (domain.id?.toLowerCase().includes(searchTerm)) {
    return true;
  }

  // Search by ringbaID in routes
  if (domain.routes && Array.isArray(domain.routes)) {
    return domain.routes.some((route) =>
      route.ringbaID?.toLowerCase().includes(searchTerm)
    );
  }

  return false;
};

// Get available filter options from domains
export const getFilterOptions = (domains) => {
  if (!Array.isArray(domains))
    return { organizations: [], platforms: [], mediaBuyers: [] };

  const organizations = [
    ...new Set(domains.map((d) => d.organization).filter(Boolean)),
  ];
  const platforms = [
    ...new Set(domains.map((d) => d.platform).filter(Boolean)),
  ];
  const mediaBuyers = [
    ...new Set(domains.map((d) => d.assignedTo).filter(Boolean)),
  ];

  return { organizations, platforms, mediaBuyers };
};

























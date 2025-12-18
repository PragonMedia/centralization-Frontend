// API Configuration
export const API_CONFIG = {
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "http://138.68.231.226:3000/api/v1",
  RINGBA_ACCOUNT_ID:
    import.meta.env.VITE_RINGBA_ACCOUNT_ID ||
    "RA417e311c6e8b47538624556e6e84298a",
  RINGBA_API_TOKEN:
    import.meta.env.VITE_RINGBA_API_TOKEN ||
    "09f0c9f046f7704cb233f54b8e21375fa6c9511ba0b5dfde1608645e5da598ddab5ece0a55085ce6a17445ebd4e0cbfca5d6fb5bd7e50a56e7a1620395cdd4134c0c6b1b01e2f1485ae6e651317472f4753d0b578090d033b5d56b5d3ed0a016df03e7c7c198089e727db34100588f336c3c14b0",
  TEMPLATE_PREVIEW_BASE_URL:
    import.meta.env.VITE_TEMPLATE_PREVIEW_BASE_URL ||
    "https://approvedlanders.com",
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_CONFIG.BASE_URL}/auth/login`,
  },
  DOMAINS: {
    LIST: API_CONFIG.BASE_URL,
    CREATE: `${API_CONFIG.BASE_URL}/domain`,
    UPDATE: `${API_CONFIG.BASE_URL}/updateDomain`,
    DELETE: (domain) => `${API_CONFIG.BASE_URL}/domain/${domain}`,
  },
  ROUTES: {
    GET_DATA: `${API_CONFIG.BASE_URL}/data`,
    UPDATE_DATA: `${API_CONFIG.BASE_URL}/updateData`,
    DELETE_DATA: `${API_CONFIG.BASE_URL}/deleteData`,
    CREATE: `${API_CONFIG.BASE_URL}/route`,
  },
  RINGBA: {
    CAMPAIGNS: `https://api.ringba.com/v2/${API_CONFIG.RINGBA_ACCOUNT_ID}/campaigns/ui?includestats=true&includeDI=true&includeRTB=true`,
    CAMPAIGN_DETAILS: (id) =>
      `https://api.ringba.com/v2/${API_CONFIG.RINGBA_ACCOUNT_ID}/campaigns/${id}`,
  },
};

// HTTP Headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const getRingbaHeaders = () => ({
  Authorization: `Token ${API_CONFIG.RINGBA_API_TOKEN}`,
  "Content-Type": "application/json",
});

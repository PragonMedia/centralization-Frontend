import { useState, useEffect } from "react";
import { API_CONFIG, getRingbaHeaders } from "../config/api.js";
import { cachedFetch, CACHE_CONFIG } from "../utils/cache.js";

function TestRun() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [campaignDetails, setCampaignDetails] = useState(null); // eslint-disable-line no-unused-vars
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [mediaBuyers, setMediaBuyers] = useState([]);

  // Use configuration from API config

  const fetchCampaignDetails = async (campaignId) => {
    if (!campaignId) return;

    try {
      setLoadingDetails(true);
      setCampaignDetails(null);

      const response = await cachedFetch(
        `https://api.ringba.com/v2/${API_CONFIG.RINGBA_ACCOUNT_ID}/campaigns/${campaignId}`,
        {
          method: "GET",
          headers: getRingbaHeaders(),
        },
        CACHE_CONFIG.CAMPAIGN_DETAILS
      );

      console.log("Campaign Details API Response Status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Campaign Details API Response:", data);

      setCampaignDetails(data);

      // Extract media buyers from jsTags
      if (data.jsTags && typeof data.jsTags === "object") {
        console.log("jsTags found:", data.jsTags);

        // Convert jsTags object to array of media buyers
        const mediaBuyersArray = Object.values(data.jsTags).map((jsTag) => ({
          name: jsTag.name,
          campaignId: jsTag.campaignId,
          e164Number: jsTag.previousNumber?.e164Number || "N/A",
        }));

        console.log("Extracted media buyers:", mediaBuyersArray);
        setMediaBuyers(mediaBuyersArray);
      } else {
        console.log("No jsTags found in response");
        setMediaBuyers([]);
      }
    } catch (error) {
      console.error("Error fetching campaign details:", error);
      setCampaignDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cachedFetch(
        `https://api.ringba.com/v2/${API_CONFIG.RINGBA_ACCOUNT_ID}/campaigns/ui?includestats=true&includeDI=true&includeRTB=true`,
        {
          method: "GET",
          headers: getRingbaHeaders(),
        },
        CACHE_CONFIG.CAMPAIGNS
      );

      console.log("API Response Status:", response.status);
      console.log("API Response Headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Full API Response:", data);

      // Extract campaigns array if it exists
      const campaignsData = data.campaigns || data || [];
      console.log("Campaigns Data:", campaignsData);

      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignDetails(selectedCampaign);
    }
  }, [selectedCampaign]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ringba API Test</h1>

      <div className="mb-4">
        <button
          onClick={fetchCampaigns}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Campaigns"}
        </button>
      </div>

      {/* Campaign Selection Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Campaign:
        </label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading || campaigns.length === 0}
        >
          <option value="">
            {loading ? "Loading campaigns..." : "Select a campaign"}
          </option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Campaign Details</h2>

        {loadingDetails && <p>Loading campaign details...</p>}

        {mediaBuyers.length > 0 ? (
          <div className="bg-white p-3 rounded border">
            <h3 className="font-medium mb-2">
              Media Buyers for Selected Campaign:
            </h3>
            <div className="space-y-2">
              {mediaBuyers.map((buyer, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50"
                >
                  <p>
                    <strong>Name:</strong> {buyer.name || "N/A"}
                  </p>
                  <p>
                    <strong>Ringba ID:</strong> {buyer.campaignId || "N/A"}
                  </p>
                  <p>
                    <strong>Phone Number:</strong> {buyer.e164Number || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : selectedCampaign && !loadingDetails ? (
          <p>No media buyers found for this campaign.</p>
        ) : !selectedCampaign ? (
          <p>Please select a campaign to view media buyers.</p>
        ) : null}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>API Endpoint:</strong> https://api.ringba.com/v2/
          {API_CONFIG.RINGBA_ACCOUNT_ID}/campaigns/ui
        </p>
        <p>
          <strong>Account ID:</strong> {API_CONFIG.RINGBA_ACCOUNT_ID}
        </p>
        <p>
          <strong>Check browser console for detailed logs</strong>
        </p>
      </div>
    </div>
  );
}

export default TestRun;

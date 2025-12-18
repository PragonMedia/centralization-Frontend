# RedTrack Domain Integration - Implementation Plan

## 🔍 **API Documentation**

**✅ RedTrack has public API documentation available at:**

- **Swagger UI:** https://api.redtrack.io/docs/index.html
- **Base URL:** `https://api.redtrack.io`
- **Authentication:** Bearer token (API key)

The API is fully documented and ready for integration. This document provides the implementation specification based on confirmed API endpoints.

---

## 📋 **Manual Process (From RedTrack Dashboard)**

### **Current Manual Steps:**

1. Log in to RedTrack account
2. Navigate to **Tools** > **Domains** > **New**
3. Enter domain URL: `trk.sample123.com`
4. Optionally specify root domain for redirects
5. Enable **Free SSL** toggle
6. Click **Save**

### **DNS Requirements:**

- Create CNAME record: `trk` → `your-dedicated-domain.redtrack.io`
- Set proxy status to "DNS only" (if using Cloudflare)
- TTL: Set to lowest possible value

---

## 🎯 **Integration Goal**

When a user adds a domain (e.g., `sample123.com`) in our app:

1. Automatically create `trk.sample123.com` subdomain in RedTrack
2. Set up CNAME record in Cloudflare pointing to RedTrack's dedicated domain
3. Enable Free SSL in RedTrack (if available via API)

---

## 🔧 **Confirmed API Endpoints**

Based on RedTrack's Swagger documentation (https://api.redtrack.io/docs/index.html):

### **Domain Management Endpoints**

```javascript
// List all domains
GET / domains;

// Create new domain
POST / domains;

// Get domain details
GET / domains / { id };

// Update domain
PUT / domains / { id };

// Delete domain
DELETE / domains / { id };

// Regenerate Free SSL certificate
POST / domains / regenerated_free_ssl / { id };
```

### **Authentication**

All requests require:

```
Authorization: Bearer {api_key}
Content-Type: application/json
```

### **Base URL**

```
https://api.redtrack.io
```

---

## 📐 **Implementation Structure**

### **Backend Service: RedTrack Service**

**File: `src/services/redtrackService.js`**

```javascript
// Service methods:

1. buildTrackingDomain(rootDomain) → Build tracking subdomain
   - Input: "sample123.com"
   - Output: "trk.sample123.com"

2. addRedTrackDomain(rootDomain) → Add domain to RedTrack
   - Input: "sample123.com"
   - Creates: "trk.sample123.com" in RedTrack
   - Enables Free SSL
   - Returns: { domainId, trackingDomain }

3. checkDomainStatus(domainId) → Check if domain is verified/active
   - Input: domain ID or tracking domain
   - Returns: { status, sslEnabled, verified }

4. getRedTrackDedicatedDomain() → Get the CNAME target
   - Returns: "your-dedicated-domain.redtrack.io" (from config)
```

### **Integration with Cloudflare Flow**

**Workflow (Order is Critical):**

```
1. User adds domain: sample123.com
   ↓
2. Cloudflare: Get/Create zone
   ↓
3. Cloudflare: Disable proxy (for root + wildcard A records)
   ↓
4. Cloudflare: Set A record to server IP (root + wildcard)
   ↓
5. Cloudflare: Create CNAME for trk.sample123.com
   → Type: CNAME
   → Name: trk
   → Content: {REDTRACK_DEDICATED_DOMAIN}
   → Proxy: false (DNS only - CRITICAL)
   → TTL: 1 (auto/lowest)
   → Method: cloudflareService.createRedTrackCNAME(zoneId, domain)
   ↓
6. RedTrack: Add domain trk.sample123.com via API
   → POST /domains with { url: "trk.sample123.com", rootDomain: "sample123.com" }
   → Get domainId from response
   → POST /domains/regenerated_free_ssl/{domainId} to enable SSL
   → Method: redtrackService.addRedTrackDomain(domain)
   ↓
7. Cloudflare: Request SSL for main domain (origin server)
   ↓
8. Background: Monitor SSL activation (origin server)
   ↓
9. Cloudflare: Enable proxy for main domain (root + wildcard)
   ↓
10. RedTrack: Verify domain status (optional polling)
    → GET /domains/{domainId}
    → Method: redtrackService.checkDomainStatus(domainId)
```

**⚠️ Important Ordering:**

- **CNAME must be created in Cloudflare BEFORE calling RedTrack API**
- RedTrack verifies DNS configuration, so DNS must be correct first
- Then RedTrack can verify and activate the domain

---

## 🔑 **Configuration Needed**

### **Environment Variables**

```env
# RedTrack Configuration
REDTRACK_API_KEY=your_api_key_here
REDTRACK_API_URL=https://api.redtrack.io
REDTRACK_DEDICATED_DOMAIN=your-dedicated-domain.redtrack.io
```

**Note:** Get your API key from RedTrack dashboard (Settings → API or Developer section)

### **API Configuration (Backend)**

**File: `src/config/redtrack.js`**

```javascript
export const REDTRACK_CONFIG = {
  API_KEY: process.env.REDTRACK_API_KEY || "",
  API_URL: process.env.REDTRACK_API_URL || "https://api.redtrack.io",
  DEDICATED_DOMAIN: process.env.REDTRACK_DEDICATED_DOMAIN || "",
};
```

---

## 💻 **Detailed Service Implementation**

### **1. Build Tracking Domain**

```javascript
function buildTrackingDomain(rootDomain) {
  return `trk.${rootDomain}`; // e.g., trk.sample123.com
}
```

### **2. Add Domain to RedTrack**

```javascript
import axios from "axios";
import { REDTRACK_CONFIG } from "../config/redtrack.js";

const client = axios.create({
  baseURL: REDTRACK_CONFIG.API_URL,
  headers: {
    Authorization: `Bearer ${REDTRACK_CONFIG.API_KEY}`,
    "Content-Type": "application/json",
  },
});

export async function addRedTrackDomain(rootDomain) {
  const trackingDomain = buildTrackingDomain(rootDomain); // trk.sample123.com

  try {
    // 1. Create domain in RedTrack
    // Note: Exact field names may vary - check Swagger docs for current schema
    const createRes = await client.post("/domains", {
      url: trackingDomain,
      rootDomain: rootDomain, // Optional, for redirects
      // Additional fields may be required - verify in Swagger
    });

    const domainId = createRes.data.id || createRes.data.domain?.id;

    if (!domainId) {
      throw new Error("Failed to get domain ID from RedTrack response");
    }

    // 2. Enable Free SSL (via regenerated_free_ssl endpoint)
    try {
      await client.post(`/domains/regenerated_free_ssl/${domainId}`);
      console.log(`✅ Free SSL enabled for ${trackingDomain}`);
    } catch (sslError) {
      console.warn(`⚠️  SSL regeneration may have failed: ${sslError.message}`);
      // SSL might auto-enable, so this is not necessarily fatal
    }

    return {
      domainId,
      trackingDomain,
      status: "pending", // RedTrack will verify DNS
    };
  } catch (error) {
    console.error("Error adding RedTrack domain:", error);
    throw new Error(`Failed to add domain to RedTrack: ${error.message}`);
  }
}
```

### **3. Check Domain Status**

```javascript
export async function checkDomainStatus(domainId) {
  try {
    const response = await client.get(`/domains/${domainId}`);
    const domain = response.data;

    return {
      id: domain.id,
      url: domain.url,
      status: domain.status || "pending", // 'active', 'pending', 'failed'
      sslEnabled: domain.sslEnabled || false,
      verified: domain.verified || false,
    };
  } catch (error) {
    console.error("Error checking domain status:", error);
    throw new Error(`Failed to check domain status: ${error.message}`);
  }
}
```

### **4. Get RedTrack Dedicated Domain**

```javascript
export function getRedTrackDedicatedDomain() {
  return REDTRACK_CONFIG.DEDICATED_DOMAIN;
}
```

**Note:** The dedicated domain value should be provided by RedTrack (e.g., `your-account.redtrack.io` or similar). Check your RedTrack account settings or contact support to get the exact value.

---

### **5. Create CNAME Record in Cloudflare**

**Add this method to your Cloudflare service (`src/services/cloudflareService.js`):**

```javascript
async createRedTrackCNAME(zoneId, rootDomain) {
  try {
    const trackingSubdomain = `trk.${rootDomain}`;
    const redtrackDedicatedDomain = getRedTrackDedicatedDomain();

    // Get existing CNAME records for trk subdomain
    const response = await axios.get(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        },
        params: {
          type: 'CNAME',
          name: 'trk',
        },
      }
    );

    const existingRecords = response.data.result || [];
    const existingCNAME = existingRecords.find(record => record.name === 'trk');

    const payload = {
      type: 'CNAME',
      name: 'trk', // Creates trk.sample123.com
      content: redtrackDedicatedDomain, // e.g., your-account.redtrack.io
      ttl: 1, // Auto (lowest TTL)
      proxied: false, // CRITICAL: DNS only (not proxied)
    };

    if (existingCNAME) {
      // Update existing CNAME record
      await axios.put(
        `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records/${existingCNAME.id}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Updated CNAME: trk.${rootDomain} → ${redtrackDedicatedDomain}`);
    } else {
      // Create new CNAME record
      await axios.post(
        `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Created CNAME: trk.${rootDomain} → ${redtrackDedicatedDomain}`);
    }

    return true;

  } catch (error) {
    console.error('Error creating RedTrack CNAME:', error);
    throw new Error(`Failed to create CNAME record: ${error.message}`);
  }
}
```

**⚠️ Critical Settings:**

- `proxied: false` - MUST be DNS only for RedTrack verification
- `ttl: 1` - Auto (lowest TTL for faster propagation)
- `name: 'trk'` - Creates the `trk.{rootDomain}` subdomain

---

## 🧪 **Testing Strategy**

### **1. API Discovery**

- Use browser DevTools to capture API calls
- Test with Postman/Insomnia if API is found
- Document endpoints, headers, and payloads

### **2. Integration Testing**

- Test adding domain through API
- Verify CNAME record is created correctly
- Check domain status in RedTrack dashboard

### **3. Error Handling**

- Test with invalid domains
- Test with duplicate domains
- Test API rate limits
- Test authentication failures

---

## ⚠️ **Important Notes**

### **CNAME Record Requirements (CRITICAL)**

When creating the CNAME record in Cloudflare, use these exact settings:

```javascript
{
  type: 'CNAME',
  name: 'trk',                    // Creates trk.sample123.com
  content: REDTRACK_DEDICATED_DOMAIN, // e.g., your-account.redtrack.io
  proxied: false,                 // MUST be DNS only (not proxied)
  ttl: 1                          // Auto (lowest TTL)
}
```

**Why DNS only (proxied: false)?**

- RedTrack needs direct DNS access to verify the CNAME record
- Proxy (Orange Cloud) can interfere with DNS verification
- RedTrack's official docs require DNS-only mode

### **SSL Certificate**

- RedTrack provides "Free SSL" for paid clients
- SSL is issued via Let's Encrypt
- Use endpoint: `POST /domains/regenerated_free_ssl/{id}` to enable/regenerate
- May take a few minutes to activate after DNS verification

### **Domain Verification**

- RedTrack automatically verifies DNS configuration after domain creation
- CNAME must be correct and DNS must be propagated
- Verification status can be checked via `GET /domains/{id}`
- Verification may take a few minutes after CNAME is created

### **Integration Order (Critical)**

1. **First:** Create CNAME in Cloudflare (DNS must be correct)
2. **Then:** Call RedTrack API to add domain (RedTrack verifies DNS)
3. **Finally:** Enable Free SSL via regenerated_free_ssl endpoint

---

## ✅ **Implementation Checklist**

### **Backend Setup**

- [ ] Get RedTrack API key from dashboard
- [ ] Add environment variables (API_KEY, DEDICATED_DOMAIN)
- [ ] Create `src/config/redtrack.js` configuration file
- [ ] Create `src/services/redtrackService.js` service layer
- [ ] Implement `buildTrackingDomain()` helper
- [ ] Implement `addRedTrackDomain()` method
- [ ] Implement `checkDomainStatus()` method
- [ ] Implement `getRedTrackDedicatedDomain()` method
- [ ] Add CNAME creation to Cloudflare service
- [ ] Integrate RedTrack calls into domain creation flow
- [ ] Add error handling and logging

### **Cloudflare Integration**

- [ ] Add CNAME creation method to Cloudflare service
- [ ] Ensure CNAME is created BEFORE RedTrack API call
- [ ] Verify CNAME settings: `proxied: false`, `ttl: 1`

### **Testing**

- [ ] Test RedTrack API authentication
- [ ] Test domain creation via API
- [ ] Test Free SSL regeneration endpoint
- [ ] Test CNAME record creation in Cloudflare
- [ ] Test full integration flow (domain → Cloudflare → RedTrack)
- [ ] Verify domain appears in RedTrack dashboard
- [ ] Test error scenarios (invalid domain, duplicate, etc.)

---

## 📚 **Resources**

- **RedTrack API Documentation:** https://api.redtrack.io/docs/index.html
- **RedTrack Help:** https://help.redtrack.io
- **Domain Setup Guide:** https://help.redtrack.io/knowledgebase/kb/conversion-tracking/adding-custom-domain/
- **RedTrack Dashboard:** https://app.redtrack.io (or your instance URL)

---

## 🎯 **Summary**

**Confirmed Information:**

- ✅ **API Documentation:** Available at https://api.redtrack.io/docs/index.html
- ✅ **Base URL:** `https://api.redtrack.io`
- ✅ **Endpoints:** `/domains`, `/domains/{id}`, `/domains/regenerated_free_ssl/{id}`
- ✅ **Authentication:** Bearer token (API key)
- ✅ **Domain format:** `trk.{rootDomain}` (e.g., `trk.sample123.com`)
- ✅ **CNAME record:** `trk` → `{dedicated-domain}.redtrack.io`
- ✅ **Proxy status:** Must be DNS only (`proxied: false`)
- ✅ **Free SSL:** Available via `/domains/regenerated_free_ssl/{id}` endpoint

**Implementation Status:**

- ✅ API endpoints confirmed
- ✅ Service structure defined
- ✅ Integration flow documented
- ⏳ Ready for implementation

**Next Steps:**

1. Get API key from RedTrack dashboard
2. Get dedicated domain value from RedTrack account
3. Implement service layer using confirmed endpoints
4. Integrate with Cloudflare domain creation flow

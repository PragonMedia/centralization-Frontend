# Backend Implementation Prompt for Cursor

## 📋 **Context**

I need you to implement Cloudflare and RedTrack integrations for domain management in my Node.js backend. I have two detailed implementation plan documents:

1. `CLOUDFLARE_IMPLEMENTATION_PLAN.md` - Complete Cloudflare integration plan
2. `REDTRACK_INTEGRATION_RESEARCH.md` - Complete RedTrack integration plan

Please read both documents thoroughly before starting implementation.

---

## 🎯 **Implementation Goal**

When a user adds a domain through the frontend, the backend should automatically:

1. **Cloudflare Operations:**
   - Get or create Cloudflare zone
   - Disable proxy for root + wildcard A records
   - Create A records (root + wildcard) pointing to server IP
   - Create CNAME record for RedTrack (`trk.{domain}`)
   - Request SSL certificate on origin server
   - Set Cloudflare SSL mode
   - Enable proxy after SSL is active

2. **RedTrack Operations:**
   - Add tracking domain (`trk.{domain}`) to RedTrack
   - Enable Free SSL in RedTrack

---

## 📝 **Step-by-Step Implementation**

### **STEP 1: Review Existing Code Structure**

First, examine the current backend structure:
- Find the domain controller (likely `src/controllers/domainController.js` or similar)
- Find existing service files
- Find configuration files
- Understand the current domain creation flow
- Check what database/ORM is being used

**Action:** Read the existing domain controller and understand how domains are currently created.

---

### **STEP 2: Install Dependencies**

Install required npm packages:

```bash
npm install axios
```

(Or if using a Cloudflare SDK, install that instead)

---

### **STEP 3: Create Configuration Files**

#### **3.1: Cloudflare Configuration**

Create `src/config/cloudflare.js`:

```javascript
export const CLOUDFLARE_CONFIG = {
  API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || "",
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  BASE_URL: "https://api.cloudflare.com/client/v4",
  SERVER_IP: process.env.SERVER_IP || "",
  INTERNAL_SERVER_URL:
    process.env.INTERNAL_SERVER_URL || "http://localhost:3000",
  INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN || "",
  SSL_MODE: process.env.CLOUDFLARE_SSL_MODE || "full", // full, flexible, strict
  SSL_TIMEOUT: parseInt(process.env.CLOUDFLARE_SSL_TIMEOUT) || 600000, // 10 min
  POLL_INTERVAL: parseInt(process.env.CLOUDFLARE_POLL_INTERVAL) || 30000, // 30 sec
};
```

#### **3.2: RedTrack Configuration**

Create `src/config/redtrack.js`:

```javascript
export const REDTRACK_CONFIG = {
  API_KEY: process.env.REDTRACK_API_KEY || "",
  API_URL: process.env.REDTRACK_API_URL || "https://api.redtrack.io",
  DEDICATED_DOMAIN: process.env.REDTRACK_DEDICATED_DOMAIN || "",
};
```

**Action:** Create both config files exactly as shown above.

---

### **STEP 4: Create Cloudflare Service**

Create `src/services/cloudflareService.js` with all methods from `CLOUDFLARE_IMPLEMENTATION_PLAN.md`:

**Required Methods:**
1. `getZoneId(domain)` - Get or create Cloudflare zone
2. `disableProxy(zoneId, domain)` - Disable proxy for root + wildcard A records only
3. `setARecord(zoneId, domain, serverIP)` - Create/update A records (root + wildcard)
4. `createRedTrackCNAME(zoneId, rootDomain)` - Create CNAME for RedTrack
5. `setSSLMode(zoneId, sslMode)` - Set Cloudflare SSL mode
6. `enableProxy(zoneId, domain)` - Enable proxy for root + wildcard A records only
7. `checkSSLStatus(domain)` - Check SSL status on origin server
8. `waitForSSLActivation(domain, maxWaitTime)` - Poll SSL status until active

**Action:** Implement all methods following the exact code examples from `CLOUDFLARE_IMPLEMENTATION_PLAN.md` (Phase 2: Detailed Service Implementation section).

**Key Points:**
- Use axios for HTTP requests
- Only modify A records for root domain and wildcard (`*.domain.com`)
- Don't modify other DNS records (MX, TXT, etc.)
- Handle errors appropriately
- Add logging for debugging

---

### **STEP 5: Create RedTrack Service**

Create `src/services/redtrackService.js` with all methods from `REDTRACK_INTEGRATION_RESEARCH.md`:

**Required Methods:**
1. `buildTrackingDomain(rootDomain)` - Build `trk.{domain}` subdomain
2. `addRedTrackDomain(rootDomain)` - Add domain to RedTrack via API
3. `checkDomainStatus(domainId)` - Check domain verification status
4. `getRedTrackDedicatedDomain()` - Get CNAME target from config

**Action:** Implement all methods following the exact code examples from `REDTRACK_INTEGRATION_RESEARCH.md` (Detailed Service Implementation section).

**Key Points:**
- Use axios with base URL `https://api.redtrack.io`
- POST to `/domains` to create domain
- POST to `/domains/regenerated_free_ssl/{id}` to enable SSL
- Handle authentication with Bearer token
- Add proper error handling

---

### **STEP 6: Create SSL Monitoring Background Job**

Create `src/jobs/sslMonitoringJob.js`:

```javascript
import cloudflareService from '../services/cloudflareService.js';
// Import your Domain model here

async function monitorSSLAndEnableProxy(zoneId, domain) {
  try {
    // Wait for SSL to be active on origin server (polling)
    await cloudflareService.waitForSSLActivation(domain);
    
    // SSL is active on origin, enable proxy
    await cloudflareService.enableProxy(zoneId, domain);
    
    // Update database
    await Domain.updateOne(
      { domain },
      {
        sslStatus: 'active',
        proxyStatus: 'enabled',
        sslActivatedAt: new Date(),
      }
    );
    
    console.log(`✅ SSL activated and proxy enabled for ${domain}`);
    
  } catch (error) {
    console.error(`❌ SSL monitoring failed for ${domain}:`, error);
    // Update database with error status
    await Domain.updateOne(
      { domain },
      {
        sslStatus: 'failed',
        sslError: error.message,
      }
    );
  }
}

export { monitorSSLAndEnableProxy };
```

**Action:** Create the job file and adjust imports to match your project structure.

---

### **STEP 7: Create Origin Server SSL Endpoints (If Needed)**

If your backend is also the origin server that handles SSL certificates, create:

**File: `src/routes/ssl.js`** (or add to existing routes):

```javascript
import express from 'express';
const router = express.Router();

// POST /api/v1/ssl/request
router.post("/request", async (req, res) => {
  try {
    const { domain } = req.body;
    
    // Call your ACME/Certbot service to request certificate
    // Implement based on your SSL certificate management setup
    const result = await requestSSLCertificate(domain);
    
    res.json({
      success: true,
      domain,
      status: "pending",
      message: "SSL certificate request initiated",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/ssl/status?domain={domain}
router.get("/status", async (req, res) => {
  try {
    const { domain } = req.query;
    
    // Check if certificate exists and is valid
    const certStatus = await checkCertificateStatus(domain);
    
    res.json({
      active: certStatus.exists && !certStatus.expired,
      status: certStatus.exists
        ? certStatus.expired
          ? "expired"
          : "active"
        : "pending",
      expiresAt: certStatus.expiresAt,
      issuer: certStatus.issuer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Action:** 
- If your backend handles SSL certificates, implement these endpoints
- If SSL is handled by a separate service, ensure those endpoints exist and are accessible
- Adjust the helper functions (`requestSSLCertificate`, `checkCertificateStatus`) based on your actual SSL setup

---

### **STEP 8: Update Domain Controller**

Update your existing domain controller (likely `src/controllers/domainController.js`):

**Add the integration flow to your `createDomain` function:**

```javascript
import cloudflareService from '../services/cloudflareService.js';
import redtrackService from '../services/redtrackService.js';
import { CLOUDFLARE_CONFIG } from '../config/cloudflare.js';
import { monitorSSLAndEnableProxy } from '../jobs/sslMonitoringJob.js';

exports.createDomain = async (req, res) => {
  try {
    const { domain } = req.body;
    
    // 1. Validate domain format
    // 2. Check if domain exists in database
    
    // 3. Get or create Cloudflare zone
    const zoneId = await cloudflareService.getZoneId(domain);
    
    // 4. Disable proxy status (for root + wildcard A records only)
    await cloudflareService.disableProxy(zoneId, domain);
    
    // 5. Set A record pointing to server (root + wildcard)
    await cloudflareService.setARecord(
      zoneId,
      domain,
      CLOUDFLARE_CONFIG.SERVER_IP
    );
    
    // 6. Create CNAME for RedTrack (MUST be before RedTrack API call)
    await cloudflareService.createRedTrackCNAME(zoneId, domain);
    
    // 7. Add domain to RedTrack
    const redtrackResult = await redtrackService.addRedTrackDomain(domain);
    
    // 8. Request SSL certificate on origin server
    await requestOriginSSLCertificate(domain);
    
    // Helper function to call origin server SSL endpoint
    async function requestOriginSSLCertificate(domain) {
      const axios = require('axios');
      const response = await axios.post(
        `${CLOUDFLARE_CONFIG.INTERNAL_SERVER_URL}/api/v1/ssl/request`,
        { domain },
        {
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_CONFIG.INTERNAL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    }
    
    // 9. Set Cloudflare SSL mode to "full" or "strict"
    await cloudflareService.setSSLMode(zoneId, CLOUDFLARE_CONFIG.SSL_MODE);
    
    // 10. Save domain to database
    const domainData = {
      ...req.body,
      cloudflareZoneId: zoneId,
      redtrackDomainId: redtrackResult.domainId,
      redtrackTrackingDomain: redtrackResult.trackingDomain,
      sslStatus: "pending",
      proxyStatus: "disabled",
      aRecordIP: CLOUDFLARE_CONFIG.SERVER_IP,
      createdAt: new Date(),
    };
    
    const savedDomain = await Domain.create(domainData);
    
    // 11. Start background job to monitor SSL on origin server
    monitorSSLAndEnableProxy(zoneId, domain);
    
    // 12. Return success
    res.status(201).json({
      success: true,
      message: "Domain added. SSL certificate provisioning in progress.",
      domain: savedDomain,
    });
    
  } catch (error) {
    console.error("Error creating domain:", error);
    res.status(500).json({ error: error.message });
  }
};
```

**Action:** 
- Integrate this flow into your existing `createDomain` function
- Adjust imports to match your project structure
- Ensure database model matches the fields being saved
- Handle errors appropriately

---

### **STEP 9: Update Database Schema**

Add new fields to your Domain model/schema:

```javascript
{
  // ... existing fields ...
  
  // Cloudflare fields
  cloudflareZoneId: {
    type: String,
    required: false,
  },
  
  aRecordIP: {
    type: String,
    required: false,
  },
  
  sslStatus: {
    type: String,
    enum: ['pending', 'active', 'failed'],
    default: 'pending',
  },
  
  proxyStatus: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'disabled',
  },
  
  sslActivatedAt: {
    type: Date,
    required: false,
  },
  
  sslError: {
    type: String,
    required: false,
  },
  
  // RedTrack fields
  redtrackDomainId: {
    type: String,
    required: false,
  },
  
  redtrackTrackingDomain: {
    type: String,
    required: false,
  },
  
  cloudflareMetadata: {
    type: Object,
    default: {},
  },
}
```

**Action:** 
- Update your Domain model/schema with these fields
- Create a migration if using migrations
- Adjust field types to match your ORM (Mongoose, Sequelize, etc.)

---

### **STEP 10: Add Environment Variables**

Add to your `.env` file:

```env
# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Server Configuration
SERVER_IP=your.server.ip.address
INTERNAL_SERVER_URL=http://localhost:3000
INTERNAL_API_TOKEN=your_internal_api_token

# Optional: Custom configuration
CLOUDFLARE_SSL_MODE=full
CLOUDFLARE_SSL_TIMEOUT=600000
CLOUDFLARE_POLL_INTERVAL=30000

# RedTrack Configuration
REDTRACK_API_KEY=your_api_key_here
REDTRACK_API_URL=https://api.redtrack.io
REDTRACK_DEDICATED_DOMAIN=your-dedicated-domain.redtrack.io
```

**Action:** 
- Add all environment variables to `.env`
- Update `.env.example` if you have one
- Document these in your README

---

### **STEP 11: Error Handling & Logging**

Ensure proper error handling throughout:

- Wrap all service calls in try-catch blocks
- Log errors with context (domain, zoneId, etc.)
- Return meaningful error messages to frontend
- Handle API rate limits with retries
- Handle network timeouts
- Validate inputs before API calls

**Action:** Review all service methods and add comprehensive error handling.

---

### **STEP 12: Testing Checklist**

Before considering implementation complete:

- [ ] Test Cloudflare zone creation
- [ ] Test A record creation (root + wildcard)
- [ ] Test CNAME record creation for RedTrack
- [ ] Test proxy disable/enable
- [ ] Test RedTrack domain creation
- [ ] Test RedTrack SSL regeneration
- [ ] Test SSL certificate request on origin
- [ ] Test SSL status checking
- [ ] Test background job for SSL monitoring
- [ ] Test full integration flow end-to-end
- [ ] Test error scenarios (invalid domain, API failures, etc.)
- [ ] Verify database fields are saved correctly
- [ ] Check logs for any issues

---

## ⚠️ **Important Notes**

1. **Order Matters:** CNAME must be created in Cloudflare BEFORE calling RedTrack API
2. **DNS Only:** RedTrack CNAME must have `proxied: false` (DNS only)
3. **Wildcard Records:** Always create both root and wildcard A records
4. **Selective Proxy:** Only modify A records for root + wildcard, not other DNS records
5. **SSL Monitoring:** Background job should handle SSL activation asynchronously
6. **Error Recovery:** Consider retry logic for transient failures

---

## 📚 **Reference Documents**

- `CLOUDFLARE_IMPLEMENTATION_PLAN.md` - Complete Cloudflare implementation details
- `REDTRACK_INTEGRATION_RESEARCH.md` - Complete RedTrack implementation details

---

## ✅ **Completion Criteria**

Implementation is complete when:
- All service files are created and functional
- Domain controller integrates both Cloudflare and RedTrack
- Database schema includes all new fields
- Environment variables are documented
- Error handling is comprehensive
- Code follows existing project patterns and conventions

---

**Start with STEP 1 and work through each step sequentially. Ask questions if anything is unclear or if you encounter issues with the existing codebase structure.**












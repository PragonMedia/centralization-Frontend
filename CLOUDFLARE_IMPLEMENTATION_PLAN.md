# Cloudflare Integration - Implementation Plan

## 🎯 **Goal**

Automate Cloudflare DNS and SSL management for manually purchased domains.

---

## 📋 **Workflow**

```
1. Manual Domain Purchase (done outside the app)
   ↓
2. User adds domain in app (AddDomainModal)
   ↓
3. Backend automatically:
   → Disable Proxy Status (DNS-only mode) for domain and *.domain.com
   → Set A Record (*) pointing to server IP (root + wildcard)
   → Request SSL Certificate (Origin SSL via Let's Encrypt on server)
   → Enable Proxy Status (Orange Cloud) after SSL is active
```

---

## 🔐 **SSL Approach Decision**

**We are using: Origin SSL (Let's Encrypt on your server)**

This approach:

- Issues SSL certificates on your origin server using Let's Encrypt/ACME
- Requires proxy to be disabled during certificate issuance (ACME validation)
- Uses Cloudflare SSL mode: **Full (strict)** for end-to-end encryption
- Provides better security than Universal SSL alone

**Alternative (not used):** Cloudflare Universal SSL

- Automatically provisions edge certificates
- Doesn't require disabling proxy
- Less secure (no origin certificate)

---

## ✅ **What We Need to Implement**

### **1. Disable Proxy Status**

- Set `proxied: false` for **only** the A records we control:
  - Root domain: `example.com`
  - Wildcard: `*.example.com`
- **Do NOT** modify other DNS records (MX, TXT, etc.)
- This is required for ACME/Let's Encrypt validation to reach your origin server

### **2. Set A Record (Root + Wildcard)**

- Create or update A record for root domain: `example.com` → server IP
- Create or update A record for wildcard: `*.example.com` → server IP
- Both records must point to your server IP
- Both must have `proxied: false` initially

### **3. Request SSL Certificate**

- Your server's ACME/Certbot service requests certificate from Let's Encrypt
- ACME validation requires direct access to origin (proxy must be disabled)
- Monitor certificate issuance on your server

### **4. Enable Proxy Status**

- Once SSL certificate is active on origin server, set `proxied: true` (Orange Cloud)
- Only enable proxy for the A records we control (root + wildcard)
- Cloudflare will use Full (strict) mode for end-to-end encryption

---

## 🔧 **Required Cloudflare API Endpoints**

### **1. Zone Management**

```
GET  /zones?name={domain}          # Get zone ID for domain
POST /zones                        # Create zone (if domain not in Cloudflare yet)
```

### **2. DNS Records Management**

```
GET    /zones/{zone_id}/dns_records              # List all DNS records
POST   /zones/{zone_id}/dns_records              # Create new DNS record
PATCH  /zones/{zone_id}/dns_records/{record_id}  # Update DNS record (proxy status)
PUT    /zones/{zone_id}/dns_records/{record_id}  # Update DNS record (full update)
```

### **3. SSL Certificate Management**

```
PATCH /zones/{zone_id}/settings/ssl              # Set SSL mode (full, flexible, strict)
GET   /zones/{zone_id}/ssl/universal/settings    # Get Universal SSL settings (optional)
PATCH /zones/{zone_id}/ssl/universal/settings    # Enable/disable Universal SSL (optional)
GET   /zones/{zone_id}/ssl/verification          # Check SSL verification status
```

**Note:** Since we're using Origin SSL (Let's Encrypt), we primarily need to:

- Set SSL mode to `full` or `strict` after certificate is issued
- Monitor certificate status on our origin server, not Cloudflare's verification endpoint

---

## 📐 **Architecture**

### **Backend Flow**

```
┌─────────────────────────────────────┐
│  User adds domain in AddDomainModal │
└──────────────┬──────────────────────┘
               │
               │ POST /api/v1/domain
               ▼
┌─────────────────────────────────────┐
│  Backend: Domain Controller         │
└──────────────┬──────────────────────┘
               │
               ├─► 1. Get/Create Cloudflare Zone
               │     → GET /zones?name={domain}
               │     → If not found: POST /zones
               │
               ├─► 2. Disable Proxy Status
               │     → GET /zones/{zone_id}/dns_records
               │     → PATCH each A/AAAA record: proxied: false
               │
               ├─► 3. Set/Create A Record
               │     → Check if A record exists
               │     → POST or PUT A record pointing to server IP
               │
               ├─► 4. Request SSL Certificate (on origin server)
               │     → Call internal ACME/Certbot endpoint
               │     → Server requests Let's Encrypt certificate
               │     → Certificate issued on origin server
               │
               ├─► 5. Set Cloudflare SSL Mode
               │     → PATCH /zones/{zone_id}/settings/ssl
               │     → Set SSL mode to "full" or "strict"
               │
               ├─► 6. Save domain to database
               │     → Store zoneId, SSL status, proxy status
               │
               └─► 7. Start Background Job
                     → Monitor SSL certificate on origin server
                     → Enable proxy when SSL is ready
```

### **Background Job Flow**

```
┌─────────────────────────────────────┐
│  SSL Monitoring Background Job      │
└──────────────┬──────────────────────┘
               │
               ├─► Poll SSL Certificate Status every 30 seconds
               │     → Call internal endpoint: GET /api/v1/ssl/status?domain={domain}
               │     → Check if Let's Encrypt certificate is active on origin
               │
               ├─► Check if SSL certificate is valid
               │     → Certificate exists and is not expired
               │     → Certificate is properly installed on server
               │
               ├─► Once SSL is active:
               │     → Enable Proxy Status (only for root + wildcard A records)
               │     → PATCH DNS records: proxied: true
               │     → Update database: proxyStatus = 'enabled', sslStatus = 'active'
               │
               └─► Timeout after 10 minutes (or configurable)
```

**Note:** SSL monitoring checks your origin server's certificate status, not Cloudflare's verification endpoint.

---

## 🔑 **Configuration Needed**

### **Environment Variables**

```env
# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Server Configuration
SERVER_IP=your.server.ip.address  # IP address for A record
INTERNAL_SERVER_URL=http://localhost:3000  # Your origin server URL
INTERNAL_API_TOKEN=your_internal_api_token  # Token for internal API calls

# Optional: Custom configuration
CLOUDFLARE_SSL_MODE=full          # Options: full, flexible, strict
CLOUDFLARE_SSL_TIMEOUT=600000     # 10 minutes in milliseconds
CLOUDFLARE_POLL_INTERVAL=30000    # 30 seconds in milliseconds
```

### **API Configuration (Backend)**

**File: `src/config/cloudflare.js`**

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

---

## 📝 **Implementation Steps**

### **PHASE 1: Backend Setup**

#### **Step 1.1: Install Dependencies**

```bash
npm install axios
# or use Cloudflare SDK
npm install cloudflare
```

#### **Step 1.2: Create Cloudflare Service**

**File: `src/services/cloudflareService.js`**

This service will handle all Cloudflare API interactions:

```javascript
// Service methods needed:

1. getZoneId(domain) → Get or create Cloudflare zone
2. disableProxy(zoneId, domain) → Set proxied: false for root + wildcard A records only
3. setARecord(zoneId, domain, serverIP) → Create/update A record (root + wildcard)
4. setSSLMode(zoneId, mode) → Set Cloudflare SSL mode (full/strict)
5. enableProxy(zoneId, domain) → Set proxied: true for root + wildcard A records only
6. waitForSSLActivation(domain) → Poll origin server SSL status until active
```

**Note:** SSL certificate is requested on your origin server via ACME/Certbot, not through Cloudflare API.

#### **Step 1.3: Update Domain Controller**

**File: `src/controllers/domainController.js`**

Modify `createDomain` function:

```javascript
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

    // 6. Request SSL certificate on origin server
    await requestOriginSSLCertificate(domain); // Internal endpoint to your server's ACME service

    // Helper function to call origin server SSL endpoint
    async function requestOriginSSLCertificate(domain) {
      const response = await axios.post(
        `${INTERNAL_SERVER_URL}/api/v1/ssl/request`,
        { domain },
        {
          headers: {
            Authorization: `Bearer ${INTERNAL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    }

    // 7. Set Cloudflare SSL mode to "full" or "strict"
    await cloudflareService.setSSLMode(zoneId, CLOUDFLARE_CONFIG.SSL_MODE);

    // 8. Save domain to database
    const domainData = {
      ...req.body,
      cloudflareZoneId: zoneId,
      sslStatus: "pending",
      proxyStatus: "disabled",
      aRecordIP: CLOUDFLARE_CONFIG.SERVER_IP,
      createdAt: new Date(),
    };

    const savedDomain = await Domain.create(domainData);

    // 9. Start background job to monitor SSL on origin server
    startSSLMonitoringJob(zoneId, domain);

    // 9. Return success
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

#### **Step 1.4: Background Job for SSL Monitoring**

**File: `src/jobs/sslMonitoringJob.js`**

```javascript
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
        sslStatus: "active",
        proxyStatus: "enabled",
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
        sslStatus: "failed",
        sslError: error.message,
      }
    );
  }
}
```

---

### **PHASE 2: Detailed Service Implementation**

#### **1. Get or Create Zone**

```javascript
async getZoneId(domain) {
  try {
    // First, try to get existing zone
    const response = await axios.get(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        params: {
          name: domain,
        },
      }
    );

    if (response.data.result && response.data.result.length > 0) {
      const zone = response.data.result[0];
      console.log(`✅ Found existing zone: ${zone.name} (${zone.id})`);
      return zone.id;
    }

    // Zone doesn't exist, create it
    const createResponse = await axios.post(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones`,
      {
        name: domain,
        account: { id: CLOUDFLARE_CONFIG.ACCOUNT_ID },
      },
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const newZone = createResponse.data.result;
    console.log(`✅ Created new zone: ${newZone.name} (${newZone.id})`);

    // ⚠️ IMPORTANT: Zone creation is not enough!
    // User must change nameservers at registrar to Cloudflare's nameservers
    // Nameservers are available in newZone.name_servers
    console.warn(`⚠️  IMPORTANT: Update nameservers at registrar to:`);
    newZone.name_servers.forEach(ns => console.warn(`   - ${ns}`));

    return newZone.id;

  } catch (error) {
    console.error('Error getting/creating zone:', error);
    throw new Error(`Failed to get or create Cloudflare zone: ${error.message}`);
  }
}
```

**⚠️ Important Notes:**

- Creating a zone via API is not enough for full functionality
- **Nameservers must be changed at the domain registrar** to Cloudflare's nameservers
- Until nameservers are updated, the zone will remain "pending" and DNS/SSL won't fully function
- Consider requiring manual zone setup or providing clear instructions to users

#### **2. Disable Proxy Status**

```javascript
async disableProxy(zoneId, domain) {
  try {
    // Get all DNS records
    const response = await axios.get(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        },
      }
    );

    const records = response.data.result || [];

    // Only target the records we control: root domain and wildcard
    const targetNames = [domain, `*.${domain}`];

    // Filter A and AAAA records that match our target names and are currently proxied
    const proxiableRecords = records.filter(
      record =>
        ['A', 'AAAA'].includes(record.type) &&
        record.proxied === true &&
        targetNames.includes(record.name)
    );

    // Update each record to disable proxy
    const updatePromises = proxiableRecords.map(record =>
      axios.patch(
        `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records/${record.id}`,
        { proxied: false },
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
    );

    await Promise.all(updatePromises);

    return true;

  } catch (error) {
    console.error('Error disabling proxy:', error);
    throw new Error(`Failed to disable proxy: ${error.message}`);
  }
}
```

#### **3. Set A Record (Root + Wildcard)**

```javascript
async setARecord(zoneId, domain, serverIP) {
  try {
    // We need to create/update both root and wildcard A records
    const recordsToEnsure = [
      { name: domain, displayName: 'root' },           // example.com
      { name: `*.${domain}`, displayName: 'wildcard' } // *.example.com
    ];

    for (const { name, displayName } of recordsToEnsure) {
      // Get existing A records for this name
      const response = await axios.get(
        `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records`,
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
          },
          params: {
            type: 'A',
            name: name,
          },
        }
      );

      const existingRecords = response.data.result || [];
      const existingRecord = existingRecords.find(record => record.name === name);

      const payload = {
        type: 'A',
        name: name,
        content: serverIP,
        ttl: 1, // Auto
        proxied: false, // Disabled for SSL setup
      };

      if (existingRecord) {
        // Update existing A record
        await axios.put(
          `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records/${existingRecord.id}`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Updated ${displayName} A record: ${name} → ${serverIP}`);
      } else {
        // Create new A record
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
        console.log(`✅ Created ${displayName} A record: ${name} → ${serverIP}`);
      }
    }

    return true;

  } catch (error) {
    console.error('Error setting A record:', error);
    throw new Error(`Failed to set A record: ${error.message}`);
  }
}
```

#### **4. Set SSL Mode**

```javascript
async setSSLMode(zoneId, sslMode = 'full') {
  try {
    // Set Cloudflare SSL mode (full, flexible, or strict)
    // This determines how Cloudflare handles SSL between edge and origin
    const response = await axios.patch(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/settings/ssl`,
      {
        value: sslMode, // 'full', 'flexible', or 'strict'
      },
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ SSL mode set to: ${sslMode}`);
    return response.data.result;

  } catch (error) {
    console.error('Error setting SSL mode:', error);
    throw new Error(`Failed to set SSL mode: ${error.message}`);
  }
}
```

**Note:** SSL certificate is requested on your origin server, not through Cloudflare API. This method only sets how Cloudflare handles SSL between edge and origin.

#### **5. Check SSL Status on Origin Server**

```javascript
async checkSSLStatus(domain) {
  try {
    // Call your internal endpoint to check SSL certificate status on origin server
    // This endpoint should check if Let's Encrypt certificate exists and is valid
    const response = await axios.get(
      `${CLOUDFLARE_CONFIG.INTERNAL_SERVER_URL}/api/v1/ssl/status`,
      {
        params: { domain },
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.INTERNAL_API_TOKEN}`,
        },
      }
    );

    return {
      active: response.data.active || false,
      expiresAt: response.data.expiresAt,
      issuer: response.data.issuer,
      status: response.data.status, // 'active', 'pending', 'expired', 'error'
    };

  } catch (error) {
    console.error('Error checking SSL status on origin:', error);
    throw new Error(`Failed to check SSL status: ${error.message}`);
  }
}
```

**Note:** This checks your origin server's SSL certificate, not Cloudflare's verification. Your server should expose an endpoint that returns certificate status.

#### **6. Enable Proxy Status**

```javascript
async enableProxy(zoneId, domain) {
  try {
    // Get all DNS records
    const response = await axios.get(
      `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
        },
      }
    );

    const records = response.data.result || [];

    // Only target the records we control: root domain and wildcard
    const targetNames = [domain, `*.${domain}`];

    // Filter A and AAAA records that match our target names
    const aRecords = records.filter(
      record =>
        ['A', 'AAAA'].includes(record.type) &&
        targetNames.includes(record.name)
    );

    // Update each record to enable proxy
    const updatePromises = aRecords.map(record =>
      axios.patch(
        `${CLOUDFLARE_CONFIG.BASE_URL}/zones/${zoneId}/dns_records/${record.id}`,
        { proxied: true },
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
    );

    await Promise.all(updatePromises);
    console.log(`✅ Proxy enabled for ${domain} and *.${domain}`);

    return true;

  } catch (error) {
    console.error('Error enabling proxy:', error);
    throw new Error(`Failed to enable proxy: ${error.message}`);
  }
}
```

#### **7. Wait for SSL Activation**

```javascript
async waitForSSLActivation(domain, maxWaitTime = null) {
  const timeout = maxWaitTime || CLOUDFLARE_CONFIG.SSL_TIMEOUT;
  const pollInterval = CLOUDFLARE_CONFIG.POLL_INTERVAL;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const sslStatus = await this.checkSSLStatus(domain);

      // Check if SSL certificate is active on origin server
      if (sslStatus.active && sslStatus.status === 'active') {
        console.log(`✅ SSL certificate is active for ${domain}`);
        return true;
      }

      // Wait before next check
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏳ Waiting for SSL activation... (${elapsed}s) - Status: ${sslStatus.status || 'pending'}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error('Error checking SSL status:', error);
      // Continue polling despite errors
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`SSL certificate activation timeout after ${timeout / 1000} seconds`);
}
```

**Note:** This polls your origin server's SSL status, not Cloudflare's verification endpoint.

---

### **PHASE 2.5: Origin Server SSL Endpoint**

**Required: Your origin server must expose endpoints for SSL certificate management**

#### **Endpoint 1: Request SSL Certificate**

**File: `src/routes/ssl.js` (Backend - Your Server)**

```javascript
// POST /api/v1/ssl/request
router.post("/request", async (req, res) => {
  try {
    const { domain } = req.body;

    // Call your ACME/Certbot service to request certificate
    // This could be:
    // - Direct certbot command execution
    // - ACME client library (e.g., acme-client, greenlock)
    // - Integration with Let's Encrypt API

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
```

#### **Endpoint 2: Check SSL Status**

**File: `src/routes/ssl.js` (Backend - Your Server)**

```javascript
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
```

**Helper Functions (Example):**

```javascript
// Example using certbot/certificate files
async function checkCertificateStatus(domain) {
  const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;

  try {
    const fs = require("fs");
    if (!fs.existsSync(certPath)) {
      return { exists: false };
    }

    const cert = fs.readFileSync(certPath);
    const forge = require("node-forge");
    const x509 = forge.pki.certificateFromPem(cert);

    const now = new Date();
    const validUntil = x509.validity.notAfter;

    return {
      exists: true,
      expired: now > validUntil,
      expiresAt: validUntil,
      issuer: x509.issuer.getField("CN").value,
    };
  } catch (error) {
    throw new Error(`Failed to check certificate: ${error.message}`);
  }
}

async function requestSSLCertificate(domain) {
  // Example: Run certbot command
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    // Certbot command to request certificate
    const command = `certbot certonly --standalone -d ${domain} -d *.${domain} --non-interactive --agree-tos --email your-email@example.com`;
    await execAsync(command);
    return { success: true };
  } catch (error) {
    throw new Error(`Certbot failed: ${error.message}`);
  }
}
```

**Note:** Adjust these examples to match your server's SSL certificate management setup.

---

### **PHASE 3: Frontend Updates**

#### **Update API Configuration**

**File: `src/config/api.js` (Frontend)**

No changes needed - we're using existing `/domain` endpoint.

#### **Update AddDomainModal (Optional Enhancements)**

**File: `src/components/AddDomainModal.jsx`**

Optional improvements:

- Add loading state message for Cloudflare operations
- Show status: "Setting up DNS..." → "Requesting SSL..." → "SSL provisioning in progress..."
- Success message indicating SSL is being set up

---

## 📊 **Database Schema Updates**

### **Domain Model**

Add these fields:

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

  cloudflareMetadata: {
    type: Object,
    default: {},
  },
}
```

---

## 🧪 **Testing Strategy**

### **1. Unit Tests**

- Test each Cloudflare service method individually
- Mock API responses
- Test error scenarios

### **2. Integration Tests**

- Test full domain setup flow
- Test SSL monitoring job
- Test proxy status changes

### **3. Manual Testing**

1. Add test domain through UI
2. Check Cloudflare dashboard:
   - Zone created
   - A record set correctly
   - Proxy disabled
   - SSL settings configured
3. Wait and verify:
   - SSL activates
   - Proxy enables automatically

---

## ⚠️ **Error Handling**

### **Common Error Scenarios**

1. **Domain not in Cloudflare account**

   - Solution: Create zone automatically
   - **Note:** Zone creation requires nameserver update at registrar

2. **Nameservers not updated**

   - **Symptom:** Zone remains "pending", DNS/SSL won't work
   - **Solution:** User must update nameservers at registrar to Cloudflare's nameservers
   - **Prevention:** Require manual zone setup or provide clear instructions

3. **SSL activation timeout**

   - **Symptom:** Certificate not issued after 10 minutes
   - **Solution:** Retry mechanism or manual intervention
   - **Common causes:** DNS not propagated, ACME validation failed, server unreachable

4. **API rate limits**

   - **Symptom:** 429 Too Many Requests errors
   - **Solution:** Implement retry with exponential backoff
   - **Prevention:** Batch operations, cache responses

5. **Invalid server IP**

   - **Symptom:** A record points to invalid IP
   - **Solution:** Validate IP format before setting A record

6. **DNS propagation delays**

   - **Symptom:** Changes not visible immediately
   - **Solution:** Add wait time or retry logic
   - **Note:** DNS changes can take up to 24 hours (usually much faster)

7. **ACME validation failures**
   - **Symptom:** Let's Encrypt certificate request fails
   - **Common causes:** Proxy enabled (blocks ACME), DNS not propagated, port 80/443 blocked
   - **Solution:** Ensure proxy is disabled, wait for DNS propagation, check firewall rules

---

## ✅ **Implementation Checklist**

### **Backend**

- [ ] Install dependencies (axios or cloudflare SDK)
- [ ] Create Cloudflare configuration file
- [ ] Create Cloudflare service layer
- [ ] Implement getZoneId method
- [ ] Implement disableProxy method
- [ ] Implement setARecord method
- [ ] Implement requestSSLCertificate method
- [ ] Implement checkSSLStatus method
- [ ] Implement enableProxy method
- [ ] Implement waitForSSLActivation method
- [ ] Update domain controller with Cloudflare flow
- [ ] Create background job for SSL monitoring
- [ ] Update database schema
- [ ] Add error handling and logging
- [ ] Add environment variables to .env

### **Frontend (Optional)**

- [ ] Enhance loading states in AddDomainModal
- [ ] Add Cloudflare operation status messages
- [ ] Update success messages

### **Documentation**

- [ ] Document environment variables
- [ ] Document Cloudflare API setup steps
- [ ] Create troubleshooting guide

---

## 🚀 **Deployment Steps**

1. **Set up Cloudflare API Token**

   - Generate token with appropriate permissions
   - Add to environment variables

2. **Configure Server IP**

   - Set `SERVER_IP` environment variable
   - Verify IP is correct

3. **Test with Test Domain**

   - Manually add test domain to Cloudflare
   - Test full workflow
   - Verify SSL activation

4. **Deploy to Production**
   - Update environment variables
   - Monitor logs for errors
   - Verify SSL activation times

---

## 📝 **Summary**

This plan implements:

- ✅ Disable proxy status (DNS-only mode) for root + wildcard A records only
- ✅ Set A record (root + wildcard) pointing to server IP
- ✅ Request SSL certificate on origin server via ACME/Let's Encrypt
- ✅ Set Cloudflare SSL mode to "full" or "strict"
- ✅ Enable proxy status (Orange Cloud) after SSL is active on origin

**Key Points:**

- Uses **Origin SSL** (Let's Encrypt on your server), not Cloudflare Universal SSL
- Only modifies DNS records we control (root domain + wildcard)
- SSL monitoring checks origin server certificate status
- Requires nameserver configuration at registrar for full functionality

All steps are automated through Cloudflare API and your origin server's ACME service, with background monitoring for SSL activation.

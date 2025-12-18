# API Endpoints Reference

This document shows all API endpoints used in the frontend application with complete examples.

---

## 🔧 **Base Configuration**

**Base URL:** `http://localhost:3000/api/v1` (or from `VITE_API_BASE_URL` env var)

**Headers (for authenticated endpoints):**
```javascript
{
  "Authorization": "Bearer <token_from_localStorage>",
  "Content-Type": "application/json"
}
```

---

## 📋 **All API Endpoints**

### **1. Authentication**

#### **POST `/auth/login`**
**Purpose:** User login/authentication

**Used in:** `src/store/authStore.js`

**Request:**
```javascript
POST http://localhost:3000/api/v1/auth/login
Headers: {
  "Content-Type": "application/json"
}
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS } from "../config/api.js";

const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
  email: "user@example.com",
  password: "password123"
});
```

---

### **2. Domains**

#### **GET `/` (Base URL)**
**Purpose:** Fetch all domains

**Used in:** `src/components/DomainsName.jsx`, `src/components/AddDomainModal.jsx`

**Request:**
```javascript
GET http://localhost:3000/api/v1/
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.DOMAINS.LIST, {
  headers: getAuthHeaders()
});

const data = await response.json();
// Expected: Array of domain objects or { domains: [...] } or { data: [...] }
```

**Expected Response:**
```json
[
  {
    "domain": "example.com",
    "assignedTo": "user@example.com",
    "organization": "Paragon",
    "id": "abc123",
    "platform": "Media Math",
    "certificationTags": ["tag1", "tag2"],
    "cloudflareZoneId": "zone123",
    "sslStatus": "pending",
    "proxyStatus": "disabled",
    "redtrackTrackingDomain": "trk.example.com"
  }
]
```

---

#### **POST `/domain`**
**Purpose:** Create a new domain

**Used in:** `src/components/AddDomainModal.jsx`

**Request:**
```javascript
POST http://localhost:3000/api/v1/domain
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "domain": "example.com",
  "assignedTo": "user@example.com",
  "organization": "Paragon",
  "id": "abc123",
  "platform": "Media Math",
  "certificationTags": ["tag1", "tag2"],
  "rtkID": "68bb4e7c3ac65661e582e057"  // RedTrack ID (NEW - after backend update)
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const formData = {
  domain: "example.com",
  assignedTo: "user@example.com",
  organization: "Paragon",
  id: "abc123",
  platform: "Media Math",
  certificationTags: ["tag1", "tag2"],
  rtkID: "68bb4e7c3ac65661e582e057"
};

const response = await fetch(API_ENDPOINTS.DOMAINS.CREATE, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify(formData)
});

const result = await response.json();
```

**Expected Response (after Cloudflare/RedTrack integration):**
```json
{
  "message": "Domain created successfully",
  "domain": {
    "domain": "example.com",
    "assignedTo": "user@example.com",
    "organization": "Paragon",
    "id": "abc123",
    "platform": "Media Math",
    "certificationTags": ["tag1", "tag2"],
    "rtkID": "68bb4e7c3ac65661e582e057",
    "cloudflareZoneId": "zone123abc",
    "sslStatus": "pending",
    "proxyStatus": "disabled",
    "redtrackTrackingDomain": "trk.example.com"
  }
}
```

---

#### **PUT/PATCH `/updateDomain`**
**Purpose:** Update an existing domain

**Used in:** Various components (EditModal, etc.)

**Request:**
```javascript
PUT http://localhost:3000/api/v1/updateDomain
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "domain": "example.com",
  "assignedTo": "newuser@example.com",
  "organization": "Paragon",
  "id": "abc123",
  "platform": "Media Math",
  "certificationTags": ["tag1", "tag2"]
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.DOMAINS.UPDATE, {
  method: "PUT",
  headers: getAuthHeaders(),
  body: JSON.stringify(domainData)
});
```

---

#### **DELETE `/domain/:domain`**
**Purpose:** Delete a domain by domain name

**Used in:** Delete functionality

**Request:**
```javascript
DELETE http://localhost:3000/api/v1/domain/example.com
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const domainName = "example.com";
const response = await fetch(API_ENDPOINTS.DOMAINS.DELETE(domainName), {
  method: "DELETE",
  headers: getAuthHeaders()
});
```

---

### **3. Routes (Landing Pages)**

#### **POST `/route`**
**Purpose:** Create a new landing page route

**Used in:** `src/components/LanderCreationForm.jsx`

**Request:**
```javascript
POST http://localhost:3000/api/v1/route
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: [
  {
    "organization": "paragon media",
    "domain": "helloworldnew.com",
    "route": "nn1234",
    "template": "pgnm-chatbot-groceries",
    "rtkID": "68bb4e7c3ac65661e582e057",
    "phoneNumber": "+18664982822",
    "createdBy": "jake@paragonmedia.io",
    "ringbaID": "CAd4c016a37829477688c3482fb6fd01de",
    "platform": "Media Math"
  }
]
```

**⚠️ IMPORTANT:** Body is an **ARRAY** containing a single object `[{...}]`

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const formData = {
  organization: "paragon media",
  domain: "helloworldnew.com",
  route: "nn1234",
  template: "pgnm-chatbot-groceries",
  rtkID: "68bb4e7c3ac65661e582e057",
  phoneNumber: "+18664982822",
  createdBy: "jake@paragonmedia.io",
  ringbaID: "CAd4c016a37829477688c3482fb6fd01de",
  platform: "Media Math"
};

// Request body must be an array
const requestBody = [formData];

const response = await fetch(API_ENDPOINTS.ROUTES.CREATE, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify(requestBody)
});
```

**Expected Response:**
```json
{
  "message": "Route created successfully",
  "route": {
    "organization": "paragon media",
    "domain": "helloworldnew.com",
    "route": "nn1234",
    "template": "pgnm-chatbot-groceries",
    "rtkID": "68bb4e7c3ac65661e582e057",
    "phoneNumber": "+18664982822",
    "createdBy": "jake@paragonmedia.io",
    "ringbaID": "CAd4c016a37829477688c3482fb6fd01de",
    "platform": "Media Math"
  }
}
```

---

#### **GET `/data`**
**Purpose:** Fetch route data

**Request:**
```javascript
GET http://localhost:3000/api/v1/data
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.ROUTES.GET_DATA, {
  headers: getAuthHeaders()
});
```

---

#### **PUT/PATCH `/updateData`**
**Purpose:** Update route data

**Request:**
```javascript
PUT http://localhost:3000/api/v1/updateData
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  // Route data to update
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.ROUTES.UPDATE_DATA, {
  method: "PUT",
  headers: getAuthHeaders(),
  body: JSON.stringify(routeData)
});
```

---

#### **DELETE `/deleteData`**
**Purpose:** Delete route data

**Request:**
```javascript
DELETE http://localhost:3000/api/v1/deleteData
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  // Data to identify which route to delete
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.ROUTES.DELETE_DATA, {
  method: "DELETE",
  headers: getAuthHeaders(),
  body: JSON.stringify({ domain: "...", route: "..." })
});
```

---

### **4. External APIs**

#### **Ringba API - GET Campaigns**
**Purpose:** Fetch all campaigns from Ringba

**Used in:** `src/components/LanderCreationForm.jsx`, `src/testing/TestRun.jsx`

**Request:**
```javascript
GET https://api.ringba.com/v2/{RINGBA_ACCOUNT_ID}/campaigns/ui?includestats=true&includeDI=true&includeRTB=true
Headers: {
  "Authorization": "Token <RINGBA_API_TOKEN>",
  "Content-Type": "application/json"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getRingbaHeaders } from "../config/api.js";

const response = await fetch(API_ENDPOINTS.RINGBA.CAMPAIGNS, {
  headers: getRingbaHeaders()
});
```

---

#### **Ringba API - GET Campaign Details**
**Purpose:** Fetch specific campaign details

**Used in:** `src/components/LanderCreationForm.jsx`, `src/testing/TestRun.jsx`

**Request:**
```javascript
GET https://api.ringba.com/v2/{RINGBA_ACCOUNT_ID}/campaigns/{campaignId}
Headers: {
  "Authorization": "Token <RINGBA_API_TOKEN>",
  "Content-Type": "application/json"
}
```

**Example Code:**
```javascript
import { API_ENDPOINTS, getRingbaHeaders } from "../config/api.js";

const campaignId = "CAd4c016a37829477688c3482fb6fd01de";
const response = await fetch(API_ENDPOINTS.RINGBA.CAMPAIGN_DETAILS(campaignId), {
  headers: getRingbaHeaders()
});
```

---

## 📝 **Complete Example: Domain Creation Flow**

Here's a complete example showing how domain creation works:

```javascript
// 1. Import utilities
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
import { sanitizeInput, validateInput } from "../utils/sanitization.js";

// 2. Prepare form data
const formData = {
  domain: "newdomain.com",
  assignedTo: "buyer@example.com",
  organization: "Paragon",
  id: "unique123",
  platform: "Media Math",
  certificationTags: ["tag1"],
  rtkID: "68bb4e7c3ac65661e582e057"  // RedTrack ID
};

// 3. Validate
if (!validateInput.domain(formData.domain)) {
  throw new Error("Invalid domain format");
}

// 4. Sanitize
const sanitizedData = {
  domain: sanitizeInput.domain(formData.domain),
  assignedTo: sanitizeInput.email(formData.assignedTo),
  organization: sanitizeInput.text(formData.organization),
  id: sanitizeInput.id(formData.id),
  platform: sanitizeInput.text(formData.platform),
  certificationTags: formData.certificationTags.map(tag => sanitizeInput.text(tag)),
  rtkID: sanitizeInput.id(formData.rtkID)
};

// 5. Make API call
const response = await fetch(API_ENDPOINTS.DOMAINS.CREATE, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify(sanitizedData)
});

// 6. Handle response
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
}

const result = await response.json();
console.log("Domain created:", result);
```

---

## 📝 **Complete Example: Landing Page Creation Flow**

Here's a complete example showing how landing page creation works:

```javascript
// 1. Import utilities
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
import { sanitizeInput, validateInput } from "../utils/sanitization.js";

// 2. Prepare form data
const formData = {
  organization: "paragon media",
  domain: "example.com",
  route: "route123",
  template: "pgnm-chatbot-groceries",
  rtkID: "68bb4e7c3ac65661e582e057",
  phoneNumber: "+18664982822",
  createdBy: "user@example.com",
  ringbaID: "CAd4c016a37829477688c3482fb6fd01de",
  platform: "Media Math"
};

// 3. Get current user email if createdBy is empty (for mediaBuyer)
const currentUserEmail = localStorage.getItem("userData")
  ? JSON.parse(localStorage.getItem("userData")).email
  : null;

// 4. Ensure createdBy is populated
formData.createdBy = formData.createdBy || currentUserEmail;

// 5. Validate required fields
const requiredFields = ["domain", "route", "template", "organization", "createdBy", "platform"];
for (const field of requiredFields) {
  if (!validateInput.required(formData[field])) {
    throw new Error(`Missing required field: ${field}`);
  }
}

// 6. Sanitize all inputs
const sanitizedFormData = {
  organization: sanitizeInput.text(formData.organization),
  domain: sanitizeInput.domain(formData.domain),
  route: sanitizeInput.route(formData.route),
  template: sanitizeInput.text(formData.template),
  rtkID: sanitizeInput.id(formData.rtkID),
  phoneNumber: sanitizeInput.phone(formData.phoneNumber),
  createdBy: sanitizeInput.email(formData.createdBy),
  ringbaID: sanitizeInput.text(formData.ringbaID),
  platform: sanitizeInput.text(formData.platform)
};

// 7. Make API call - IMPORTANT: Body must be an array
const requestBody = [sanitizedFormData];

const response = await fetch(API_ENDPOINTS.ROUTES.CREATE, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify(requestBody)
});

// 8. Handle response
if (!response.ok) {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
  } catch (e) {
    const errorText = await response.text();
    errorMessage = errorText || errorMessage;
  }
  throw new Error(`Failed to create landing page: ${errorMessage}`);
}

const result = await response.json();
console.log("Landing page created:", result);
```

---

## 🔍 **Quick Reference Table**

| Endpoint | Method | Purpose | Body Format | Used In |
|----------|--------|---------|-------------|---------|
| `/auth/login` | POST | Login | Object | `authStore.js` |
| `/` | GET | List domains | - | `DomainsName.jsx`, `AddDomainModal.jsx` |
| `/domain` | POST | Create domain | Object | `AddDomainModal.jsx` |
| `/updateDomain` | PUT | Update domain | Object | Edit modals |
| `/domain/:domain` | DELETE | Delete domain | - | Delete modals |
| `/route` | POST | Create landing page | **Array** `[{...}]` | `LanderCreationForm.jsx` |
| `/data` | GET | Get route data | - | Various |
| `/updateData` | PUT | Update route data | Object | Edit components |
| `/deleteData` | DELETE | Delete route data | Object | Delete components |

---

## ⚠️ **Important Notes**

1. **All authenticated endpoints require:**
   - `Authorization: Bearer <token>` header
   - Token is retrieved from `localStorage.getItem("authToken")`

2. **POST `/route` is special:**
   - Body must be an **array** containing a single object: `[{...formData}]`
   - This is different from other endpoints which use plain objects

3. **Domain creation now includes:**
   - `rtkID` field (RedTrack ID) - **required after backend update**
   - Response includes Cloudflare/RedTrack fields

4. **Error handling:**
   - Always check `response.ok` before parsing JSON
   - Error responses may be JSON or plain text
   - Include detailed error messages for users

---

## 🚀 **Testing Endpoints**

You can test these endpoints using:

**cURL:**
```bash
# Create domain
curl -X POST http://localhost:3000/api/v1/domain \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"test.com","assignedTo":"user@example.com","organization":"Paragon","id":"test123","platform":"Media Math","rtkID":"68bb4e7c3ac65661e582e057"}'

# Create landing page route
curl -X POST http://localhost:3000/api/v1/route \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"organization":"paragon media","domain":"test.com","route":"route123","template":"template1","createdBy":"user@example.com","platform":"Media Math","rtkID":"68bb4e7c3ac65661e582e057","phoneNumber":"+1234567890","ringbaID":"CA123"}]'
```

**Postman/Insomnia:**
- Set Base URL: `http://localhost:3000/api/v1`
- Add Authorization header: `Bearer <token>`
- Use the examples above for request bodies

---

This document should help you align your frontend with any backend changes! 🎯




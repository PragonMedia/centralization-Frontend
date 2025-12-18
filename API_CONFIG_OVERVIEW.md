# API Configuration Overview

## 📋 **File: `src/config/api.js`**

### **Purpose**
Central configuration file that manages all API endpoints, base URLs, authentication tokens, and header generation functions.

---

## 🔧 **Structure Breakdown**

### **1. API_CONFIG Object (Lines 2-13)**
Stores base configuration values with environment variable fallbacks:

- **BASE_URL**: `http://localhost:3000/api/v1`
  - Used by: All internal API endpoints
  - Env Var: `VITE_API_BASE_URL`

- **RINGBA_ACCOUNT_ID**: Ringba account identifier
  - Used by: Ringba API calls
  - Env Var: `VITE_RINGBA_ACCOUNT_ID`
  - Fallback: `"RA417e311c6e8b47538624556e6e84298a"`

- **RINGBA_API_TOKEN**: Ringba authentication token
  - Used by: Ringba API authentication
  - Env Var: `VITE_RINGBA_API_TOKEN`
  - ⚠️ **SECURITY**: Contains hardcoded fallback (should use env vars in production)

- **TEMPLATE_PREVIEW_BASE_URL**: `https://approvedlanders.com`
  - Used by: Template preview iframes
  - Env Var: `VITE_TEMPLATE_PREVIEW_BASE_URL`

---

### **2. API_ENDPOINTS Object (Lines 16-37)**
Organized by feature area:

#### **AUTH Endpoints**
- `LOGIN`: `${BASE_URL}/auth/login`
  - **Used by**: `src/store/authStore.js`
  - **Method**: POST
  - **Purpose**: User authentication

#### **DOMAINS Endpoints**
- `LIST`: `${BASE_URL}` (base URL itself)
  - **Used by**: `src/components/DomainsName.jsx`, `src/components/AddDomainModal.jsx`
  - **Method**: GET
  - **Purpose**: Fetch all domains

- `CREATE`: `${BASE_URL}/domain`
  - **Used by**: `src/components/AddDomainModal.jsx`
  - **Method**: POST
  - **Purpose**: Create new domain

- `UPDATE`: `${BASE_URL}/updateDomain`
  - **Method**: PUT/PATCH
  - **Purpose**: Update existing domain

- `DELETE(domain)`: `${BASE_URL}/domain/${domain}`
  - **Method**: DELETE
  - **Purpose**: Delete domain by name

#### **ROUTES Endpoints**
- `GET_DATA`: `${BASE_URL}/data`
  - **Method**: GET
  - **Purpose**: Fetch route data

- `UPDATE_DATA`: `${BASE_URL}/updateData`
  - **Method**: PUT/PATCH
  - **Purpose**: Update route data

- `DELETE_DATA`: `${BASE_URL}/deleteData`
  - **Method**: DELETE
  - **Purpose**: Delete route data

- `CREATE`: `${BASE_URL}/route` ⭐ **Currently Active**
  - **Used by**: `src/components/LanderCreationForm.jsx`
  - **Method**: POST
  - **Purpose**: Create new landing page route
  - **Request Body**: Array with single object `[{...formData}]`

#### **RINGBA Endpoints**
- `CAMPAIGNS`: Full Ringba API URL with query params
  - **Used by**: `src/components/LanderCreationForm.jsx`, `src/testing/TestRun.jsx`
  - **Method**: GET
  - **Purpose**: Fetch all campaigns with stats

- `CAMPAIGN_DETAILS(id)`: Dynamic function that returns URL
  - **Used by**: `src/components/LanderCreationForm.jsx`, `src/testing/TestRun.jsx`
  - **Method**: GET
  - **Purpose**: Fetch specific campaign details

---

### **3. Header Functions (Lines 40-51)**

#### **`getAuthHeaders()`**
- **Purpose**: Generate authentication headers for internal API calls
- **Returns**: 
  ```javascript
  {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  }
  ```
- **Token Source**: `localStorage.getItem("authToken")`
- **Used by**: 
  - `src/components/DomainsName.jsx`
  - `src/components/AddDomainModal.jsx`
  - `src/components/LanderCreationForm.jsx`

#### **`getRingbaHeaders()`**
- **Purpose**: Generate headers for Ringba API calls
- **Returns**:
  ```javascript
  {
    Authorization: `Token ${RINGBA_API_TOKEN}`,
    "Content-Type": "application/json"
  }
  ```
- **Token Source**: `API_CONFIG.RINGBA_API_TOKEN`
- **Used by**:
  - `src/components/LanderCreationForm.jsx`
  - `src/testing/TestRun.jsx`

---

## 📁 **Files Using `api.js`**

### **1. `src/store/authStore.js`**
**Purpose**: Authentication state management (Zustand store)

**Imports**:
```javascript
import { API_ENDPOINTS } from "../config/api.js";
```

**Usage**:
- Uses `API_ENDPOINTS.AUTH.LOGIN` for login requests
- Uses `axios` for HTTP requests (not `fetch`)
- Stores `authToken` in localStorage after successful login

**Key Functions**:
- `login(email, password)` - POSTs to `API_ENDPOINTS.AUTH.LOGIN`
- `logout()` - Removes tokens from localStorage
- `checkAuthStatus()` - Validates existing auth token

---

### **2. `src/components/AddDomainModal.jsx`**
**Purpose**: Modal for adding new domains

**Imports**:
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
```

**Usage**:
- `API_ENDPOINTS.DOMAINS.LIST` - Checks ID uniqueness (line 69)
- `API_ENDPOINTS.DOMAINS.CREATE` - Creates new domain (line 126)
- `getAuthHeaders()` - Adds auth token to requests

**Key Features**:
- Form validation and sanitization
- ID uniqueness check before submission
- Auto-adds `.com` to domain if missing

---

### **3. `src/components/DomainsName.jsx`**
**Purpose**: Main domains listing page

**Imports**:
```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";
```

**Usage**:
- `API_ENDPOINTS.DOMAINS.LIST` - Fetches all domains (line 42)
- `getAuthHeaders()` - Adds auth token to requests
- Uses `cachedFetch` for performance optimization

**Key Features**:
- Fetches domains on component mount
- Handles multiple response formats (array, `{domains: []}`, `{data: []}`)
- Shows loading and error states

---

### **4. `src/components/LanderCreationForm.jsx`**
**Purpose**: Multi-step form for creating landing pages

**Imports**:
```javascript
import {
  API_ENDPOINTS,
  getAuthHeaders,
  getRingbaHeaders,
} from "../config/api.js";
```

**Usage**:
- `API_ENDPOINTS.DOMAINS.LIST` - Fetches available domains for dropdown
- `API_ENDPOINTS.ROUTES.CREATE` - Creates new landing page route (line 816)
- `API_ENDPOINTS.RINGBA.CAMPAIGNS` - Fetches Ringba campaigns
- `API_ENDPOINTS.RINGBA.CAMPAIGN_DETAILS(id)` - Fetches campaign details
- `getAuthHeaders()` - For internal API calls
- `getRingbaHeaders()` - For Ringba API calls

**Key Features**:
- 4-step form process
- Ringba campaign integration
- Domain dropdown with search
- Role-based auto-fill for media buyers
- **Currently debugging 400 error** on route creation

**Current Issue**:
- Getting 400 Bad Request when submitting to `API_ENDPOINTS.ROUTES.CREATE`
- Enhanced error logging added to debug the issue

---

### **5. `src/components/TemplatePreview.jsx`**
**Purpose**: Live template preview iframe

**Imports**:
```javascript
import { API_CONFIG } from "../config/api.js";
```

**Usage**:
- `API_CONFIG.TEMPLATE_PREVIEW_BASE_URL` - Constructs preview URLs
- Example: `${API_CONFIG.TEMPLATE_PREVIEW_BASE_URL}/pgnm-chatbot-groceries/`

**Key Features**:
- Shows live preview of selected template
- Uses iframe with sandbox attributes for security

---

### **6. `src/testing/TestRun.jsx`**
**Purpose**: Testing utility for Ringba API

**Imports**:
```javascript
import { API_CONFIG, getRingbaHeaders } from "../config/api.js";
```

**Usage**:
- Constructs Ringba API URLs manually (could use `API_ENDPOINTS.RINGBA` instead)
- `getRingbaHeaders()` - For Ringba API authentication
- Uses `cachedFetch` for API calls

**Note**: Could be refactored to use `API_ENDPOINTS.RINGBA` endpoints

---

## 🔍 **Current Issues & Observations**

### **1. Security Concerns**
- ⚠️ **Hardcoded tokens**: `RINGBA_API_TOKEN` has a fallback value in code
- ⚠️ **Should use environment variables** exclusively in production

### **2. API Endpoint Issues**
- 🔴 **400 Bad Request** on `API_ENDPOINTS.ROUTES.CREATE`
  - Enhanced error logging added
  - Need to verify request body format matches backend expectations

### **3. Inconsistencies**
- `TestRun.jsx` manually constructs Ringba URLs instead of using `API_ENDPOINTS.RINGBA`
- Mixed use of `axios` (authStore) vs `fetch` (components)

### **4. Missing Error Handling**
- Some endpoints may not have comprehensive error handling
- Consider adding retry logic for failed requests

---

## 📝 **Recommendations**

1. **Move all tokens to environment variables** (no hardcoded fallbacks)
2. **Standardize HTTP client** (choose `axios` or `fetch` consistently)
3. **Refactor TestRun.jsx** to use `API_ENDPOINTS.RINGBA`
4. **Add request/response interceptors** for global error handling
5. **Create API service layer** to abstract HTTP calls from components





















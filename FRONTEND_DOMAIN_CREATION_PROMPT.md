# Frontend Domain Creation Feature - CursorAI Prompt

> **Note:** This prompt has been updated to align with the existing `AddDomainModal.jsx` component. Key changes:
>
> - Removed "Media Math" from platform options (was previously removed from codebase)
> - Updated to use `API_ENDPOINTS.DOMAINS.CREATE` instead of hardcoded URL
> - Changed ID validation from pattern-based to uniqueness-based (matches existing implementation)
> - Clarified that this is an UPDATE to existing component, not a new component
> - Added requirement for `rtkID` field which is missing from current component

## 📋 **Context**

I need you to **UPDATE** the existing domain creation feature (`src/components/AddDomainModal.jsx`) in our frontend. The component already exists but needs to be enhanced to:

1. Add the missing `rtkID` field (required by backend)
2. Display integration status after domain creation (Cloudflare, RedTrack, SSL)
3. Show better success messages with integration details
4. Handle the new response structure from backend

When a user adds a domain through the UI, it calls the backend API endpoint that automatically integrates with Cloudflare and RedTrack.

---

## 🎯 **Task**

**Update** the existing `AddDomainModal.jsx` component to:

1. Collects all required domain information from the user
2. Sends a POST request to the backend API
3. Handles loading states during the integration process
4. Displays success/error messages appropriately
5. Shows integration status (Cloudflare, RedTrack, SSL)

---

## 🔌 **API Endpoint Details**

### **Endpoint:**

```
POST {API_CONFIG.BASE_URL}/domain
```

**Note:** Use `API_ENDPOINTS.DOMAINS.CREATE` from `src/config/api.js` instead of hardcoding the URL.

### **Request Headers:**

```javascript
{
  "Content-Type": "application/json"
  // Add Authorization header if your API requires authentication
}
```

### **Request Body (Required Fields):**

```json
{
  "domain": "example.com",
  "assignedTo": "user@example.com",
  "organization": "Paragon",
  "id": "123-456",
  "platform": "Google",
  "rtkID": "rtk_example_001",
  "certificationTags": ["Tag1", "Tag2"]
}
```

### **Field Requirements:**

| Field               | Type   | Required    | Options/Format                          | Description                                            |
| ------------------- | ------ | ----------- | --------------------------------------- | ------------------------------------------------------ |
| `domain`            | string | ✅ Yes      | Valid domain format                     | Domain name (e.g., "example.com")                      |
| `assignedTo`        | string | ✅ Yes      | Email format                            | User email who owns this domain                        |
| `organization`      | string | ✅ Yes      | "Elite", "Paragon", "Fluent"            | Organization name                                      |
| `id`                | string | ✅ Yes      | Any unique string                       | Domain ID (e.g., "AJ_ELITE_MEDI_PPC_YT9" or "123-456") |
| `platform`          | string | ✅ Yes      | "Facebook", "Google", "Liftoff", "Bigo" | Advertising platform                                   |
| `rtkID`             | string | ✅ Yes      | Any string                              | RedTrack ID for this domain                            |
| `certificationTags` | array  | ❌ Optional | Array of strings                        | Certification tags (e.g., ["Entertainment", "Gaming"]) |

### **Expected Response (Success - 201):**

```json
{
  "message": "Domain created successfully. SSL certificate provisioning in progress.",
  "domain": {
    "domain": "example.com",
    "assignedTo": "user@example.com",
    "organization": "Paragon",
    "id": "123-456",
    "platform": "Google",
    "rtkID": "rtk_example_001",
    "certificationTags": ["Tag1", "Tag2"],
    "routes": [],
    "cloudflareZoneId": "abc123def456...",
    "sslStatus": "pending",
    "proxyStatus": "disabled",
    "redtrackTrackingDomain": "trk.example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **Error Responses:**

**400 Bad Request - Missing Fields:**

```json
{
  "error": "Missing required fields. Required: domain, assignedTo, id, platform, rtkID"
}
```

**400 Bad Request - Domain Already Exists:**

```json
{
  "error": "Domain already exists."
}
```

**400 Bad Request - Invalid Organization:**

```json
{
  "error": "Invalid organization. Must be one of: Elite, Paragon, Fluent"
}
```

**400 Bad Request - Invalid Platform:**

```json
{
  "error": "Invalid platform. Must be one of: Facebook, Google, Liftoff, Bigo"
}
```

**500 Server Error:**

```json
{
  "error": "Server error while creating domain."
}
```

---

## 💻 **Implementation Requirements**

### **1. Form/Modal Component**

Create a form with the following fields:

- **Domain Name** (text input, required)

  - Validation: Must be valid domain format
  - Placeholder: "example.com"
  - Help text: "Enter the domain name (e.g., example.com)"

- **Assigned To** (email input, required)

  - Validation: Must be valid email format
  - Placeholder: "user@example.com"
  - Help text: "Email of the user who will manage this domain"

- **Organization** (dropdown/select, required)

  - Options: "Elite", "Paragon", "Fluent"
  - Default: "Paragon"

- **Domain ID** (text input, required)

  - Validation: Must be unique (check against existing domains)
  - Placeholder: "AJ_ELITE_MEDI_PPC_YT9" or "123-456"
  - Help text: "Enter a unique domain ID"
  - Note: Component should check ID uniqueness before submission

- **Platform** (dropdown/select, required)

  - Options: "Facebook", "Google", "Liftoff", "Bigo"
  - Default: "Google"
  - Note: "Media Math" was removed from platform options

- **RTK ID** (text input, required)

  - Placeholder: "rtk_example_001"
  - Help text: "RedTrack ID for this domain"

- **Certification Tags** (multi-select or tag input, optional)
  - Allow multiple tags
  - Can be empty array
  - Help text: "Add certification tags (optional)"

### **2. Form Validation**

Implement client-side validation:

```javascript
// Example validation rules
const validationRules = {
  domain: {
    required: true,
    pattern:
      /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
    message: "Please enter a valid domain name",
  },
  assignedTo: {
    required: true,
    type: "email",
    message: "Please enter a valid email address",
  },
  organization: {
    required: true,
    enum: ["Elite", "Paragon", "Fluent"],
    message: "Please select a valid organization",
  },
  id: {
    required: true,
    message: "ID is required and must be unique",
    // Note: Uniqueness is checked via API call, not pattern validation
  },
  platform: {
    required: true,
    enum: ["Facebook", "Google", "Liftoff", "Bigo", "Media Math"],
    message: "Please select a valid platform",
  },
  rtkID: {
    required: true,
    message: "RTK ID is required",
  },
  certificationTags: {
    required: false,
    type: "array",
  },
};
```

### **3. API Call Function**

Create a function to call the backend API:

```javascript
import { API_ENDPOINTS, getAuthHeaders } from "../config/api.js";

async function createDomain(domainData) {
  try {
    const response = await fetch(API_ENDPOINTS.DOMAINS.CREATE, {
      method: "POST",
      headers: getAuthHeaders(), // Includes Authorization and Content-Type
      body: JSON.stringify(domainData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create domain");
    }

    return data;
  } catch (error) {
    throw error;
  }
}
```

### **4. Loading States**

Show appropriate loading states during the integration process:

- **Initial Submit:** "Creating domain..."
- **During Integration:** "Setting up Cloudflare and RedTrack..."
- **After Success:** "Domain created successfully! SSL certificate provisioning in progress."

### **5. Success Handling**

On successful domain creation:

1. **Show Success Message:**

   ```
   ✅ Domain created successfully!

   SSL certificate provisioning is in progress. This may take a few minutes.

   - Cloudflare Zone ID: {cloudflareZoneId}
   - RedTrack Tracking Domain: {redtrackTrackingDomain}
   - SSL Status: {sslStatus}
   - Proxy Status: {proxyStatus}
   ```

2. **Update Domain List:**

   - Refresh the domains list to show the new domain
   - Or navigate to the domain detail page

3. **Display Integration Status:**
   - Show Cloudflare zone ID
   - Show RedTrack tracking domain (trk.{domain})
   - Show SSL status (pending/active/failed)
   - Show proxy status (enabled/disabled)

### **6. Error Handling**

Handle different error scenarios:

```javascript
try {
  const result = await createDomain(formData);
  // Handle success
} catch (error) {
  // Handle different error types
  if (error.message.includes("already exists")) {
    showError("This domain already exists. Please choose a different domain.");
  } else if (error.message.includes("Missing required fields")) {
    showError("Please fill in all required fields.");
  } else if (error.message.includes("Invalid organization")) {
    showError("Invalid organization selected.");
  } else if (error.message.includes("Invalid platform")) {
    showError("Invalid platform selected.");
  } else {
    showError(`Failed to create domain: ${error.message}`);
  }
}
```

### **7. User Experience Enhancements**

- **Form Reset:** Clear form after successful submission
- **Loading Indicator:** Show spinner or progress bar during API call
- **Disable Submit:** Disable submit button while request is in progress
- **Field Helpers:** Show helpful tooltips or hints for each field
- **Real-time Validation:** Validate fields as user types
- **Confirmation Dialog:** Optional - ask for confirmation before submitting

---

## 📝 **Existing Component Notes**

The component already exists at `src/components/AddDomainModal.jsx`. You need to:

1. **Add `rtkID` field** to the form
2. **Update success handling** to display integration status
3. **Enhance error messages** to handle new backend errors
4. **Add integration status display** after successful creation

**Current Component Structure:**

```javascript
// Existing component at src/components/AddDomainModal.jsx

function AddDomainModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    domain: "",
    assignedTo: "",
    organization: "Paragon",
    id: "",
    platform: "Google",
    rtkID: "",
    certificationTags: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createDomain(formData);
      setSuccess(result);
      // Reset form
      setFormData({
        /* reset to initial state */
      });
      // Call success callback
      if (onSuccess) onSuccess(result.domain);
      // Close modal after delay
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {/* Form fields here */}
        {/* Loading indicator */}
        {/* Error message */}
        {/* Success message */}
        {/* Submit button */}
      </form>
    </Modal>
  );
}
```

---

## ✅ **Checklist**

Before considering the feature complete:

- [ ] **Add `rtkID` field** to form (required field)
- [ ] **Update formData state** to include `rtkID`
- [ ] **Update validation** to include `rtkID` as required
- [ ] **Update success handling** to display integration status from response
- [ ] **Show Cloudflare zone ID** in success message
- [ ] **Show RedTrack tracking domain** (trk.{domain}) in success message
- [ ] **Show SSL status** (pending/active/failed) in success message
- [ ] **Show proxy status** (enabled/disabled) in success message
- [ ] **Update error handling** for new backend error messages
- [ ] **Remove "Media Math"** from platform options if present
- [ ] **Use API_ENDPOINTS.DOMAINS.CREATE** instead of hardcoded URL
- [ ] **Use getAuthHeaders()** for API requests
- [ ] **Keep existing ID uniqueness check** functionality
- [ ] **Keep existing form validation** and enhance if needed
- [ ] **Test with backend** to ensure all fields are sent correctly

---

## 🎨 **UI/UX Recommendations**

1. **Form Layout:**

   - Use a clean, organized layout
   - Group related fields together
   - Use appropriate input types (email, text, select)
   - Add helpful labels and placeholders

2. **Visual Feedback:**

   - Show loading spinner during API call
   - Display success/error messages prominently
   - Use color coding (green for success, red for errors)
   - Show checkmarks for completed steps

3. **Integration Status Display:**

   - Show Cloudflare status with icon
   - Show RedTrack status with icon
   - Show SSL status with progress indicator
   - Update status in real-time if possible

4. **Error Messages:**
   - Be specific about what went wrong
   - Suggest how to fix the issue
   - Don't show technical error details to users
   - Use friendly, helpful language

---

## 🔗 **Integration Points**

After domain creation:

1. **Refresh Domain List:**

   - Call your `getAllDomains()` function
   - Or update the list state directly

2. **Navigate to Domain Details:**

   - Optionally navigate to the new domain's detail page
   - Show full integration status there

3. **Show Integration Progress:**
   - Display a status card showing:
     - Cloudflare setup status
     - RedTrack setup status
     - SSL certificate status
     - Proxy status

---

## 📚 **Additional Notes**

- The backend automatically handles Cloudflare and RedTrack integration
- SSL certificate provisioning happens in the background
- Domain is saved even if integration partially fails
- Check backend logs for detailed integration status
- SSL status will update from "pending" to "active" when certificate is ready
- Proxy will automatically enable when SSL is active

---

**Use this prompt in your frontend CursorAI to implement the domain creation feature that properly integrates with the backend API.**

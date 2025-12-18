# ParagonMedia Centralized Landing Page System - Complete Documentation

## Overview

This is a React-based frontend application for managing domains and creating landing pages. The system provides a centralized platform where users can create, edit, and manage landing pages across multiple domains with role-based access control.

## Architecture

### Technology Stack
- **Frontend Framework**: React 19.1.0 with Vite
- **Routing**: React Router DOM 7.7.1
- **State Management**: Zustand 5.0.8
- **UI Components**: Flowbite React 0.12.6
- **HTTP Client**: Axios 1.11.0
- **Notifications**: React Toastify 11.0.5
- **Styling**: Tailwind CSS (via Flowbite)

### Project Structure
```
src/
├── main.jsx                 # Application entry point
├── App.jsx                  # Main app component with routing
├── config/
│   └── api.js              # API configuration and endpoints
├── store/
│   └── authStore.js        # Authentication state management (Zustand)
├── pages/
│   ├── Homepage.jsx        # Landing page with login modal
│   ├── Domains.jsx         # Domain management page
│   ├── LanderCreation.jsx  # Landing page creation wizard
│   └── EditRoute.jsx       # Route editing page
├── components/
│   ├── domains/            # Domain-specific components
│   │   ├── DomainTable.jsx
│   │   ├── DomainFilters.jsx
│   │   ├── DomainHeader.jsx
│   │   └── DomainStats.jsx
│   ├── AddDomainModal.jsx
│   ├── DomainPopupModal.jsx
│   ├── LanderCreationForm.jsx
│   ├── LoginModal.jsx
│   ├── ProtectedRoute.jsx
│   └── ... (other UI components)
└── utils/
    ├── cache.js            # API response caching
    ├── domainFilters.js    # Domain filtering logic
    └── sanitization.js     # Input sanitization utilities
```

## Core Features

### 1. Authentication System

**Location**: `src/store/authStore.js`

The authentication system uses Zustand for state management and localStorage for persistence.

**Key Features**:
- User login with email/password
- JWT token storage in localStorage
- Automatic authentication status checking
- Role-based access control

**User Roles**:
- `ceo` - Full access to all domains and routes
- `tech` - Technical admin with full access
- `admin` - Administrative access
- `mediaBuyer` - Limited access to assigned domains only

**Authentication Flow**:
1. User enters credentials in LoginModal
2. Credentials sent to `/api/v1/auth/login`
3. Backend returns user object and JWT token
4. Token stored in localStorage as `authToken`
5. User data stored in localStorage as `userData`
6. Auth state updated in Zustand store

### 2. Domain Management

**Location**: `src/pages/Domains.jsx` and `src/components/DomainsName.jsx`

**Features**:
- View all domains in a table format
- Filter by organization, platform, media buyer, or search term
- Add new domains
- Edit existing domains
- Delete domains (with confirmation)
- View domain statistics
- Click domain to see all routes

**Domain Data Structure**:
```javascript
{
  domain: "example.com",
  organization: "Paragon" | "Elite",
  id: "unique-domain-id",
  platform: "Facebook" | "Google" | "Liftoff" | "Bigo" | "DV 360",
  assignedTo: "user@email.com",
  certificationTags: ["G2", "Political"],
  routes: [...]
}
```

**Role-Based Domain Access**:
- **Media Buyers**: Only see domains assigned to them (`assignedTo === user.email`)
- **Tech/CEO/Admin**: See all domains, can filter by media buyer
- **Regular Users** (Jake, Addy, Neil): See domains assigned to them

### 3. Landing Page Creation

**Location**: `src/pages/LanderCreation.jsx` and `src/components/LanderCreationForm.jsx`

**Multi-Step Wizard Process**:

**Step 1: Organization Selection**
- Choose between "Paragon Media" or "Elite"
- Paragon Media: Dynamic campaign data from Ringba API
- Elite: Fixed configuration (hardcoded Ringba ID and phone)

**Step 2: Vertical & Campaign**
- Select vertical: Medicare PPC, Debt PPC, Sweeps, Nutra, Casino
- For Medicare PPC/Debt PPC: Fetch campaigns from Ringba API
- For other verticals: Use dummy campaigns
- Select campaign from dropdown
- For Tech/CEO/Admin: Select media buyer from campaign
- For Media Buyers: Auto-fill their details from campaign

**Step 3: Domain Selection**
- Filtered domain list based on:
  - User role (media buyers see only their domains)
  - Selected media buyer (for Tech/CEO/Admin)
  - Selected vertical (if domain has vertical property)
- Searchable dropdown with autocomplete
- Auto-populates platform from selected domain

**Step 4: Landing Page Details**
- Path/Route: URL path for the landing page (e.g., "nn")
- Template: Select from templates based on vertical
- RT Campaign ID: RedTrack campaign identifier
- Template preview shown below form

**Form Submission**:
- Validates all required fields
- Sanitizes all inputs
- Creates route via POST to `/api/v1/route`
- Invalidates cache
- Shows success modal with created URL

**Templates by Vertical**:
- **Medicare PPC**: Chatbot Grocery, Chatbot Social Security
- **Debt PPC**: Debt Landing Page 1, Debt Landing Page 2, Debt Consolidation
- **Sweeps**: Sweep
- **Nutra**: Nutra Landing Page 1, Nutra Landing Page 2, Supplement Sales
- **Casino**: Casino Landing Page 1, Casino Landing Page 2, Casino Signup

### 4. Route Management

**Location**: `src/components/DomainPopupModal.jsx`

When clicking a domain, a modal opens showing:
- Domain information (organization, ID, platform, certification tags)
- All routes associated with the domain
- For each route:
  - URL (clickable to view)
  - Template name
  - RTK ID, Ringba ID, Phone Number
  - Actions: View, Details, Edit, Delete

**Route Editing**:
- Edit route path, template, RTK ID, Ringba ID, phone number
- Updates via PUT to `/api/v1/updateData`

**Route Deletion**:
- Confirmation modal before deletion
- Deletes via DELETE to `/api/v1/deleteData`

### 5. API Integration

**Location**: `src/config/api.js`

**Backend API** (Default: `http://138.68.231.226:3000/api/v1`):
- `POST /auth/login` - User authentication
- `GET /` - List all domains
- `POST /domain` - Create new domain
- `PUT /updateDomain` - Update domain
- `DELETE /domain/:domain` - Delete domain
- `POST /data` - Get route data
- `POST /route` - Create new route
- `PUT /updateData` - Update route
- `DELETE /deleteData` - Delete route

**Ringba API Integration**:
- Fetches campaigns for Medicare PPC and Debt PPC verticals
- Extracts media buyer information from campaign jsTags
- Campaigns endpoint: `https://api.ringba.com/v2/{accountId}/campaigns/ui`
- Campaign details: `https://api.ringba.com/v2/{accountId}/campaigns/{id}`

**Authentication Headers**:
- Backend API: `Authorization: Bearer {token}`
- Ringba API: `Authorization: Token {ringbaToken}`

### 6. Caching System

**Location**: `src/utils/cache.js`

**Features**:
- In-memory cache for API responses
- TTL-based expiration (default 5 minutes)
- Cache invalidation on mutations
- Only caches GET requests

**Cache Configuration**:
- Domains: 2 minutes
- Campaigns: 5 minutes
- Campaign Details: 10 minutes
- Default: 5 minutes

**Cache Invalidation**:
- Domain operations invalidate domain cache
- Route operations invalidate domain cache
- Manual invalidation available

### 7. Input Sanitization & Validation

**Location**: `src/utils/sanitization.js`

**Sanitization Functions**:
- Domain names: Removes spaces, adds .com if missing
- Email addresses: Validates format
- Route paths: Removes invalid characters
- IDs: Alphanumeric only
- Phone numbers: Validates format

**Validation Functions**:
- Required field checks
- Domain format validation
- Email format validation
- ID uniqueness checks

### 8. Filtering System

**Location**: `src/utils/domainFilters.js`

**Filter Types**:
- **Search**: Filters by domain name or Ringba ID in routes
- **Organization**: Filters by Paragon/Elite
- **Platform**: Filters by Facebook/Google/Liftoff/Bigo/DV 360
- **Media Buyer**: Filters by assigned user email

**Filter Logic**:
- User role determines base visibility
- Additional filters applied on top
- Filters are combinable (AND logic)

## User Roles & Permissions

### CEO / Tech / Admin
- ✅ View all domains
- ✅ Create domains
- ✅ Edit all domains
- ✅ Delete domains
- ✅ Create landing pages for any domain
- ✅ Select media buyer when creating landing pages
- ✅ Edit all routes
- ✅ Delete all routes
- ✅ See Media Buyer column in domain table

### Media Buyer
- ✅ View only assigned domains
- ✅ Create landing pages for assigned domains
- ✅ Auto-filled with their campaign details
- ✅ Edit routes in assigned domains
- ✅ Delete routes in assigned domains
- ❌ Cannot create domains
- ❌ Cannot edit domain properties
- ❌ Cannot see Media Buyer column

### Regular Users (Jake, Addy, Neil)
- ✅ View only assigned domains
- ✅ Create landing pages for assigned domains
- ✅ Edit routes in assigned domains
- ✅ Delete routes in assigned domains
- ❌ Cannot create domains
- ❌ Cannot edit domain properties

## Routing

**Location**: `src/App.jsx`

**Routes**:
- `/` - Homepage (shows login modal if not authenticated)
- `/domains` - Domain management (protected)
- `/create` - Landing page creation (protected)
- `/edit/:domain/:route` - Route editing (protected)
- `/test` - Test page (public)

**Protected Routes**:
- Wrapped in `<ProtectedRoute>` component
- Redirects to homepage if not authenticated
- Homepage shows login modal automatically

## State Management

**Authentication State** (Zustand):
- `user` - Current user object
- `isAuthenticated` - Boolean auth status
- `isLoading` - Loading state
- `error` - Error message
- `login(email, password)` - Login function
- `logout()` - Logout function
- `checkAuthStatus()` - Check localStorage for existing session

## Environment Variables

**Required** (via `.env` file):
- `VITE_API_BASE_URL` - Backend API URL (default: `http://138.68.231.226:3000/api/v1`)
- `VITE_RINGBA_ACCOUNT_ID` - Ringba account ID
- `VITE_RINGBA_API_TOKEN` - Ringba API token
- `VITE_TEMPLATE_PREVIEW_BASE_URL` - Template preview base URL (default: `https://approvedlanders.com`)

## Key Components

### DomainPopupModal
- Shows domain details and all routes
- Handles route editing, viewing, and deletion
- Handles domain editing and deletion
- Role-based action visibility

### LanderCreationForm
- Multi-step wizard (4 steps)
- Integrates with Ringba API for campaigns
- Auto-fills media buyer details
- Template preview
- Form validation and sanitization

### DomainTable
- Displays domains in table format
- Sortable and filterable
- Clickable rows to open domain popup
- Media buyer column (only for Tech/CEO/Admin)

### DomainFilters
- Search bar
- Organization dropdown
- Platform dropdown
- Media buyer filter (for Tech/CEO/Admin)
- Clear filters button

## Data Flow

### Creating a Landing Page:
1. User selects organization (Paragon/Elite)
2. User selects vertical
3. System fetches campaigns from Ringba (if Medicare/Debt PPC)
4. User selects campaign
5. System fetches campaign details and extracts media buyers
6. User selects media buyer (if Tech/CEO/Admin) or auto-filled (if Media Buyer)
7. User selects domain (filtered by role/media buyer)
8. User enters route path, selects template, enters RTK ID
9. System validates and sanitizes all inputs
10. POST request to `/api/v1/route` with all data
11. Cache invalidated
12. Success modal shown with created URL

### Viewing Domains:
1. Component mounts, checks authentication
2. Fetches domains from `/api/v1/` (with caching)
3. Filters domains based on user role
4. Applies additional filters (organization, platform, search, media buyer)
5. Displays filtered results in table

## Error Handling

- **API Errors**: Displayed in error modals/toasts
- **Validation Errors**: Shown inline in forms
- **Authentication Errors**: Displayed in login modal
- **Network Errors**: Handled with retry options

## Security Features

- JWT token-based authentication
- Input sanitization on all user inputs
- Role-based access control
- Protected routes
- CORS handling via backend
- Token stored in localStorage (consider httpOnly cookies for production)

## Development

**Start Development Server**:
```bash
npm run dev
```

**Build for Production**:
```bash
npm run build
```

**Lint Code**:
```bash
npm run lint
```

**Preview Production Build**:
```bash
npm run preview
```

## Future Enhancements

- [ ] Add domain vertical filtering
- [ ] Implement bulk operations
- [ ] Add analytics dashboard
- [ ] Export domain/route data
- [ ] Add template customization
- [ ] Implement version control for routes
- [ ] Add audit logging
- [ ] Improve error handling with retry logic
- [ ] Add unit and integration tests

## Notes

- The system uses hardcoded media buyer details for Elite organization
- Some API endpoints use localhost in EditRoute.jsx (should use API_CONFIG)
- Template previews are loaded from external URL
- Cache cleanup runs every 5 minutes automatically
- Domain IDs must be unique (checked before creation)


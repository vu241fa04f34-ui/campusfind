# CampusFind — Campus Lost & Found Platform

> **"Lost something? Let's find it."**  
> *Your campus community, helping belongings find their way home.*

CampusFind is a modern, responsive full-stack web application designed for college campuses to help students report lost belongings, log found items, communicate securely, and safely recover lost property.

---

## 🌟 Key Features

- **AI Lost & Found Assistant (Chatbot)**:
  - Accessible via floating trigger button on every page.
  - Understands natural language queries (e.g. *"I lost my MacBook in the library"*, *"Did anyone find a blue water bottle at the gym?"*).
  - Searches active Cloud Firestore listings (or local demo listings in offline mode) with zero hallucinations.
  - Displays compact, interactive item cards with photos, status badges, campus locations, dates, and direct links to `/item/:id`.
  - Explains step-by-step reporting guidelines, recovery workflows, and campus safety protocols.
  - Suggests quick prompt chips (*"Search for my lost item"*, *"Show recently found items"*, *"How do I report an item?"*).
  - Provides dual-mode capability: talks to server-side Firebase Cloud Function (`chatAssistant`) with Gemini when configured, or uses intelligent client-side NLP search when offline.
- **Intuitive Homepage & Discovery**:
  - Real-time search across titles, descriptions, and campus buildings.
  - Multi-dimensional filters: Type (All, Lost, Found with live item counters), Categories, and Campus Locations.
  - Sorting by newest or oldest reports.
  - Informative "How It Works" workflow and "Trust & Safety" protocol guidelines.
- **Reporting Lost & Found Belongings**:
  - Guided reporting form with strict validation.
  - Client-side image preview and validation (JPG, PNG, WebP up to 5 MB).
  - Proactive privacy warning alerting users if passwords, student IDs, or phone numbers are typed into public descriptions.
- **Safe Recovery Workflow**:
  - Secure in-app claim messages instead of exposing personal student emails or phone numbers.
  - Listing owners can review claims, accept/decline, and mark items as "Returned & Recovered".
  - Confirmation modals preventing accidental status updates.
- **User Dashboard**:
  - Manage all submitted lost and found listings.
  - Edit descriptions and campus locations.
  - Secure deletion with confirmation modal.
  - In-app inbox for incoming claims.
- **Production Backend & Dual-Mode Architecture**:
  - **Firebase Mode**: Uses Firebase Authentication, Cloud Firestore, and Firebase Storage with production security rules.
  - **Demo Mode**: Works instantly out of the box with realistic campus demo records and simulated persistence if Firebase keys have not yet been configured.

---

## 🛠️ Technology Stack

- **Frontend**: React 18+ with Vite
- **Language**: JavaScript (ESModules)
- **Styling**: Tailwind CSS (Custom Emerald-Green palette, modern SaaS design)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Backend / BaaS**:
  - Firebase Authentication (Email/Password & Sessions)
  - Cloud Firestore (Structured document store)
  - Firebase Storage (Media asset uploads)
  - Firebase Cloud Functions (Server-side AI Assistant endpoint)
  - Firebase Hosting (Configured via `firebase.json`)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested with Node v24)
- npm v9+

### 2. Installation
```bash
npm install
```

### 3. Run in Demo Mode (Zero Setup Required)
CampusFind includes a built-in interactive demo mode with realistic student records:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`. You can immediately:
- Search and filter demo records
- Open the **AI Assistant** in the bottom-right corner and ask questions like *"I lost my headphones"* or click *"Show recently found items"*
- Test report submission with live image previews
- Click **"Instant Demo Sign-In"** to access the User Dashboard and claim management

---

## ☁️ Connecting to Real Firebase & Cloud Functions

### 1. Frontend Firebase Settings
Create a `.env.local` file in the project root:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional: Set this once your Cloud Function is deployed
# VITE_AI_ENDPOINT_URL=https://us-central1-your-app-id.cloudfunctions.net/chatAssistant
```

### 2. Backend Cloud Functions (AI Assistant)
The backend AI function resides in `functions/`:
```bash
cd functions
npm install
cd ..
```

To configure your Google Gemini API secret on the server (never exposed to browser bundles):
```bash
firebase functions:secrets:set GEMINI_API_KEY
```
Or for local emulation:
```bash
export GEMINI_API_KEY="your_actual_gemini_api_key"
```

To deploy all rules, functions, and hosting:
```bash
firebase login
firebase deploy
```

---

## 🔒 Security & Privacy Architecture

- **Zero Secret Exposure**: The AI API key (`GEMINI_API_KEY`) is strictly maintained on the server within Firebase Cloud Functions and is never injected into frontend builds.
- **Data Minimization**: The AI backend only receives public listing metadata (title, category, location, date, status). User email addresses, phone numbers, and private recovery messages are never sent to the LLM.
- **Read-Only Chatbot Execution**: The AI assistant can only query and retrieve public item listings. It cannot modify documents, delete listings, or alter recovery claim statuses.
- **Rate Throttling & Input Validation**: Chat requests are restricted to 500 characters and rate-limited to prevent abuse.
- **`firestore.rules` & `storage.rules`**: Production-ready security rules enforce owner-only modification and prevent unauthorized reads on private user profiles.

---

## 📁 Project Architecture

```
Campusfind/
├── .env.example              # Template for Firebase and AI settings
├── firebase.json             # Hosting, Firestore, Storage & Functions configuration
├── firestore.rules           # Cloud Firestore security rules
├── firestore.indexes.json    # Firestore composite query indexes
├── storage.rules             # Firebase Storage security rules
├── tailwind.config.js        # Emerald theme & typography configuration
├── index.html                # Inter font and brand metadata
├── functions/                # Firebase Cloud Functions (Backend AI Assistant)
│   ├── package.json          # Server dependencies
│   └── index.js              # chatAssistant HTTPS endpoint with Gemini
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Route definitions & global providers (with Chatbot)
    ├── index.css             # Tailwind directives & base styling
    ├── components/
    │   ├── Chatbot.jsx       # Floating AI Assistant widget & modal
    │   ├── ChatMessage.jsx   # Bubble renderer with item cards & quick replies
    │   ├── Navbar.jsx        # Responsive navigation with mobile drawer
    │   ├── Footer.jsx        # Campus safety and resource footer
    │   ├── SearchBar.jsx     # Live search bar with instant clear
    │   ├── FilterBar.jsx     # Type tabs, categories, location & sort
    │   ├── ItemCard.jsx      # Card with photo, status badge & metadata
    │   ├── StatusBadge.jsx   # Lost / Found / Status pill tags
    │   ├── ReportItemForm.jsx# Validated report form with photo upload
    │   ├── EmptyState.jsx    # Clean no-results view with reset action
    │   ├── LoadingSpinner.jsx# Brand loading indicator
    │   ├── DemoBanner.jsx    # Environment notification banner
    │   └── ProtectedRoute.jsx# Auth route guard
    ├── pages/
    │   ├── Home.jsx          # Hero, live listings, How It Works, Trust & Safety
    │   ├── ItemDetails.jsx   # Detailed report view & recovery claim form
    │   ├── ReportItem.jsx    # Report page with auth guard
    │   ├── Dashboard.jsx     # Student listing manager & claim inbox
    │   ├── Login.jsx         # Email/password login with demo shortcut
    │   ├── Register.jsx      # Student registration form
    │   ├── ForgotPassword.jsx# Password recovery request page
    │   └── NotFound.jsx      # 404 page
    ├── context/
    │   └── AuthContext.jsx   # Authentication state management
    ├── services/
    │   ├── chatService.js    # AI endpoint handler & local fallback orchestrator
    │   ├── itemSearchService.js # NLP query parser & Firestore search engine
    │   ├── firebase.js       # Firebase SDK initialization & status detection
    │   ├── authService.js    # Auth methods (Firebase & Demo fallback)
    │   ├── itemService.js    # Firestore CRUD & Storage handling
    │   └── recoveryService.js# Private claims & recovery workflow
    ├── hooks/
    │   └── useAuth.js        # useAuth hook
    └── utils/
        ├── demoData.js       # High quality realistic campus dataset
        ├── formatDate.js     # Date & relative time formatters
        └── validation.js     # Input, image, and sensitive text validators
```

---

## 🧪 Testing & Verification

```bash
# Development server
npm run dev

# Production build (verified 0 errors)
npm run build

# Preview production build
npm run preview
```

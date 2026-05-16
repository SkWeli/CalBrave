# 🔥 CalBrave

> **Be brave. Track everything. Win.**

CalBrave is a full-stack gamified health and weight-tracking web application that turns daily health habits into a simple RPG-style experience. Users can securely sign in with **WSO2 Asgardeo**, complete onboarding, log weight, track meals, monitor water intake, complete daily quests, earn BlazePoints, level up, and view progress from a personalized dashboard.

---

## 🌟 Features

### 🔐 Secure Authentication with WSO2 Asgardeo

- Login and registration handled through WSO2 Asgardeo
- Secure OAuth 2.0 / OpenID Connect authentication flow
- JWT access tokens used to protect Express API routes
- New users are redirected to setup after first sign-in
- Existing users with completed profiles go directly to the dashboard
- Protected routes prevent unauthenticated access
- Logout redirects users safely back to the login page

### 👤 Smart Onboarding

- User profile setup after first sign-in
- Name, height, goal weight, and optional date of birth collection
- BMI calculation support
- Firestore profile stored under the authenticated Asgardeo user ID

### 🎮 Gamification

- **BlazePoints (BP)** for healthy actions
- Level and rank progression
- Daily quests
- Streak tracking
- Badges and milestone rewards
- Bonus points for completing all daily quests

### ⚖️ Weight Tracking

- Log daily weight
- View latest weight
- View weight history
- Weight trend chart
- One entry per date per user
- BlazePoints awarded for daily weight logging

### 🍽️ Meal & Calorie Tracking

- Search foods and nutrition data
- Sri Lankan custom food lookup support
- USDA food database fallback
- Log meals by type: breakfast, lunch, dinner, or snack
- Track daily total calories
- Compare calories against a daily target

### 💧 Water Tracking

- Log water glasses
- Track progress toward 8 glasses per day
- Earn BlazePoints for each glass
- Bonus reward when daily water goal is completed

### 📊 Dashboard

- Personalized greeting
- Current weight
- Goal weight
- Remaining weight to goal
- BMI overview
- BlazePoints and level card
- Daily quests
- Calorie tracker
- Water tracker
- Weight chart
- Weight history

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite |
| Backend | Node.js + Express.js |
| Authentication | WSO2 Asgardeo |
| Auth Protocols | OAuth 2.0 + OpenID Connect |
| Token Type | JWT Access Token |
| Database | Firebase Firestore |
| Backend Auth Verification | Asgardeo JWKS + `jose` |
| Charts | Recharts |
| Styling | CSS Modules |

---

## 🔐 Authentication Flow

CalBrave uses WSO2 Asgardeo for authentication.

### New User Flow

```txt
/login
↓
Click "Create New Account"
↓
Redirect to Asgardeo
↓
Register / sign in
↓
Redirect to /auth/callback
↓
App checks /api/users/profile
↓
No profile found
↓
Redirect to /setup
↓
Save profile
↓
Redirect to /dashboard
```

### Existing User Flow

```txt
/login
↓
Click "Continue to Secure Login"
↓
Redirect to Asgardeo
↓
Sign in
↓
Redirect to /auth/callback
↓
App checks /api/users/profile
↓
Profile exists
↓
Redirect to /dashboard
```

### Logout Flow

```txt
/dashboard or /setup
↓
Click Sign out
↓
Asgardeo session ends
↓
Redirect to /login
```

---

## 📁 Project Structure

```txt
calbrave/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BMIGauge.jsx
│   │   │   ├── BlazeStatsCard.jsx
│   │   │   ├── CalorieTracker.jsx
│   │   │   ├── DailyQuests.jsx
│   │   │   ├── LoadingScreen.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── WaterTracker.jsx
│   │   │   └── WeightChart.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── useAuth.js
│   │   ├── pages/
│   │   │   ├── AuthCallbackPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── SetupPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── userService.js
│   │   │   └── weightService.js
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env
│   ├── index.html
│   └── package.json
│
├── server/
│   ├── middleware/
│   │   └── verifyToken.js
│   ├── routes/
│   │   ├── gamificationRoutes.js
│   │   ├── mealRoutes.js
│   │   ├── userRoutes.js
│   │   └── weightRoutes.js
│   ├── firebase-admin.js
│   ├── index.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

```bash
node --version
npm --version
```

Recommended:

```txt
Node.js v18 or higher
npm v9 or higher
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/calbrave.git
cd calbrave
```

---

## 2. Asgardeo Setup

1. Go to the Asgardeo Console.
2. Create an organization.
3. Create a **Single Page Application**.
4. Copy the **Client ID**.
5. Configure the URLs below.

### Authorized Redirect URLs

```txt
http://localhost:5173
http://localhost:5173/login
http://localhost:5173/auth/callback
http://localhost:5173/setup
http://localhost:5173/dashboard
```

### Allowed Origin

```txt
http://localhost:5173
```

### Required Asgardeo Settings

```txt
Grant Types:
- Code
- Refresh Token

PKCE:
- Mandatory

Access Token Type:
- JWT

Self Registration:
- Enabled
```

---

## 3. Firebase Setup

1. Go to the Firebase Console.
2. Create a Firebase project.
3. Enable Firestore Database.
4. Generate a Firebase Admin service account key.
5. Add the required Firebase Admin credentials to the backend `.env`.

Firebase is used as the database. Authentication is handled by Asgardeo.

---

## 4. Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
ASGARDEO_BASE_URL=https://api.asgardeo.io/t/YOUR_ORG_NAME
USDA_API_KEY=your_usda_api_key

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

Start the backend:

```bash
npm run dev
```

Expected output:

```txt
Server running on http://localhost:5000
```

---

## 5. Frontend Setup

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_ASGARDEO_CLIENT_ID=your_asgardeo_client_id
VITE_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/YOUR_ORG_NAME
VITE_API_URL=http://localhost:5000

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Start the frontend:

```bash
npm run dev
```

Open:

```txt
http://localhost:5173
```

---

## 🧪 Testing Checklist

### Existing User with Profile

```txt
/login
↓
Continue to Secure Login
↓
Asgardeo sign in
↓
/auth/callback
↓
/dashboard
```

Expected:

```txt
/api/users/profile = 200
```

---

### Existing User without Profile

```txt
/login
↓
Continue to Secure Login
↓
Asgardeo sign in
↓
/auth/callback
↓
/setup
```

Expected:

```txt
/api/users/profile = 404
```

---

### New User

```txt
/login
↓
Create New Account
↓
Asgardeo Register
↓
Sign in
↓
/auth/callback
↓
/setup
↓
Save profile
↓
/dashboard
```

---

### Logout

```txt
/dashboard
↓
Sign out
↓
/login
```

---

### Protected Routes

When logged out:

```txt
/dashboard → /login
/setup → /login
```

When logged in:

```txt
/dashboard loads successfully
/setup loads for users who still need setup
```

---

## 🗃️ Firestore Data Structure

```txt
users/{asgardeoUserId}
  ├── weightLogs/{date}
  ├── mealLogs/{date}
  │     └── meals/{mealId}
  ├── dailyLogs/{date}
  └── badges/{badgeId}

foods/{foodName}
```

The Firestore user document ID is based on the Asgardeo user `sub` claim.

---

## 🔐 Backend Token Verification

The frontend sends the Asgardeo JWT access token to the Express backend:

```txt
Authorization: Bearer <access_token>
```

The backend verifies the token using Asgardeo JWKS:

```txt
https://api.asgardeo.io/t/YOUR_ORG_NAME/oauth2/jwks
```

After verification, the backend sets:

```js
req.user.uid = payload.sub;
```

This `uid` is used to read and write user-specific Firestore data.

---

## 🎖️ BlazePoints System

| Action | BP |
|---|---:|
| Log weight | +20 |
| Log meal | +15 |
| Each glass of water | +5 |
| Complete water goal | +30 |
| Complete all daily quests | +100 |
| First weight log milestone | +50 |
| First meal log milestone | +50 |
| 7-day streak bonus | +200 |

---

## 🏆 Level Progression

| Level | BP Required | Rank |
|---:|---:|---|
| 1 | 0 | 🌱 Beginner |
| 5 | 1,000 | 🚶 Active Starter |
| 10 | 4,000 | 💧 Hydration Hero |
| 15 | 9,000 | 🔥 Fat Burner |
| 20 | 16,000 | 💪 Wellness Warrior |
| 25 | 25,000 | ⭐ Health Champion |
| 30 | 40,000 | 🏆 BlazeElite |

## 🧩 Common Issues

### Redirect URI mismatch

Make sure this URL is added to Asgardeo authorized redirect URLs:

```txt
http://localhost:5173/auth/callback
```

---

### CORS error from Asgardeo

Make sure this is added as an allowed origin:

```txt
http://localhost:5173
```

---

### Backend returns 401

Check:

```txt
1. Asgardeo access token type is JWT, not opaque.
2. React is sending Authorization: Bearer <token>.
3. Backend ASGARDEO_BASE_URL matches frontend organization.
4. Express verifyToken.js is using Asgardeo JWKS.
```

---

### Logout OAuth error

Add this to Asgardeo authorized redirect URLs:

```txt
http://localhost:5173/login
```

## 📜 License

MIT License

---

## 👨‍💻 Author

Senuda Weliwatta

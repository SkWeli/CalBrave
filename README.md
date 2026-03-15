# 🔥 CalBrave

> **Be brave. Track everything. Win.**

CalBrave is a full-stack gamified health and weight loss tracker that turns your daily health habits into an RPG-style adventure. Log meals, track your weight, build streaks, earn VitaPoints (VP), level up, and unlock achievements on your journey to your goal body.

---

## 🌟 Features

### 🎮 Gamification
- **VitaPoints (VP)** — Earn points for every healthy action
- **Level & Rank System** — Progress from "Beginner" to "CalBrave Legend"
- **Daily Quests** — Fresh challenges every day (walk, hydrate, hit calorie target)
- **Achievements & Badges** — One-time milestone rewards
- **Streak Tracker** — Consecutive day logging streaks with bonuses
- **Weekly Boss Battle** — Hit your weekly weight target to defeat the boss

### 🍽️ Meal & Calorie Tracking
- Log Breakfast, Lunch, Dinner, and Snacks
- Per-meal calorie, protein, carbs, and fat breakdown
- Daily calorie target auto-calculated from your profile
- End-of-day calorie deficit score with VP reward/penalty
- Searchable food database with common foods

### ⚖️ Weight & Body Tracking
- Daily morning weight logging
- Waist measurement tracking (especially for overweight users)
- 30-day weight trend chart
- Progress: total lost, % of goal, average loss per week

### 💧 Habit Tracking
- Daily walk / exercise logging
- Water intake tracker (glass by glass)
- Sleep hours logger
- All habits tied to VP rewards

### 📊 Dashboard
- Calorie ring (eaten vs. target)
- Weight trend line chart
- Water intake progress
- Active quests with completion status
- Recent achievements feed
- Weekly boss progress bar

### 👤 Smart Onboarding
- BMI auto-calculation
- Daily calorie target via Mifflin-St Jeor formula
- Starting class assigned by BMI category:
  - BMI < 18.5 → 🌱 Seedling
  - BMI 18.5–24.9 → ⚔️ Guardian
  - BMI 25–29.9 → 🔥 Challenger
  - BMI 30+ → 🛡️ Titan

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite) + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google + Email) |
| Charts | Recharts |
| Hosting | Firebase Hosting |
| Storage | Firebase Storage (meal photos) |
| Notifications | Firebase Cloud Messaging (FCM) |

---

## 📁 Project Structure

```
calbrave/
├── client/                      # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/          # Shared UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── VPPopup.jsx
│   │   │   ├── LevelUpModal.jsx
│   │   │   └── AchievementToast.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── UserContext.jsx
│   │   ├── hooks/
│   │   │   ├── useWeightLog.js
│   │   │   ├── useMealLog.js
│   │   │   ├── useHabits.js
│   │   │   └── useAchievements.js
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── OnboardPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── MealLogPage.jsx
│   │   │   ├── HabitsPage.jsx
│   │   │   ├── ProgressPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── firebase.js          # Firebase client config
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                      # Node.js + Express backend
│   ├── routes/
│   │   ├── users.js
│   │   ├── weightLogs.js
│   │   ├── mealLogs.js
│   │   ├── habitLogs.js
│   │   ├── achievements.js
│   │   └── quests.js
│   ├── middleware/
│   │   └── verifyToken.js
│   ├── utils/
│   │   ├── vitapoints.js        # VP & level engine
│   │   ├── achievements.js      # Achievement engine
│   │   ├── calorieCalc.js       # BMR/TDEE calculator
│   │   └── questEngine.js       # Daily quest generator
│   ├── firebase-admin.js        # Firebase Admin SDK init
│   ├── index.js                 # Express entry point
│   ├── .env
│   └── package.json
│
├── firebase.json                # Firebase hosting config
├── .firebaserc
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

```bash
node --version    # v18.0.0 or higher
npm --version     # v9.0.0 or higher
```

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/calbrave.git
cd calbrave
```

### 2. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project named `calbrave`
3. Enable **Authentication** → Google + Email/Password
4. Enable **Firestore Database** → Start in test mode
5. Enable **Hosting**
6. Go to **Project Settings → Service Accounts** → Generate new private key (save JSON)
7. Go to **Project Settings → General** → Copy `firebaseConfig`

### 3. Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
FIREBASE_SERVICE_ACCOUNT=<paste your service account JSON as a single-line string>
```

Start the server:
```bash
npm run dev
```

### 4. Frontend Setup

```bash
cd ../client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_api_key
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

Open [http://localhost:5173](http://localhost:5173)

---

## 🗃️ Firestore Data Structure

```
users/{uid}
  ├── weightLogs/{date}
  ├── mealLogs/{date}
  │     └── meals/{mealId}
  ├── habitLogs/{date}
  ├── achievements/{achievementId}
  └── dailyQuests/{date}
```

---

## 🎖️ VitaPoints System

| Action | VP |
|---|---|
| Log morning weight | +20 |
| Log waist measurement | +25 |
| Log each meal | +15 |
| Each glass of water | +5 |
| 30+ min walk | +40 |
| Exercise session | +40 |
| Daily calorie deficit (200–800 kcal) | +80 |
| Complete all daily quests | +100 |
| 7-day streak bonus | +200 |

---

## 🏆 Level Progression

| Level | VP Required | Rank |
|---|---|---|
| 1 | 0 | 🌱 Beginner |
| 5 | 1,000 | 🚶 Active Starter |
| 10 | 4,000 | 💧 Hydration Hero |
| 15 | 9,000 | 🔥 Fat Burner |
| 20 | 16,000 | 💪 Wellness Warrior |
| 25 | 25,000 | ⭐ Health Champion |
| 30 | 40,000 | 🏆 CalBrave Legend |

---

## 🗺️ Roadmap

- [x] User onboarding with BMI calculation
- [x] Weight & waist logging
- [x] Meal logging with calorie tracking
- [x] Habit tracker (walk, water, sleep)
- [x] VitaPoints + level system
- [x] Daily quests
- [x] Achievements engine
- [ ] Social leaderboards
- [ ] AI meal photo scanner
- [ ] Wearable sync (Google Fit / Apple Health)
- [ ] Mobile app (React Native)
- [ ] Premium tier with advanced analytics

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📜 License

[MIT](LICENSE)

---

## 👨‍💻 Author

Built with 💪 by Senuda Weliwatta(https://github.com/SkWeli)

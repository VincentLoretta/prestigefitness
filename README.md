# 🏋️ Prestige Fitness

A gamified fitness & fasting tracker inspired by *Call of Duty’s prestige system*.  
Built with **React Native (Expo)** and **Appwrite Cloud**, this app helps users log workouts, meals, and weight loss progress — earning XP and streaks as they level up their fitness journey.

---

## 🚀 Features

- 🔐 **JWT-based Auth** — secure Appwrite authentication with automatic session restore  
- 🧮 **Recipe Builder** — add ingredients manually or via Nutritionix API and auto-calculate macros  
- 📈 **Progress Dashboard** — daily streaks, XP tracking, and weight history  
- 💾 **Offline-friendly** — local caching and restore on reconnect  
- ⚙️ **Cloud Database** — Appwrite backend handles users, recipes, and XP events  
- 📱 **Optimized for Android (APK)** — built with Expo EAS

---

## 🧠 Tech Stack

| Category | Technologies |
|-----------|---------------|
| **Frontend** | React Native · Expo Router · TypeScript |
| **Backend / Cloud** | Appwrite (Cloud DB + Auth + Functions) |
| **Auth** | JWT sessions with auto-refresh |
| **API** | Nutritionix (food macros lookup) |
| **Build Tools** | Expo EAS Build · Gradle · GitHub CI (optional) |

---

## ⚙️ Local Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/prestigefitness.git
cd prestigefitness

2️⃣ Install Dependencies
npm install
# or
yarn install

3️⃣ Create a .env file

Create a new .env (never commit this file):

EXPO_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
EXPO_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
EXPO_PUBLIC_APPWRITE_DB_ID="your_db_id"
EXPO_PUBLIC_COLL_RECIPES_ID="recipes"
# etc...


Use .env.example as a template — it shows all required keys without secrets.

4️⃣ Run the App
npm start


Then press a to open on Android, or scan the QR code in Expo Go.

🔒 Security Notes

.env is ignored by .gitignore.

Only non-sensitive collection IDs are public.

API keys (like Nutritionix) are stored locally and excluded from version control.

For production, use Appwrite Cloud Functions to proxy external APIs securely.

🧩 Build APK (Android)
eas build -p android --profile preview


Download and install the .apk from the build dashboard to test on device.

🧑‍💻 Author

Vincent Loretta


Fitness-focused developer building tools for consistency and progress.

⭐ Future Plans

Prestige XP system rework

Workout templates and community challenges

Daily check-ins with streak multipliers

Optional calorie goal tracking with AI recommendations


---

## 📌 How to use it
1. Copy everything above.  
2. Create a file called `README.md` inside your project root.  
3. Paste the content.  
4. Replace `<your-username>` with your actual GitHub handle.  
5. Optionally add screenshots or your YouTube/portfolio link at the bottom.  

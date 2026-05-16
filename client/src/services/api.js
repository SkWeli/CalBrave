import axios from "axios";

let accessTokenGetter = null;

/**
 * Called once from AuthContext so the interceptor can always reach the
 * current Asgardeo getAccessToken function without a stale closure.
 */
export function setAccessTokenGetter(getAccessToken) {
  accessTokenGetter = getAccessToken;
}

// Single Axios instance pointing at the Express backend
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`
});

// Attach the Asgardeo JWT to every outgoing request automatically
api.interceptors.request.use(
  async (config) => {
    if (accessTokenGetter) {
      try {
        const token = await accessTokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Could not retrieve access token:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Weight ────────────────────────────────────────────────────────────────

export const logWeight = async (weight, date) => {
  const res = await api.post("/weight/log", { weight, date });
  return res.data;
};

export const getWeightHistory = async () => {
  const res = await api.get("/weight/history");
  return res.data;
};

// ── Profile ───────────────────────────────────────────────────────────────

export const getProfile = async () => {
  const res = await api.get("/users/profile");
  return res.data;
};

export const saveProfile = async (profileData) => {
  const res = await api.post("/users/profile", profileData);
  return res.data;
};

// ── Gamification ──────────────────────────────────────────────────────────

export const getGamificationStatus = async () => {
  const res = await api.get("/gamification/status");
  return res.data;
};

export const logWaterGlass = async () => {
  const res = await api.post("/gamification/water");
  return res.data;
};

export const getBadges = async () => {
  const res = await api.get("/gamification/badges");
  return res.data;
};

// ── Quests ────────────────────────────────────────────────────────────────

export const getDailyQuests = async () => {
  const res = await api.get("/gamification/quests");
  return res.data;
};

// ── Meals ─────────────────────────────────────────────────────────────────

export const searchNutrition = async (query) => {
  const res = await api.get(`/meals/search?q=${encodeURIComponent(query)}`);
  return res.data;
};

export const logMeal = async (name, calories, mealType, date) => {
  const res = await api.post("/meals/log", { name, calories, mealType, date });
  return res.data;
};

export const getTodayMeals = async () => {
  const res = await api.get("/meals/today");
  return res.data;
};

export const deleteMeal = async (date, mealId) => {
  const res = await api.delete(`/meals/${date}/${mealId}`);
  return res.data;
};

export default api;
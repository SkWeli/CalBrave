import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import weightRoutes from "./routes/weightRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import mealRoutes from "./routes/mealRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://cal-brave.vercel.app"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "🔥 CalBrave API is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    auth: "asgardeo",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/users", userRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/meals", mealRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
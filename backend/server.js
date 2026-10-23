
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const notesRoutes = require("./routes/notes.routes");
const { authenticateToken } = require("./middleware/auth.middleware.js");
const { doubleCsrfProtection } = require("./middleware/csrf.middleware.js");
const csrfRoutes = require("./routes/csrf.routes");
const app = express();

// 1. Parse request bodies and cookies
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// 2. Configure allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin are allowed for tools and server-to-server calls.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  })
);

// 3. Authentication routes
app.use("/api/auth/register", registerRoutes);
app.use("/api/auth/login", loginRoutes);
app.use("/api/csrf", csrfRoutes);

// 4. Protected notes API
app.use("/api/notes", authenticateToken, doubleCsrfProtection, notesRoutes);

// 5. Health endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Secure Digital Locker API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// 6. Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VAULTIX API running on port ${PORT}`);
});

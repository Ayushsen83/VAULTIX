require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const notesRoutes = require("./routes/notes.routes");
const { authenticateToken } = require("./middleware/auth.middleware.js");
const { doubleCsrfProtection } = require("./middleware/csrf.middleware.js");
const csrfRoutes = require("./routes/csrf.routes");
const filesRoutes = require("./routes/files.routes");
const usersRoutes = require("./routes/users.routes");
const {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  uploadLimiter,
} = require("./middleware/rateLimit.middleware");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/issue.js");
const twoFactorRoutes = require("./routes/twoFactor.routes");
const {
  verifyTwoFactorLogin,
} = require("./controllers/twoFactor.controller");
const app = express();

// 1. Parse request bodies and cookies
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(helmet());
app.use(cors({
    origin: "*"
}));
// 2. Configure allowed frontend origins
// const allowedOrigins = [
//   "http://localhost:5173",
//   process.env.FRONTEND_URL,
// ].filter(Boolean);
// app.set("trust proxy", 1);
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Requests without Origin are allowed for tools and server-to-server calls.
//       if (!origin || allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(new Error("Origin not allowed by CORS"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "X-CSRF-Token"],
//   }),
// );
app.get("/debug/client-ip", (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
  });
});
// 3. Authentication routes
app.use("/api/auth/register", registerLimiter, registerRoutes);
app.use("/api/auth/login", loginLimiter, loginRoutes);
app.use("/api/csrf", generalLimiter, csrfRoutes);

// 4. Protected notes API
app.use(
  "/api/notes",
  generalLimiter,
  authenticateToken,
  doubleCsrfProtection,
  notesRoutes,
);

// 5. Protected files API
app.use("/api/files", generalLimiter, uploadLimiter, filesRoutes);

// 6. Protected users API
app.use("/api/users", generalLimiter, usersRoutes);

// 7. Health endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Secure Digital Locker API is running",
  });
});
// 8. Two-Factor Authentication endpoints

// Login-time 2FA verification.
// This endpoint does not require an existing authentication cookie.
app.post(
  "/api/auth/2fa/verify-login",
  loginLimiter,
  verifyTwoFactorLogin
);

// Account-settings 2FA routes remain protected.
app.use(
  "/api/auth/2fa",
  generalLimiter,
  twoFactorRoutes
);

// 9. Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});
// Return a consistent response for unmatched routes.
app.use(notFoundHandler);

// Handle errors passed through next(error).
app.use(errorHandler);
// 6. Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VAULTIX API running on port ${PORT}`);
});

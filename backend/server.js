
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const notesRoutes = require("./routes/notes.routes");
const { authenticateToken } = require("./middleware/auth.middleware");
const app = express();


const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header,
      // such as some server-to-server and local tools.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use("/api/auth/register", registerRoutes);
app.use("/api/auth/login", loginRoutes);
app.use("/api/notes", authenticateToken, notesRoutes);

// Test backend
app.get("/", (req, res) => {
  res.json({ message: "Secure Digital Locker API is running" });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});
// Test PostgreSQL connection
// app.get("/api/db-test", async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT current_database() AS database, NOW() AS server_time"
//     );

//     res.json({
//       message: "PostgreSQL connected successfully",
//       database: result.rows[0].database,
//       serverTime: result.rows[0].server_time,
//     });
//   } catch (error) {
//     console.error("Database test failed:", error.message);
//     res.status(500).json({
//       message: "Database connection failed",
//     });
//   }
// });
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth/register", registerRoutes);
app.use("/api/auth/login", loginRoutes);
// Test backend
app.get("/", (req, res) => {
  res.json({ message: "Secure Digital Locker API is running" });
});

// Test PostgreSQL connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    res.json({
      message: "PostgreSQL connected successfully",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Database test failed:", error.message);
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});
const { authenticateToken } = require("./middleware/auth.middleware");

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful.",
    user_id: req.user.user_id,
  });
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

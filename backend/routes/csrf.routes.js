const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  generateCsrfToken,
} = require("../middleware/csrf.middleware");

const router = express.Router();

router.get("/", authenticateToken, (req, res) => {
  const csrfToken = generateCsrfToken(req, res);

  res.set("Cache-Control", "no-store");

  return res.status(200).json({
    success: true,
    csrfToken,
  });
});

module.exports = router;
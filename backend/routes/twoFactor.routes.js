
const express = require("express");

const {
  setupTwoFactor,
  verifyTwoFactorSetup,
} = require("../controllers/twoFactor.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const {
  doubleCsrfProtection,
} = require("../middleware/csrf.middleware");

const router = express.Router();

// These routes are for users who are already authenticated.
router.use(authenticateToken);
router.use(doubleCsrfProtection);

// Authenticated account-settings 2FA routes.
router.post("/setup", setupTwoFactor);
router.post("/verify-setup", verifyTwoFactorSetup);

module.exports = router;

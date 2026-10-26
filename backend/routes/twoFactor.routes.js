const express = require("express");

const {
  setupTwoFactor,
  verifyTwoFactorSetup,
  verifyTwoFactorLogin,
} = require("../controllers/twoFactor.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { doubleCsrfProtection } = require("../middleware/csrf.middleware");

const router = express.Router();

// All enrollment endpoints require an authenticated session.
router.use(authenticateToken);
router.use(doubleCsrfProtection);

router.post("/setup", setupTwoFactor);
router.post("/verify-setup", verifyTwoFactorSetup);
router.post("/verify-login", verifyTwoFactorLogin);
module.exports = router;

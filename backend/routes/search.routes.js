
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/auth.middleware");

const {
  doubleCsrfProtection,
} = require("../middleware/csrf.middleware");
const {
  globalSearch,
} = require("../controllers/search.controller");
const {
  generalLimiter,
} = require("../middleware/rateLimit.middleware");
const router = express.Router();

router.use(authenticateToken);
router.use(doubleCsrfProtection);
router.use(generalLimiter);
router.get("/", globalSearch);

module.exports = router;

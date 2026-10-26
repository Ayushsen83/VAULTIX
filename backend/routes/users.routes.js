const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  doubleCsrfProtection,
} = require("../middleware/csrf.middleware");

const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
} = require("../controllers/users.controller");

const router = express.Router();

router.use(authenticateToken);
router.use(doubleCsrfProtection);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.patch("/me/password", changeMyPassword);
module.exports = router;
const express = require("express");

const { registerUser } = require("../controllers/register");

const {
  setupRegistrationTwoFactor,
  verifyRegistrationTwoFactor,
} = require("../controllers/registrationTwoFactor.controller");

const router = express.Router();

router.post("/", registerUser);

router.post(
  "/2fa/setup",
  setupRegistrationTwoFactor
);

router.post(
  "/2fa/verify",
  verifyRegistrationTwoFactor
);

module.exports = router;
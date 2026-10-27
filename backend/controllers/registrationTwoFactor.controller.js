const jwt = require("jsonwebtoken");
const { generateSecret, generateURI, verify } = require("otplib");
const QRCode = require("qrcode");

const pool = require("../db");
const {
  encryptTotpSecret,
  decryptTotpSecret,
} = require("../utils/totpEncryption");

const REGISTRATION_ISSUER = "vaultix-api";
const REGISTRATION_AUDIENCE = "vaultix-registration";

// Validate the restricted registration challenge.
// This token must never be accepted as a normal access token.
const verifyRegistrationToken = (registrationToken) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("JWT_SECRET is missing or too short.");
  }

  const decoded = jwt.verify(registrationToken, jwtSecret, {
    algorithms: ["HS256"],
    issuer: REGISTRATION_ISSUER,
    audience: REGISTRATION_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    decoded.purpose !== "registration_2fa" ||
    typeof decoded.sub !== "string" ||
    !/^[1-9]\d*$/.test(decoded.sub) ||
    !Number.isSafeInteger(Number(decoded.sub))
  ) {
    throw new Error("Invalid registration challenge.");
  }

  return decoded;
};

// POST /api/auth/register/2fa/setup
const setupRegistrationTwoFactor = async (req, res, next) => {
  try {
    const { registrationToken } = req.body ?? {};

    if (
      typeof registrationToken !== "string" ||
      registrationToken.length > 4096
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid registration token is required.",
      });
    }

    let challenge;

    try {
      challenge = verifyRegistrationToken(registrationToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Registration challenge expired or invalid. Please register again.",
      });
    }

    // Only a pending account without enabled 2FA can start enrollment.
    const result = await pool.query(
      `SELECT user_id, email, registration_status, totp_enabled
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [challenge.sub]
    );

    const user = result.rows[0];

    if (
      !user ||
      user.registration_status !== "pending" ||
      user.totp_enabled
    ) {
      return res.status(409).json({
        success: false,
        message: "This registration is no longer awaiting 2FA setup.",
      });
    }

    // Generate a fresh TOTP secret and provisioning URI.
    const secret = generateSecret();

    const uri = generateURI({
      issuer: "VAULTIX",
      label: user.email,
      secret,
    });

    const qrCode = await QRCode.toDataURL(uri);
    const encryptedSecret = encryptTotpSecret(secret);

    // Store the pending secret only if the account is still pending.
    const update = await pool.query(
      `UPDATE users
       SET totp_pending_secret_encrypted = $1
       WHERE user_id = $2
         AND registration_status = 'pending'
         AND totp_enabled = FALSE
       RETURNING user_id`,
      [encryptedSecret, challenge.sub]
    );

    if (update.rowCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "Registration state changed. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Scan the QR code with Google Authenticator, then verify the code.",
      qrCode,
      manualSetupKey: secret,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/auth/register/2fa/verify
const verifyRegistrationTwoFactor = async (req, res, next) => {
  try {
    const { registrationToken, token } = req.body ?? {};

    if (
      typeof registrationToken !== "string" ||
      registrationToken.length > 4096 ||
      typeof token !== "string" ||
      !/^\d{6}$/.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid registration token and six-digit code are required.",
      });
    }

    let challenge;

    try {
      challenge = verifyRegistrationToken(registrationToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Registration challenge expired or invalid. Please register again.",
      });
    }

    const result = await pool.query(
      `SELECT
         user_id,
         registration_status,
         totp_enabled,
         totp_pending_secret_encrypted
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [challenge.sub]
    );

    const user = result.rows[0];

    if (
      !user ||
      user.registration_status !== "pending" ||
      user.totp_enabled ||
      !user.totp_pending_secret_encrypted
    ) {
      return res.status(409).json({
        success: false,
        message: "Registration is not awaiting authenticator verification.",
      });
    }

    const encryptedPendingSecret = user.totp_pending_secret_encrypted;
    const secret = decryptTotpSecret(encryptedPendingSecret);

    const verification = await verify({
      secret,
      token,
    });

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired authenticator code.",
      });
    }

    // Activate registration and enable 2FA atomically.
    // The conditional update prevents activation if the state changed.
    const update = await pool.query(
      `UPDATE users
       SET registration_status = 'active',
           totp_enabled = TRUE,
           totp_secret_encrypted = totp_pending_secret_encrypted,
           totp_pending_secret_encrypted = NULL
       WHERE user_id = $1
         AND registration_status = 'pending'
         AND totp_enabled = FALSE
         AND totp_pending_secret_encrypted = $2
       RETURNING user_id`,
      [challenge.sub, encryptedPendingSecret]
    );

    if (update.rowCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "Registration state changed. Please try again.",
      });
    }

    // Do not issue an access cookie here.
    // The user must complete the normal login process.
    return res.status(200).json({
      success: true,
      registrationComplete: true,
      message: "Registration completed. You can now log in.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  setupRegistrationTwoFactor,
  verifyRegistrationTwoFactor,
};

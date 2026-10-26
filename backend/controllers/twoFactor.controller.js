const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const { generateSecret, generateURI, verify } = require("otplib");
const QRCode = require("qrcode");
const pool = require("../db");

const {
  encryptTotpSecret,
  decryptTotpSecret,
} = require("../utils/totpEncryption");

// POST /api/auth/2fa/setup
const setupTwoFactor = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await pool.query(
      `SELECT totp_enabled
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.totp_enabled) {
      return res.status(409).json({
        success: false,
        message: "Google Authenticator is already enabled.",
      });
    }

    const secret = generateSecret();

    const uri = generateURI({
      issuer: "VAULTIX",
      label: String(userId),
      secret,
    });

    const qrCode = await QRCode.toDataURL(uri);

    const encryptedPendingSecret = encryptTotpSecret(secret);

    await pool.query(
      `UPDATE users
       SET totp_pending_secret_encrypted = $1
       WHERE user_id = $2
         AND totp_enabled = FALSE`,
      [encryptedPendingSecret, userId]
    );

    // The secret is returned only during enrollment so that the user
    // can scan the QR code or enter the key manually.
    return res.status(200).json({
      success: true,
      message: "Scan the QR code with Google Authenticator, then verify the code.",
      qrCode,
      manualSetupKey: secret,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/2fa/verify-setup
const verifyTwoFactorSetup = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { token } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (
      typeof token !== "string" ||
      !/^\d{6,8}$/.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid authenticator code.",
      });
    }

    const result = await pool.query(
      `SELECT totp_enabled, totp_pending_secret_encrypted
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.totp_enabled) {
      return res.status(409).json({
        success: false,
        message: "Google Authenticator is already enabled.",
      });
    }

    if (!user.totp_pending_secret_encrypted) {
      return res.status(400).json({
        success: false,
        message: "Start Google Authenticator setup first.",
      });
    }

    const secret = decryptTotpSecret(
      user.totp_pending_secret_encrypted
    );

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

    // Activate only after successful verification.
    const updateResult = await pool.query(
      `UPDATE users
       SET totp_enabled = TRUE,
           totp_secret_encrypted = totp_pending_secret_encrypted,
           totp_pending_secret_encrypted = NULL
       WHERE user_id = $1
         AND totp_enabled = FALSE
         AND totp_pending_secret_encrypted = $2
       RETURNING user_id`,
      [userId, user.totp_pending_secret_encrypted]
    );

    if (updateResult.rowCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "Setup state changed. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Google Authenticator has been enabled.",
      totpEnabled: true,
    });
  } catch (error) {
    next(error);
  }
};
// POST /api/auth/2fa/verify-login
const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { challengeToken, token } = req.body ?? {};

    // 1. Validate the challenge and authenticator code
    if (
      typeof challengeToken !== "string" ||
      challengeToken.length > 4096 ||
      typeof token !== "string" ||
      !/^\d{6}$/.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid login challenge or authenticator code.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (
      !jwtSecret ||
      Buffer.byteLength(jwtSecret, "utf8") < 32
    ) {
      throw new Error("JWT_SECRET is missing or too short.");
    }

    // 2. Validate the restricted login challenge
    let challenge;

    try {
      challenge = jwt.verify(challengeToken, jwtSecret, {
        algorithms: ["HS256"],
        issuer: "vaultix-api",
        audience: "vaultix-2fa-challenge",
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Login challenge expired or invalid. Please log in again.",
      });
    }

    if (
      challenge.purpose !== "2fa_login" ||
      typeof challenge.sub !== "string" ||
      !/^[1-9]\d*$/.test(challenge.sub) ||
      !Number.isSafeInteger(challenge.ver) ||
      challenge.ver < 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid login challenge. Please log in again.",
      });
    }

    // 3. Reload current account state from PostgreSQL.
    // Never trust the challenge alone to determine whether 2FA is enabled.
    const result = await pool.query(
      `SELECT
         user_id,
         name,
         email,
         token_version,
         totp_enabled,
         totp_secret_encrypted
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [challenge.sub]
    );

    const user = result.rows[0];

    if (
      !user ||
      !user.totp_enabled ||
      user.totp_secret_encrypted == null ||
      Number(user.token_version) !== challenge.ver
    ) {
      return res.status(401).json({
        success: false,
        message: "Login challenge is no longer valid. Please log in again.",
      });
    }

    // 4. Decrypt the active TOTP secret
    const secret = decryptTotpSecret(
      user.totp_secret_encrypted
    );

    // 5. Verify the Google Authenticator code
    const verification = await verify({
      secret,
      token,
    });

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authenticator code.",
      });
    }

    // 6. Create the normal authenticated JWT only after both factors pass
    const accessToken = jwt.sign(
      {
        ver: Number(user.token_version),
        purpose: "access",
      },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: String(user.user_id),
        issuer: "vaultix-api",
        audience: "vaultix-client",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      }
    );

    // 7. Set the normal HttpOnly authentication cookie
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("vaultix_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    // 8. Return safe user information
    return res.status(200).json({
      success: true,
      requiresTwoFactor: false,
      message: "Login successful.",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  setupTwoFactor,
  verifyTwoFactorSetup,
  verifyTwoFactorLogin,
};


const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    // 1. Validate request data
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.trim().length > 255 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Find user, including registration and 2FA status
    const result = await pool.query(
      `SELECT
         user_id,
         name,
         email,
         password_hash,
         token_version,
         totp_enabled,
         registration_status
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    // Declare user BEFORE accessing its properties
    const user = result.rows[0];

    // 3. Verify credentials
    if (
      !user ||
      !(await argon2.verify(user.password_hash, password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 4. Reject accounts with incomplete registration
    if (user.registration_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Please complete registration and 2FA setup before logging in.",
      });
    }

    // 5. Validate JWT configuration
    const jwtSecret = process.env.JWT_SECRET;

    if (
      !jwtSecret ||
      Buffer.byteLength(jwtSecret, "utf8") < 32
    ) {
      throw new Error("JWT_SECRET is missing or too short.");
    }

    // 6. If 2FA is enabled, issue a restricted login challenge.
    // Do not issue the authenticated cookie before OTP verification.
    if (user.totp_enabled) {
      const challengeToken = jwt.sign(
        {
          ver: user.token_version,
          purpose: "2fa_login",
        },
        jwtSecret,
        {
          algorithm: "HS256",
          subject: String(user.user_id),
          issuer: "vaultix-api",
          audience: "vaultix-2fa-challenge",
          expiresIn: "5m",
        }
      );

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        challengeToken,
        message: "Enter your Google Authenticator code.",
      });
    }

    // 7. Normal login for active accounts without 2FA.
    // New registrations should have 2FA enabled before activation.
    const token = jwt.sign(
      {
        ver: user.token_version,
        purpose: "access",
      },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: String(user.user_id),
        issuer: "vaultix-api",
        audience: "vaultix-client",
        expiresIn: process.env.JWT_EXPIRES_IN ,
      }
    );

    // 8. Store authenticated JWT in an HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("vaultix_token", token, {
      httpOnly: true,
      secure: isProduction,
       sameSite:  "None",
      path: "/",
      maxAge: 170 * 60 * 1000,
    });

    // 9. Return safe user information
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
    return next(error);
  }
};

module.exports = { loginUser };


const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phonenumber, age } = req.body ?? {};

    // 1. Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Validate name and email
    if (normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must not exceed 100 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      normalizedEmail.length > 255 ||
      !emailRegex.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 3. Validate password
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 12 and 128 characters.",
      });
    }

    // 4. Validate optional phone number
    let phone = null;

    if (phonenumber !== undefined && phonenumber !== null) {
      if (
        typeof phonenumber !== "string" ||
        phonenumber.trim().length > 20
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number.",
        });
      }

      phone = phonenumber.trim() || null;
    }

    // 5. Validate optional age
    let userAge = null;

    if (age !== undefined && age !== null && age !== "") {
      userAge = Number(age);

      if (
        !Number.isInteger(userAge) ||
        userAge < 1 ||
        userAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message: "Age must be an integer between 1 and 120.",
        });
      }
    }

    // 6. Validate JWT configuration before creating the account
    const jwtSecret = process.env.JWT_SECRET;

    if (
      !jwtSecret ||
      Buffer.byteLength(jwtSecret, "utf8") < 32
    ) {
      throw new Error("JWT_SECRET is missing or too short.");
    }

    // 7. Hash password using Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    // 8. Create a pending account.
    // A unique constraint on users.email is still required.
    const result = await pool.query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         phonenumber,
         age,
         totp_enabled,
         totp_secret_encrypted,
         totp_pending_secret_encrypted,
         registration_status
       )
       VALUES ($1, $2, $3, $4, $5, FALSE, NULL, NULL, 'pending')
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id, name, email, phonenumber, age, created_at`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        phone,
        userAge,
      ]
    );

    if (result.rowCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = result.rows[0];

    // 9. Generate a short-lived registration challenge.
    // This token is NOT an authenticated access token.
    const registrationToken = jwt.sign(
      {
        purpose: "registration_2fa",
      },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: String(user.user_id),
        issuer: "vaultix-api",
        audience: "vaultix-registration",
        expiresIn: "10m",
      }
    );

    // 10. Return safe user data and registration challenge.
    // The frontend uses the challenge to request the QR code.
    return res.status(201).json({
      success: true,
      registrationPending: true,
      requiresTwoFactorSetup: true,
      message: "Account created. Complete two-factor authentication setup.",
      registrationToken,
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);
    return next(error);
  }
};

module.exports = { registerUser };

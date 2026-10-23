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

    // 2. Find the user
    const result = await pool.query(
      `SELECT user_id, name, email, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // 3. Verify password
    if (
      !user ||
      !(await argon2.verify(user.password_hash, password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 4. Validate JWT configuration
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
      throw new Error("JWT_SECRET is missing or too short.");
    }

    // 5. Generate JWT
    const token = jwt.sign({}, jwtSecret, {
      algorithm: "HS256",
      subject: String(user.user_id),
      issuer: "vaultix-api",
      audience: "vaultix-client",
      expiresIn: "15m",
    });

    // 6. Store JWT in an HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("vaultix_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    // 7. Return safe user information, never the JWT
    return res.status(200).json({
      success: true,
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

module.exports = { loginUser };
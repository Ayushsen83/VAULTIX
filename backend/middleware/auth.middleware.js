const jwt = require("jsonwebtoken");
const pool = require("../db");

const authenticateToken = async (req, res, next) => {
  const secret = process.env.JWT_SECRET;

  // 1. Check server configuration
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured correctly.",
    });
  }

  // 2. Read JWT from the HttpOnly cookie
  const token = req.cookies?.vaultix_token;

  if (typeof token !== "string" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  try {
    // 3. Verify JWT signature and required claims
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "vaultix-api",
      audience: "vaultix-client",
    });

    // 4. Validate JWT subject and token version
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub) ||
      !Number.isSafeInteger(Number(decoded.sub)) ||
      !Number.isInteger(decoded.ver) ||
      decoded.ver < 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // 5. Check the current token version in PostgreSQL
    const result = await pool.query(
      `SELECT token_version
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [decoded.sub]
    );

    const user = result.rows[0];

    if (!user || decoded.ver !== user.token_version) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    // 6. Attach authenticated user to the request
    req.user = {
      user_id: decoded.sub,
    };

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    // Database and unexpected errors go to centralized error handling.
    return next(error);
  }
};

module.exports = { authenticateToken };

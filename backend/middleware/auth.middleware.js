
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const secret = process.env.JWT_SECRET;

  // Check server configuration
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured correctly.",
    });
  }

  // Read JWT from the HttpOnly cookie
  const token = req.cookies?.vaultix_token;

  if (typeof token !== "string" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  try {
    // Verify JWT signature and required claims
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "vaultix-api",
      audience: "vaultix-client",
    });

    // Validate the JWT subject
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Attach authenticated user to the request
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

    return next(error);
  }
};

module.exports = { authenticateToken };

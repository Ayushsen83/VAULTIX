const { doubleCsrf } = require("csrf-csrf");

const csrfSecret = process.env.CSRF_SECRET;
const isProduction = process.env.NODE_ENV ;

if (!csrfSecret || Buffer.byteLength(csrfSecret, "utf8") < 32) {
  throw new Error("CSRF_SECRET must contain at least 32 bytes.");
}

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => csrfSecret,

  // Bind the CSRF token to the current JWT cookie.
  getSessionIdentifier: (req) => {
    const token = req.cookies?.vaultix_token;

    if (!token) {
      throw new Error("Authentication cookie is missing.");
    }

    return token;
  },

  cookieName: isProduction
    ? "__Host-vaultix-csrf"
    : "vaultix-csrf",

  cookieOptions: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "none",
    path: "/",
  },

  getCsrfTokenFromRequest: (req) =>
    req.headers["x-csrf-token"],

  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

module.exports = {
  generateCsrfToken,
  doubleCsrfProtection,
};

const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  doubleCsrfProtection,
} = require("../middleware/csrf.middleware");
const {
  generalLimiter,
  uploadLimiter,
} = require("../middleware/rateLimit.middleware");
const {
  upload,
  handleUploadError,
  createFile,
  listFiles,
  getFile,
  previewFile,
  downloadFile,
  deleteFile,
} = require("../controllers/files.controller");

const router = express.Router();
// Apply general rate limiting to all file routes.
router.use(generalLimiter);
// All document endpoints require authentication.
router.use(authenticateToken);

// GET requests are exempt from CSRF by the configured middleware.
// Mutating requests must include a valid X-CSRF-Token.
router.use(doubleCsrfProtection);

router.get("/", listFiles);
router.get("/:id", getFile);
router.get("/:id/preview", previewFile);
router.get("/:id/download", downloadFile);

// Apply CSRF protection before Multer buffers the upload.
router.post("/", upload.single("file"),uploadLimiter,  handleUploadError,createFile);
router.delete("/:id", deleteFile);

module.exports = router;


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

router.use(generalLimiter);
router.use(authenticateToken);
router.use(doubleCsrfProtection);

// GET routes
router.get("/", listFiles);
router.get("/:id", getFile);
router.get("/:id/preview", previewFile);
router.get("/:id/download", downloadFile);

// Upload route
router.post(
  "/",
  uploadLimiter,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }

      next();
    });
  },
  createFile
);

// Delete route
router.delete("/:id", deleteFile);

module.exports = router;

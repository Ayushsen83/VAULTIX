
const { randomUUID } = require("crypto");
const path = require("path");
const multer = require("multer");
const pool = require("../db");
const storage = require("../services/storage.service");


const ALLOWED_TYPES = {
  ".pdf": {
    mimeType: "application/pdf",
    maxSize: 50 * 1024 * 1024,
    detectedMime: "application/pdf",
  },
  ".mp3": {
    mimeType: "audio/mpeg",
    maxSize: 10 * 1024 * 1024,
    detectedMime: "audio/mpeg",
  },
  ".wav": {
    mimeType: "audio/wav",
    maxSize: 10 * 1024 * 1024,
    detectedMime: "audio/wav",
  },
  ".m4a": {
    mimeType: "audio/mp4",
    maxSize: 10 * 1024 * 1024,
    detectedMime: "audio/mp4",
  },
};

async function validateUploadedFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return { valid: false, message: "No valid file was uploaded." };
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const config = ALLOWED_TYPES[ext];

  if (!config) {
    return { valid: false, message: "File extension is not supported." };
  }

  if (file.size <= 0 || file.size > config.maxSize) {
    return { valid: false, message: "File size is outside the allowed limit." };
  }

  if (file.mimetype !== config.mimeType) {
    return { valid: false, message: "File MIME type does not match the extension." };
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(file.buffer);

  if (ext === ".pdf") {
    // PDF signatures begin with %PDF-
    const header = file.buffer.subarray(0, 1024).toString("latin1");

    if (!header.includes("%PDF-")) {
      return { valid: false, message: "The file is not a valid PDF." };
    }
  } else if (ext === ".mp3") {
    if (!detected || detected.mime !== "audio/mpeg") {
      return { valid: false, message: "The file is not a valid MP3." };
    }
  } else if (ext === ".wav") {
    if (!detected || detected.mime !== "audio/wav") {
      return { valid: false, message: "The file is not a valid WAV." };
    }
  } else if (ext === ".m4a") {
    if (!detected || detected.mime !== "audio/mp4") {
      return { valid: false, message: "The file is not a valid M4A audio file." };
    }
  }

  return {
    valid: true,
    ext,
    mimeType: config.mimeType,
    maxSize: config.maxSize,
  };
}

// Upload limits
const PDF_MAX_SIZE = 50 * 1024 * 1024;
const AUDIO_MAX_SIZE = 10 * 1024 * 1024;
const USER_QUOTA = 100 * 1024 * 1024;

// const ALLOWED_TYPES = {
//   ".pdf": ["application/pdf", PDF_MAX_SIZE],
//   ".mp3": ["audio/mpeg", AUDIO_MAX_SIZE],
//   ".wav": ["audio/wav", AUDIO_MAX_SIZE],
//   ".m4a": ["audio/mp4", AUDIO_MAX_SIZE],
// };


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 12,
  },
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const config = ALLOWED_TYPES[ext];

    if (!config) {
      return callback(new Error("Unsupported file extension."));
    }

    if (file.mimetype !== config.mimeType) {
      return callback(new Error("File MIME type does not match extension."));
    }

    // Store the per-type maximum for validation after upload.
    req.maxAllowedFileSize = config.maxSize;
    callback(null, true);
  },
});





function validId(id) {
  return typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err.code, err.message);

    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File exceeds the maximum upload size."
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? 'Unexpected file field. Use the field name "file".'
          : "Invalid upload request.";

    return res.status(400).json({
      success: false,
      message,
      code: err.code,
    });
  }

  if (err) {
    console.error("Upload middleware error:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return next();
}

// POST /api/files
async function createFile(req, res, next) {
  let storageKey;

  try {
    const userId = req.user.user_id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Select a file to upload.",
      });
    }

    
const validation = await validateUploadedFile(file);

if (!validation.valid) {
  return res.status(400).json({
    success: false,
    message: validation.message,
  });
}

const { ext, mimeType, maxSize } = validation;
  

    const quotaResult = await pool.query(
      `SELECT COALESCE(SUM(size_bytes), 0) AS used_bytes
       FROM files
       WHERE user_id = $1`,
      [userId]
    );

    const usedBytes = Number(quotaResult.rows[0].used_bytes);

    if (usedBytes + file.size > USER_QUOTA) {
      return res.status(413).json({
        success: false,
        message: "Your 100 MB storage quota would be exceeded.",
      });
    }

    storageKey = `${userId}/${randomUUID()}${ext}`;

await storage.uploadFile({
  key: storageKey,
  buffer: file.buffer,
  contentType: mimeType,
});

    const result = await pool.query(
      `INSERT INTO files
         (user_id, file_name, storage_key, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, file_name, mime_type, size_bytes, created_at`,
      [userId, file.originalname, storageKey, mimeType, file.size]
    );

    return res.status(201).json({
      success: true,
      file: result.rows[0],
    });
  } catch (error) {
    // If metadata creation fails, attempt to remove the uploaded object.
    if (storageKey) {
      try {
        await storage.deleteFile(storageKey);
      } catch (cleanupError) {
        console.error("Object cleanup failed:", cleanupError.message);
      }
    }

    return next(error);
  }
}

// GET /api/files
async function listFiles(req, res, next) {
  try {
    const userId = req.user.user_id;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type = req.query.type;
    const sort = req.query.sort || "created_at";
    const order = req.query.order === "asc" ? "ASC" : "DESC";
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const sortColumns = {
      file_name: "file_name",
      created_at: "created_at",
      size_bytes: "size_bytes",
    };

    if (!sortColumns[sort]) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort field.",
      });
    }

    if (type && !["pdf", "audio"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type filter.",
      });
    }

    const conditions = ["user_id = $1"];
    const params = [userId];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`file_name ILIKE $${params.length}`);
    }

    if (type === "pdf") {
      conditions.push("mime_type = 'application/pdf'");
    } else if (type === "audio") {
      conditions.push("mime_type LIKE 'audio/%'");
    }

    const where = conditions.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM files WHERE ${where}`,
      params
    );

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT id, file_name, mime_type, size_bytes, created_at
       FROM files
       WHERE ${where}
       ORDER BY ${sortColumns[sort]} ${order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      success: true,
      files: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/files/:id
async function getFile(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const result = await pool.query(
      `SELECT id, file_name, mime_type, size_bytes, created_at
       FROM files
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.user_id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    return res.json({ success: true, file: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function streamFile(req, res, next, disposition) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const result = await pool.query(
      `SELECT file_name, storage_key, mime_type, size_bytes
       FROM files
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.user_id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const file = result.rows[0];
    const object = await storage.downloadFile(file.storage_key);

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Length", String(file.size_bytes));
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");

    if (!object.Body) {
      return res.status(502).json({
        success: false,
        message: "Unable to retrieve file contents.",
      });
    }

    object.Body.on("error", next);
    object.Body.pipe(res);
  } catch (error) {
    return next(error);
  }
}

// GET /api/files/:id/preview
function previewFile(req, res, next) {
  return streamFile(req, res, next, "inline");
}

// GET /api/files/:id/download
function downloadFile(req, res, next) {
  return streamFile(req, res, next, "attachment");
}

// DELETE /api/files/:id
async function deleteFile(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const result = await pool.query(
      `SELECT storage_key FROM files
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.user_id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const storageKey = result.rows[0].storage_key;

    // Remove the object before deleting its metadata.
    await storage.deleteFile(storageKey);

    await pool.query(
      "DELETE FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      message: "File deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upload,
  handleUploadError,
  createFile,
  listFiles,
  getFile,
  previewFile,
  downloadFile,
  deleteFile,
};

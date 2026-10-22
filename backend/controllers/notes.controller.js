
const pool = require("../db");

// Validate a PostgreSQL BIGINT ID without converting it to a JS number
const isValidId = (id) =>
  typeof id === "string" &&
  /^[1-9]\d{0,18}$/.test(id) &&
  BigInt(id) <= 9223372036854775807n;

// POST /api/notes
const createNote = async (req, res, next) => {
  try {
    const { title, content = "" } = req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 255
    ) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must not exceed 255 characters.",
      });
    }

    if (typeof content !== "string") {
      return res.status(400).json({
        success: false,
        message: "Note content must be text.",
      });
    }

    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, created_at, updated_at`,
      [req.user.user_id, title.trim(), content]
    );

    return res.status(201).json({
      success: true,
      message: "Note created successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notes?q=keyword&sort=updated_at&order=desc
const getNotes = async (req, res, next) => {
  try {
    const q = req.query.q ?? "";
    const sort = req.query.sort ?? "updated_at";
    const order = req.query.order ?? "desc";

    if (
      typeof q !== "string" ||
      q.length > 200 ||
      !["created_at", "updated_at"].includes(sort) ||
      !["asc", "desc"].includes(order)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid search or sorting parameters.",
      });
    }

    // sort and order are selected from allowlists, not user SQL input
    const result = await pool.query(
      `SELECT id, title, content, created_at, updated_at
       FROM notes
       WHERE user_id = $1
         AND (
           title ILIKE $2
           OR content ILIKE $2
         )
       ORDER BY ${sort} ${order.toUpperCase()}, id DESC`,
      [req.user.user_id, `%${q}%`]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      notes: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notes/:id
const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    const result = await pool.query(
      `SELECT id, title, content, created_at, updated_at
       FROM notes
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      note: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/notes/:id
const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body ?? {};

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    if (title === undefined && content === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide a title or content to update.",
      });
    }

    if (
      title !== undefined &&
      (typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 255)
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must be non-empty and at most 255 characters.",
      });
    }

    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({
        success: false,
        message: "Note content must be text.",
      });
    }

    const result = await pool.query(
      `UPDATE notes
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, content, created_at, updated_at`,
      [
        title === undefined ? null : title.trim(),
        content === undefined ? null : content,
        id,
        req.user.user_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notes/:id
const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM notes
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully.",
      id: result.rows[0].id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};

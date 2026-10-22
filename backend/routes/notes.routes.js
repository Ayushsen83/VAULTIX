
const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");

const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../controllers/notes.controller");

const router = express.Router();

// All routes below require a valid JWT
router.use(authenticateToken);

router.post("/", createNote);
router.get("/", getNotes);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;

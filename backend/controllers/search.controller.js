
const pool = require("../db");
const { decryptNote } = require("../utils/notesEncryption");

const createSnippet = (text, keyword, maxLength = 120) => {
  const lowerText = text.toLocaleLowerCase();
  const index = lowerText.indexOf(keyword.toLocaleLowerCase());

  if (index === -1) {
    return text.slice(0, maxLength);
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, start + maxLength);

  return (
    (start > 0 ? "..." : "") +
    text.slice(start, end) +
    (end < text.length ? "..." : "")
  );
};

// GET /api/search?q=project&type=all&page=1&limit=10
const globalSearch = async (req, res, next) => {
  try {
    const {
      q,
      type = "all",
      page = "1",
      limit = "10",
    } = req.query;

    // Validate keyword
    if (
      typeof q !== "string" ||
      !q.trim() ||
      q.trim().length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid search keyword.",
      });
    }

    // Validate search type
    if (!["all", "notes", "documents"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid search type.",
      });
    }

    const currentPage = Number(page);
    const pageLimit = Number(limit);

    if (
      !Number.isSafeInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isSafeInteger(pageLimit) ||
      pageLimit < 1 ||
      pageLimit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    const keyword = q.trim();
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const userId = req.user.user_id;

    let results = [];

    // --------------------------------
    // 1. Search encrypted notes
    // --------------------------------
    if (type === "all" || type === "notes") {
      const notesResult = await pool.query(
        `SELECT id, title, content, created_at, updated_at
         FROM notes
         WHERE user_id = $1`,
        [userId]
      );

      const decryptedNotes = notesResult.rows.map(decryptNote);

      const matchingNotes = decryptedNotes
        .filter((note) => {
          const title = note.title.toLocaleLowerCase();
          const content = note.content.toLocaleLowerCase();

          return (
            title.includes(normalizedKeyword) ||
            content.includes(normalizedKeyword)
          );
        })
        .map((note) => {
          const titleMatches = note.title
            .toLocaleLowerCase()
            .includes(normalizedKeyword);

          const snippetSource = titleMatches
            ? note.title
            : note.content;

          return {
            id: String(note.id),
            type: "note",
            title: note.title,
            snippet: createSnippet(
              snippetSource,
              keyword
            ),
            createdAt: note.created_at,
            updatedAt: note.updated_at,
            sortDate: note.updated_at || note.created_at,
          };
        });

      results.push(...matchingNotes);
    }

    // --------------------------------
    // 2. Search documents
    // --------------------------------
    if (type === "all" || type === "documents") {
      const filesResult = await pool.query(
        `SELECT id, file_name, mime_type, created_at
         FROM files
         WHERE user_id = $1
         AND file_name ILIKE $2
         ORDER BY created_at DESC`,
        [userId, `%${keyword}%`]
      );

      const matchingDocuments = filesResult.rows.map((file) => ({
        id: file.id,
        type: "document",
        title: file.file_name,
        mimeType: file.mime_type,
        createdAt: file.created_at,
        updatedAt: file.created_at,
        sortDate: file.created_at,
      }));

      results.push(...matchingDocuments);
    }

    // --------------------------------
    // 3. Combine and sort
    // --------------------------------
    results.sort((a, b) => {
      return (
        new Date(b.sortDate).getTime() -
        new Date(a.sortDate).getTime()
      );
    });

    // --------------------------------
    // 4. Combined pagination
    // --------------------------------
    const total = results.length;
    const totalPages = Math.ceil(total / pageLimit);
    const offset = (currentPage - 1) * pageLimit;

    const paginatedResults = results
      .slice(offset, offset + pageLimit)
      .map(({ sortDate, ...item }) => item);

    return res.status(200).json({
      success: true,
      query: keyword,
      type,
      results: paginatedResults,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { globalSearch };

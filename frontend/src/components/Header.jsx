

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { refreshCsrfToken } from "../services/api";
import "./Header.css";

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export default function Header({
  userName = "",
  searchPlaceholder = "Search notes and documents...",
  searchValue = "",
  onSearchChange,
  showSearch = true,
}) {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const [accountName, setAccountName] = useState(userName);
  const [query, setQuery] = useState(searchValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Note editor states
  const [activeNote, setActiveNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    if (userName) setAccountName(userName);
  }, [userName]);

  useEffect(() => {
    if (userName) return;

    let active = true;

    api.get("/users/me")
      .then((response) => {
        const name = response.data?.user?.name;
        if (active && name) setAccountName(name);
      })
      .catch((error) =>
        console.error("Unable to load header profile:", error)
      );

    return () => {
      active = false;
    };
  }, [userName]);

  useEffect(() => setQuery(searchValue), [searchValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        showSearch
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setShowResults(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);

    return () =>
      window.removeEventListener("keydown", handleShortcut);
  }, [showSearch]);

  // Search starts from one character
  useEffect(() => {
    const keyword = query.trim();

    if (!showSearch || !keyword) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    let active = true;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError("");

        const response = await api.get("/search", {
          params: {
            q: keyword,
            type: "all",
            page: 1,
            limit: 10,
          },
          signal: controller.signal,
        });

        if (active) {
          setResults(response.data?.results || []);
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;

        console.error("Search error:", error);
        setResults([]);

        setSearchError(
          error.response?.data?.message ||
            "Unable to search right now. Please try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, showSearch]);

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setQuery(value);
    setShowResults(true);
    onSearchChange?.(value);
  };

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setSearchError("");
    setLoading(false);
    setShowResults(false);
    onSearchChange?.("");

    searchInputRef.current?.focus();
  };

  // Existing PDF/audio new-tab functionality — unchanged
  const openDocumentInNewTab = async (result) => {
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      window.alert("Please allow pop-ups to open this document.");
      return;
    }

    newTab.opener = null;
    newTab.document.title = result.title || "VAULTIX document";

    newTab.document.body.innerHTML =
      "<p style='font-family:Arial,sans-serif;padding:24px;color:#765039'>Opening your secure document...</p>";

    try {
      const response = await api.get(
        `/files/${encodeURIComponent(result.id)}/preview`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: result.mimeType || response.data.type || "application/pdf",
      });

      const blobUrl = URL.createObjectURL(blob);
      newTab.location.replace(blobUrl);

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (error) {
      console.error("Unable to open search document:", error);
      newTab.close();

      window.alert(
        error.response?.data?.message ||
          "Unable to open this document. Please try again."
      );
    }
  };

  // Open actual saved note
 // Open note only after its actual data has been fetched
const openNote = async (result) => {
  setShowResults(false);
  setNoteError("");

  try {
    const response = await api.get(
      `/notes/${encodeURIComponent(result.id)}`
    );

    const note = response.data?.note;

    if (!note) {
      throw new Error("Unable to load the selected note.");
    }

    // Set actual note data first
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");

    // Open modal only after data is ready
    setActiveNote(note);

  } catch (error) {
    console.error("Unable to open note:", error);

    window.alert(
      error.response?.data?.message ||
      error.message ||
      "Unable to open this note. Please try again."
    );
  }
};

  // Close note editor
  const closeNote = () => {
    if (noteSaving) return;

    setActiveNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteError("");
  };

  // Same update flow as Notes.jsx
  const updateNote = async (event) => {
    event.preventDefault();

    if (!noteTitle.trim()) {
      setNoteError("Please enter a note title.");
      return;
    }

    if (noteTitle.trim().length > 255) {
      setNoteError("Note title cannot exceed 255 characters.");
      return;
    }

    try {
      setNoteSaving(true);
      setNoteError("");

      const token = await refreshCsrfToken();

      if (!token) {
        throw new Error(
          "Could not obtain a security token. Please try again."
        );
      }

      const response = await api.put(
        `/notes/${encodeURIComponent(activeNote.id)}`,
        {
          title: noteTitle.trim(),
          content: noteContent,
        }
      );

      const updatedNote = response.data?.note;

      // Update the visible search result
      setResults((previous) =>
        previous.map((item) =>
          item.type === "note" &&
          String(item.id) === String(activeNote.id)
            ? {
                ...item,
                title: updatedNote?.title || noteTitle.trim(),
                snippet: updatedNote?.content || noteContent,
              }
            : item
        )
      );

      // Close after successful update, like Notes.jsx
      setActiveNote(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteError("");
    } catch (error) {
      console.error("Update note error:", error);

      setNoteError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update note. Please try again."
      );
    } finally {
      setNoteSaving(false);
    }
  };

  // Escape key and background scroll while editor is open
  useEffect(() => {
    if (!activeNote) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !noteSaving) {
        closeNote();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeNote, noteSaving]);

  // Result click: only note behavior is changed
  const handleResultClick = (result) => {
    setShowResults(false);

    if (result.type === "note") {
      openNote(result);
      return;
    }

    if (result.type === "document") {
      if (
        result.mimeType === "application/pdf" ||
        result.mimeType?.startsWith("audio/")
      ) {
        openDocumentInNewTab(result);
      } else {
        navigate("/documents", {
          state: {
            selectedResult: result,
          },
        });
      }
    }
  };

  const initial =
    accountName
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <>
      <header className="header">
        {showSearch && (
          <div
            className="header-search-wrapper"
            ref={searchWrapperRef}
          >
            <div
              className={`header-search ${
                showResults && query.trim() ? "is-open" : ""
              }`}
            >
              <span className="header-search-icon" aria-hidden="true">
                ⌕
              </span>

              <input
                ref={searchInputRef}
                id="global-search"
                name="globalSearch"
                type="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={handleSearchChange}
                onFocus={() => setShowResults(true)}
                onKeyDown={(event) =>
                  event.key === "Escape" && setShowResults(false)
                }
                aria-label={searchPlaceholder}
                aria-expanded={showResults}
                aria-controls="global-search-dropdown"
                autoComplete="off"
              />

              {loading && (
                <span
                  className="header-search-loader"
                  aria-label="Searching"
                />
              )}

              {query.length > 0 && (
                <button
                  type="button"
                  className="header-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {showResults && query.trim().length > 0 && (
              <div
                className="global-search-dropdown"
                id="global-search-dropdown"
              >
                <div className="global-search-heading">
                  <span>SEARCH RESULTS</span>
                  <span>
                    {loading ? "Searching..." : `${results.length} found`}
                  </span>
                </div>

                {loading && (
                  <div className="global-search-message">
                    Searching your Notes and Documents...
                  </div>
                )}

                {!loading && searchError && (
                  <div className="global-search-message global-search-error">
                    {searchError}
                  </div>
                )}

                {!loading && !searchError && results.length === 0 && (
                  <div className="global-search-message">
                    No matching Notes or Documents found.
                  </div>
                )}

                {!loading &&
                  !searchError &&
                  results.map((result) => {
                    const isNote = result.type === "note";

                    return (
                      <button
                        type="button"
                        className={`global-search-result ${
                          isNote ? "note-result" : "document-result"
                        }`}
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        title={result.title}
                      >
                        <span
                          className={`global-search-result-icon ${
                            isNote ? "note-icon" : "pdf-icon"
                          }`}
                        >
                          {isNote ? (
                            <span aria-hidden="true">✎</span>
                          ) : (
                            <span>PDF</span>
                          )}
                        </span>

                        <span className="global-search-result-content">
                          <span className="global-search-result-title">
                            {result.title || "Untitled"}
                          </span>

                          <span className="global-search-result-snippet">
                            {isNote
                              ? result.snippet || "Note"
                              : `PDF${
                                  formatFileSize(result.sizeBytes)
                                    ? ` · ${formatFileSize(result.sizeBytes)}`
                                    : ""
                                }`}
                          </span>
                        </span>

                        <span
                          className="global-search-result-arrow"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        <div className="header-actions">
          <span
            className="header-notification"
            role="img"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </span>

          <button
            type="button"
            className="header-avatar"
            onClick={() => navigate("/profile")}
            aria-label={`Open profile for ${accountName || "user"}`}
            title="View profile"
          >
            {initial}
          </button>
        </div>
      </header>

      {/* HOME SEARCH — ACTUAL EDIT NOTE MODAL */}
      {activeNote && (
        <div
          className="home-note-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNote();
            }
          }}
        >
          <section
            className="home-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-note-modal-title"
          >
            <div className="home-note-modal-heading">
              <div>
                <span>YOUR PERSONAL SPACE</span>
                <h2 id="home-note-modal-title">Edit Note</h2>
              </div>

              <button
                type="button"
                className="home-note-modal-close"
                onClick={closeNote}
                disabled={noteSaving}
                aria-label="Close note"
              >
                ×
              </button>
            </div>

           <form onSubmit={updateNote}>
                <label htmlFor="home-note-title">
                  Note Title
                </label>

                <input
                  id="home-note-title"
                  type="text"
                  placeholder="Enter your note title..."
                  value={noteTitle}
                  maxLength={255}
                  onChange={(event) => {
                    setNoteTitle(event.target.value);
                    setNoteError("");
                  }}
                  required
                />

                <label htmlFor="home-note-content">
                  Note Content
                </label>

                <textarea
                  id="home-note-content"
                  placeholder="Write your thoughts here..."
                  value={noteContent}
                  onChange={(event) => {
                    setNoteContent(event.target.value);
                    setNoteError("");
                  }}
                  rows="8"
                />

                {noteError && (
                  <p className="home-note-modal-error">
                    {noteError}
                  </p>
                )}

                <div className="home-note-modal-footer">
                  <button
                    type="button"
                    className="home-note-cancel"
                    onClick={closeNote}
                    disabled={noteSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="home-note-update"
                    disabled={noteSaving}
                  >
                    {noteSaving ? "Updating..." : "Update Note"}
                  </button>
                </div>
              </form>
          
          </section>
        </div>
      )}
    </>
  );
}

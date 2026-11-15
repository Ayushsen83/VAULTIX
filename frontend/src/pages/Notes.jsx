import React, { useEffect, useRef, useState } from "react";
import api, { refreshCsrfToken } from "../services/api";
import "./Notes.css";
import NotesSkeleton from "../components/skeletons/NotesSkeleton";

const colors = ["yellow", "pink", "blue", "green", "purple"];

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
};

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Search dropdown
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get("/users/me");
        const user = response.data?.user;

        if (user?.name) {
          setUserName(user.name);
        }
      } catch (error) {
        console.error("Unable to fetch user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const requireCsrfToken = async () => {
    const token = await refreshCsrfToken();

    if (!token) {
      throw new Error("Could not obtain a security token. Please try again.");
    }

    return token;
  };

  // Fetch only Notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notes", {
        params: {
          q: search,
          sort,
          order: "desc",
        },
      });

      setNotes(response.data.notes || []);
    } catch (err) {
      console.error("Fetch notes error:", err);

      if (err.response?.status === 401) {
        setError("Your session is missing or expired. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load notes. Please try again."
        );
      }

      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Small delay while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, sort]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close dropdown using Escape
  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setShowSearchResults(false);
    }

    if (event.key === "Enter" && notes.length > 0) {
      openEditNote(notes[0]);
    }
  };

  const openNewNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setShowEditor(true);
    setShowSearchResults(false);
  };

  // Open selected search result in Edit modal
  const openEditNote = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || "");
    setShowEditor(true);
    setShowSearchResults(false);
  };

  const saveNote = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a note title.");
      return;
    }

    try {
      setSaving(true);

      await requireCsrfToken();

      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, {
          title: title.trim(),
          content,
        });
      } else {
        await api.post("/notes", {
          title: title.trim(),
          content,
        });
      }

      setShowEditor(false);
      setTitle("");
      setContent("");
      setEditingNote(null);

      await fetchNotes();
    } catch (err) {
      console.error("Save note error:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong while saving your note."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) return;

    try {
      await requireCsrfToken();

      await api.delete(`/notes/${id}`);

      await fetchNotes();
    } catch (err) {
      console.error("Delete note error:", err);

      alert(
        err.response?.data?.message || err.message || "Unable to delete note."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="notes-layout">
      <main className="notes-main">
        {/* HEADER */}
        <header className="notes-header">
          <div className="notes-search-wrapper" ref={searchRef}>
            <div className="notes-search">
              <span>⌕</span>

              <input
                id="notes-search"
                name="notesSearch"
                type="text"
                placeholder="Search your notes..."
                value={search}
                autoComplete="off"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => {
                  if (search.trim()) {
                    setShowSearchResults(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
              />

              {search && (
                <button
                  type="button"
                  className="notes-search-clear"
                  onClick={() => {
                    setSearch("");
                    setShowSearchResults(false);
                    document.getElementById("notes-search")?.focus();
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            {showSearchResults && search.trim() && (
              <div className="notes-search-dropdown">
                <div className="notes-search-dropdown-heading">
                  <span>SEARCH RESULTS</span>
                  <span>{loading ? "Searching..." : `${notes.length} found`}</span>
                </div>

                {loading ? (
                  <div className="notes-search-message">
                    Searching your notes...
                  </div>
                ) : notes.length > 0 ? (
                  notes.slice(0, 10).map((note) => (
                    <button
                      type="button"
                      className="notes-search-result"
                      key={note.id}
                      onClick={() => openEditNote(note)}
                    >
                      <span className="notes-result-icon">✎</span>

                      <span className="notes-result-details">
                        <strong>{note.title}</strong>
                        <small>
                          {note.content || "No content added yet."}
                        </small>
                      </span>

                      <span className="notes-result-arrow">→</span>
                    </button>
                  ))
                ) : (
                  <div className="notes-search-message">
                    <span>✎</span>
                    <p>No matching notes found.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="notes-header-actions">
            <span className="notes-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>

            <div className="notes-avatar">{getInitials(userName)}</div>
          </div>
        </header>

        {/* PAGE TITLE */}
        <section className="notes-heading">
          <div>
            <span className="notes-eyebrow">YOUR PERSONAL SPACE</span>
            <h1>My Notes</h1>
            <p>Save your thoughts, ideas and important points.</p>
          </div>

          <button className="new-note-btn" onClick={openNewNote}>
            + New Note
          </button>
        </section>

        {/* NOTE INFORMATION */}
        <section className="notes-info">
          <div>
            {loading ? (
              <span
                className="notes-count-skeleton"
                aria-label="Loading total notes"
              />
            ) : (
              <strong>{notes.length}</strong>
            )}
            <span> Total Notes</span>
          </div>

          <div>
            <label htmlFor="notes-sort">Sort by: </label>
            <select
              id="notes-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Recently Created</option>
            </select>
          </div>
        </section>

        {/* NOTES GRID */}
        {loading ? (
          <NotesSkeleton count={Math.max(notes.length, 3)} />
        ) : error ? (
          <div className="notes-message notes-error">
            {error}
            <button onClick={fetchNotes}>Try Again</button>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">
            <div className="empty-icon">✎</div>
            <h2>No notes found</h2>
            <p>Your ideas deserve a safe place. Create your first note!</p>
            <button onClick={openNewNote}>+ Create Your First Note</button>
          </div>
        ) : (
          <section className="notes-grid">
            {notes.map((note, index) => (
              <article
                className={`note-card ${colors[index % colors.length]}`}
                key={note.id}
              >
                <div className="note-card-top">
                  <span className="note-date">
                    {formatDate(note.updated_at)}
                  </span>

                  <button
                    className="note-menu-btn"
                    onClick={() => openEditNote(note)}
                    title="Edit note"
                  >
                    ✎
                  </button>
                </div>

                <h3>{note.title}</h3>

                <p className="note-preview">
                  {note.content || "No content added yet."}
                </p>

                <div className="note-card-bottom">
                  <span>Created {formatDate(note.created_at)}</span>

                  <div>
                    <button onClick={() => openEditNote(note)} title="Edit">
                      Edit
                    </button>

                    <button onClick={() => deleteNote(note.id)} title="Delete">
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* CREATE / EDIT MODAL */}
      {showEditor && (
        <div
          className="note-modal-overlay"
          onClick={() => setShowEditor(false)}
        >
          <div className="note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span>YOUR PERSONAL SPACE</span>
                <h2>{editingNote ? "Edit Note" : "Create New Note"}</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowEditor(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveNote}>
              <label>Note Title</label>

              <input
                type="text"
                placeholder="Enter your note title..."
                value={title}
                maxLength={255}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label>Note Content</label>

              <textarea
                placeholder="Write your thoughts here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="8"
              />

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEditor(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingNote
                      ? "Update Note"
                      : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
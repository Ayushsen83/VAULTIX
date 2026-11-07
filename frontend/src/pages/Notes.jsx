
import React, { useEffect, useState } from "react";
import api, { refreshCsrfToken } from "../services/api";
import "./Notes.css";

const colors = ["yellow", "pink", "blue", "green", "purple"];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // HttpOnly access cookie is automatically sent by Axios.
  // No manual access-token handling is required.
  const requireCsrfToken = async () => {
    const token = await refreshCsrfToken();

    if (!token) {
      throw new Error(
        "Could not obtain a security token. Please try again."
      );
    }

    return token;
  };

  // Fetch notes
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
        setError(
          "Your session is missing or expired. Please log in again."
        );
      } else {
        setError(
          err.response?.data?.message ||
          "Unable to load notes. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search, sort]);

  // Create new note
  const openNewNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setShowEditor(true);
  };

  // Edit existing note
  const openEditNote = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || "");
    setShowEditor(true);
  };

  // Save note
  const saveNote = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a note title.");
      return;
    }

    try {
      setSaving(true);

      // Obtain CSRF token before mutation.
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

  // Delete note
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
        err.response?.data?.message ||
        err.message ||
        "Unable to delete note."
      );
    }
  };

  // Format date
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

      {/* SIDEBAR */}
      <aside className="notes-sidebar">

        <div className="notes-brand">
          <div className="brand-icon">V</div>

          <div>
            <h2>VAULTIX</h2>
            <span>Your Digital Locker</span>
          </div>
        </div>

        <nav className="notes-navigation">
          <a href="/home">⌂ <span>Home</span></a>
          <a href="/documents">▤ <span>Documents</span></a>
          <a href="/notes" className="active">▧ <span>Notes</span></a>
          <a href="/profile">♙ <span>Profile</span></a>
        </nav>

        <div className="notes-sidebar-bottom">
          <a href="/login">↪ <span>Logout</span></a>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="notes-main">

        <header className="notes-header">

          <div className="notes-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search your notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="notes-header-actions">

            <span className="notes-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>

            <div className="notes-avatar">V</div>

          </div>

        </header>

        {/* PAGE TITLE */}
        <section className="notes-heading">

          <div>
            <span className="notes-eyebrow">
              YOUR PERSONAL SPACE
            </span>

            <h1>My Notes<span>.</span></h1>

            <p>
              Save your thoughts, ideas and important points.
            </p>
          </div>

          <button
            className="new-note-btn"
            onClick={openNewNote}
          >
            + New Note
          </button>

        </section>

        {/* NOTE INFORMATION */}
        <section className="notes-info">

          <div>
            <strong>{notes.length}</strong>
            <span> Total Notes</span>
          </div>

          <div>
            <label htmlFor="notes-sort">Sort by: </label>

            <select
              id="notes-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="updated_at">
                Recently Updated
              </option>

              <option value="created_at">
                Recently Created
              </option>
            </select>
          </div>

        </section>

        {/* NOTES GRID */}
        {loading ? (

          <div className="notes-message">
            Loading your notes...
          </div>

        ) : error ? (

          <div className="notes-message notes-error">
            {error}

            <button onClick={fetchNotes}>
              Try Again
            </button>
          </div>

        ) : notes.length === 0 ? (

          <div className="notes-empty">

            <div className="empty-icon">✎</div>

            <h2>No notes found</h2>

            <p>
              Your ideas deserve a safe place.
              Create your first note!
            </p>

            <button onClick={openNewNote}>
              + Create Your First Note
            </button>

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

                  <span>
                    Created {formatDate(note.created_at)}
                  </span>

                  <div>

                    <button
                      onClick={() => openEditNote(note)}
                      title="Edit"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteNote(note.id)}
                      title="Delete"
                    >
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

          <div
            className="note-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-heading">

              <div>
                <span>YOUR PERSONAL SPACE</span>

                <h2>
                  {editingNote
                    ? "Edit Note"
                    : "Create New Note"}
                </h2>
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

                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
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

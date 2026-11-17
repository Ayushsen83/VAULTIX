import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchFreshCsrfToken } from "../services/api";
 import Header from "../components/Header";

import "./Home.css";

import DashboardSkeleton from "../components/skeletons/HomeSkeleton";
export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Authenticated account
  const [user, setUser] = useState(null);
  const [isCsrfReady, setIsCsrfReady] = useState(false);

  // Dashboard information
  const [files, setFiles] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [notes, setNotes] = useState([]);
  const [totalNotes, setTotalNotes] = useState(0);

  // Request states
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Note states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Redirect when the authenticated session expires.
  const redirectToLogin = useCallback(() => {
    navigate("/login", {
      replace: true,
      state: { reason: "session-expired" },
    });
  }, [navigate]);

  // Open the system file picker.
  const handleChooseFile = () => {
    setUploadMessage("");
    setUploadError("");

    if (!isCsrfReady) {
      setUploadError(
        "Secure connection is not ready. Please refresh the dashboard.",
      );
      return;
    }

    fileInputRef.current?.click();
  };

  // Upload a supported PDF or audio file.
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    if (!isCsrfReady) {
      setUploadError(
        "Secure connection is not ready. Please refresh the dashboard.",
      );
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    const allowedFiles = {
      pdf: {
        mime: "application/pdf",
        maxSize: 50 * 1024 * 1024,
      },
      mp3: {
        mime: "audio/mpeg",
        maxSize: 10 * 1024 * 1024,
      },
      wav: {
        mime: "audio/wav",
        maxSize: 10 * 1024 * 1024,
      },
      m4a: {
        mime: "audio/mp4",
        maxSize: 10 * 1024 * 1024,
      },
    };

    const config = allowedFiles[extension];

    if (!config) {
      setUploadError("Only PDF, MP3, WAV and M4A files are supported.");
      return;
    }

    if (file.size === 0) {
      setUploadError("The selected file is empty.");
      return;
    }

    if (file.size > config.maxSize) {
      const maxSizeMB = extension === "pdf" ? 50 : 10;

      setUploadError(
        `${extension.toUpperCase()} files must not exceed ${maxSizeMB} MB.`,
      );
      return;
    }

    if (file.type !== config.mime) {
      setUploadError(
        "The file type does not match its extension. Please select a valid file.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setUploadError("");
    setUploadMessage("");

    try {
      const response = await api.post("/files", formData);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Upload failed.");
      }

      setUploadMessage(response.data?.message || "File uploaded successfully.");

      // Reload dashboard information.
      setRetryCount((count) => count + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setUploadError(
        error.response?.data?.message ||
          error.message ||
          "Unable to upload this file. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Open the Create Note modal.
  const handleOpenNoteModal = () => {
    if (!isCsrfReady) {
      setNoteError(
        "Secure connection is not ready. Please refresh the dashboard.",
      );
      return;
    }

    setNoteTitle("");
    setNoteContent("");
    setNoteError("");
    setIsNoteModalOpen(true);
  };

  // Create a note using the existing notes API.
  const handleCreateNote = async (event) => {
    event.preventDefault();

    if (!isCsrfReady) {
      setNoteError(
        "Secure connection is not ready. Please refresh the dashboard.",
      );
      return;
    }

    const trimmedTitle = noteTitle.trim();

    if (!trimmedTitle) {
      setNoteError("Please enter a note title.");
      return;
    }

    if (trimmedTitle.length > 255) {
      setNoteError("The note title must not exceed 255 characters.");
      return;
    }

    setIsCreatingNote(true);
    setNoteError("");

    try {
      const response = await api.post("/notes", {
        title: trimmedTitle,
        content: noteContent,
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Could not create the note.");
      }

      setIsNoteModalOpen(false);
      setNoteTitle("");
      setNoteContent("");

      // Reload dashboard information.
      setRetryCount((count) => count + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setNoteError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create the note. Please try again.",
      );
    } finally {
      setIsCreatingNote(false);
    }
  };

  // Load the authenticated user's dashboard.
  const loadDashboard = useCallback(
    async (signal) => {
      setDashboardError("");
      setIsLoading(true);
      setIsCsrfReady(false);

      try {
        // STEP 1: Verify authenticated session.
        const profileResponse = await api.get("/users/me", {
          signal,
        });

        if (signal.aborted) return;

        const authenticatedUser = profileResponse.data?.user;

        if (!authenticatedUser?.user_id) {
          throw new Error(
            "The server did not return valid account information.",
          );
        }

        setUser(authenticatedUser);

        // STEP 2: Initialize CSRF token.
        const errors = [];

        try {
          const csrfToken = await fetchFreshCsrfToken();

          if (signal.aborted) return;

          if (csrfToken) {
            setIsCsrfReady(true);
          } else {
            errors.push(
              "Secure actions are temporarily unavailable. Please refresh the dashboard.",
            );
          }
        } catch (csrfError) {
          if (csrfError.response?.status === 401) {
            redirectToLogin();
            return;
          }

          errors.push(
            "Secure actions are temporarily unavailable. Please refresh the dashboard.",
          );
        }

        if (signal.aborted) return;

        // STEP 3: Retrieve documents and notes in parallel.
        const [filesResult, notesResult] = await Promise.allSettled([
          api.get("/files", {
            params: {
              page: 1,
              limit: 50,
              sort: "created_at",
              order: "desc",
            },
            signal,
          }),

          api.get("/notes", {
            params: {
              sort: "updated_at",
              order: "desc",
            },
            signal,
          }),
        ]);

        if (signal.aborted) return;

        // STEP 4: Check session expiration.
        const results = [filesResult, notesResult];

        const unauthorized = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason?.response?.status === 401,
        );

        if (unauthorized) {
          redirectToLogin();
          return;
        }

        // STEP 5: Update document information.
        if (filesResult.status === "fulfilled") {
          const response = filesResult.value.data;

          const fileList = Array.isArray(response?.files) ? response.files : [];

          setFiles(fileList);

          setTotalDocuments(
            Number(response?.pagination?.total ?? fileList.length),
          );
        } else {
          errors.push("Documents could not be loaded.");
        }

        // STEP 6: Update note information.
        if (notesResult.status === "fulfilled") {
          const response = notesResult.value.data;

          const noteList = Array.isArray(response?.notes) ? response.notes : [];

          setNotes(noteList);

          setTotalNotes(Number(response?.count ?? noteList.length));
        } else {
          errors.push("Notes could not be loaded.");
        }

        if (errors.length > 0) {
          setDashboardError(errors.join(" "));
        }
      } catch (error) {
        if (signal.aborted) return;

        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }

        console.error("VAULTIX dashboard loading error:", error);

        setDashboardError(
          error.response?.data?.message ||
            error.message ||
            "Unable to load your account. Please try again.",
        );
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [redirectToLogin],
  );

  // Restore session and reload after successful actions.
  useEffect(() => {
    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDashboard, retryCount]);

  // Retry dashboard loading.
  const handleRetry = () => {
    if (isLoading) return;
    setRetryCount((count) => count + 1);
  };

  // Navigate to the clicked document.
  const handleDocumentClick = (file) => {
    navigate("/documents", {
      state: {
        selectedDocumentId: file.id,
        selectedDocument: file,
      },
    });
  };

  // Navigate to the clicked note.
  const handleNoteClick = (note) => {
    navigate("/notes", {
      state: {
        selectedNoteId: note.id,
        selectedNote: note,
      },
    });
  };

  // Support Enter and Space keyboard navigation.
  const handleRecentItemKeyDown = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  // Initial loading screen.
  // if (isLoading && !user) {
  //   return (
  //     <main className="home-loading">
  //       <div
  //         className="home-spinner"
  //         role="status"
  //         aria-label="Loading dashboard"
  //       />
  //       <p>Securing your digital locker...</p>
  //     </main>
  //   );
  // }

  // Initial dashboard skeleton.
  if (isLoading && !user) {
    return <DashboardSkeleton />;
  }

  // Account verification failed.
  if (!user) {
    return (
      <main className="home-error">
        <h2>Unable to access VAULTIX</h2>

        <p role="alert">
          {dashboardError || "Your account could not be verified."}
        </p>

        <button type="button" onClick={handleRetry}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Header
            id ="locker-global-search"
            name="lockerGlobalSearch"
            userName={user?.name}
            showSearch={true}
            searchPlaceholder="Search your locker..."
          />

          {/* Welcome section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <span className="welcome-label">YOUR DIGITAL LOCKER</span>

              <h1>Welcome back, {user.name || "User"}!</h1>
            </div>

            <div className="dashboard-date">
              <strong>
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
          </section>

          {/* Dashboard errors */}
          {dashboardError && (
            <div className="dashboard-error" role="alert">
              {dashboardError}
            </div>
          )}

          {/* Dashboard statistics */}
          <section className="stats-grid" aria-label="Dashboard statistics">
            <article className="stat-card stat-documents">
              <div className="stat-info">
                <span>Total Documents</span>
                <h2>{totalDocuments}</h2>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  className="dashboard-icon"
                  focusable="false"
                >
                  <path d="M6 3.75h8l4 4v12.5H6z" />
                  <path d="M14 3.75v4h4M9 12h6M9 15.5h6" />
                </svg>
              </div>
            </article>

            <article className="stat-card stat-notes">
              <div className="stat-info">
                <span>Total Notes</span>
                <h2>{totalNotes}</h2>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  className="dashboard-icon"
                  focusable="false"
                >
                  <path d="M5 4.5h14v15H5z" />
                  <path d="M8.5 9h7M8.5 12.5h4" />
                  <path d="m14.5 16.5 4-4 1.5 1.5-4 4-2 .5z" />
                </svg>
              </div>
            </article>

            <article className="stat-card stat-uploaded">
              <div className="stat-info">
                <span>Total Uploaded Files</span>
                <h2>{totalDocuments + totalNotes}</h2>
              </div>

              <div className="stat-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  className="dashboard-icon"
                  focusable="false"
                >
                  <path d="M12 15V4.5M8 8.5l4-4 4 4" />
                  <path d="M5 14.5v4.25h14V14.5" />
                </svg>
              </div>
            </article>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="quick-actions-heading">
              <div>
                <h2>Quick Actions</h2>
              </div>
            </div>

            <div className="quick-actions-grid">
              {/* Upload Document */}
              <button
                type="button"
                className="quick-action-card action-upload"
                onClick={handleChooseFile}
                disabled={isUploading || !isCsrfReady}
              >
                <span className="quick-action-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="dashboard-icon"
                    focusable="false"
                  >
                    <path d="M12 15V4M8 8l4-4 4 4" />
                    <path d="M5 14v5h14v-5" />
                  </svg>
                </span>

                <span className="quick-action-text">
                  <strong>
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </strong>

                  <small>
                    {isUploading ? "Please wait while your file uploads" : ""}
                  </small>
                </span>

                <span className="quick-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>

              {/* Hidden file input */}
              <input
                id ="home-quick-upload"
                name ="homeQuickUpload"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.mp3,.wav,.m4a,application/pdf,audio/mpeg,audio/wav,audio/mp4"
                onChange={handleFileUpload}
                hidden
                disabled={isUploading}
              />

              {/* Create Note */}
              <button
                type="button"
                className="quick-action-card action-note"
                onClick={handleOpenNoteModal}
                disabled={isCreatingNote || !isCsrfReady}
              >
                <span className="quick-action-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="dashboard-icon"
                    focusable="false"
                  >
                    <path d="M5 4.5h14v15H5z" />
                    <path d="M8.5 9h7M8.5 12.5h4" />
                    <path d="M15 16h5M17.5 13.5v5" />
                  </svg>
                </span>

                <span className="quick-action-text">
                  <strong>Add Note</strong>
                </span>

                <span className="quick-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>

              {/* View All Documents */}
              <button
                type="button"
                className="quick-action-card action-documents"
                onClick={() => navigate("/documents")}
              >
                <span className="quick-action-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="dashboard-icon"
                    focusable="false"
                  >
                    <path d="M6 4h10l3 3v13H6z" />
                    <path d="M16 4v4h3M9 12h7M9 15.5h7" />
                  </svg>
                </span>

                <span className="quick-action-text">
                  <strong>View All Documents</strong>
                </span>

                <span className="quick-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>

              {/* Profile */}
              <button
                type="button"
                className="quick-action-card action-profile"
                onClick={() => navigate("/profile")}
              >
                <span className="quick-action-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="dashboard-icon"
                    focusable="false"
                  >
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5.5 19c.5-3.2 2.8-5 6.5-5s6 1.8 6.5 5z" />
                  </svg>
                </span>

                <span className="quick-action-text">
                  <strong>My Profile</strong>
                </span>

                <span className="quick-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>

            {/* Upload feedback */}
            {uploadMessage && (
              <p className="quick-action-success" role="status">
                {uploadMessage}
              </p>
            )}

            {uploadError && (
              <p className="quick-action-error" role="alert">
                {uploadError}
              </p>
            )}
          </section>

          {/* Recent Documents and Recent Notes */}
          <section className="dashboard-bottom-grid">
            {/* Recent Documents: maximum 4 latest files */}
            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Documents</h2>
                </div>
                <button
                  type="button"
                  className="view-all-link"
                  onClick={() => navigate("/documents")}
                >
                  View all <span aria-hidden="true">→</span>
                </button>
              </div>

              {files.length > 0 ? (
                <div className="recent-documents-list">
                  {files.slice(0, 4).map((file) => (
                    <div
                      className="recent-document-item"
                      key={file.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleDocumentClick(file)}
                      onKeyDown={(event) =>
                        handleRecentItemKeyDown(event, () =>
                          handleDocumentClick(file),
                        )
                      }
                      aria-label={`Open ${file.file_name || "document"} in Documents`}
                    >
                      <div className="recent-document-icon">
                        {file.mime_type?.includes("pdf") ? "PDF" : "FILE"}
                      </div>

                      <div className="recent-document-info">
                        <strong title={file.file_name}>
                          {file.file_name || "Untitled document"}
                        </strong>

                        <span>
                          {file.created_at
                            ? new Date(file.created_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "Date unavailable"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <span aria-hidden="true">▤</span>
                  <p>No documents uploaded yet.</p>
                </div>
              )}
            </article>

            {/* Recent Notes: maximum 4 latest notes */}
            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Notes</h2>
                </div>
                <button
                  type="button"
                  className="view-all-link"
                  onClick={() => navigate("/notes")}
                >
                  View all <span aria-hidden="true">→</span>
                </button>
              </div>

              {notes.length > 0 ? (
                <div className="recent-notes-list">
                  {notes.slice(0, 4).map((note) => (
                    <div
                      className="recent-note-item"
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNoteClick(note)}
                      onKeyDown={(event) =>
                        handleRecentItemKeyDown(event, () =>
                          handleNoteClick(note),
                        )
                      }
                      aria-label={`Open ${note.title || "note"} in Notes`}
                    >
                      <div className="recent-note-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </div>

                      <div className="recent-note-info">
                        <strong title={note.title}>
                          {note.title || "Untitled note"}
                        </strong>

                        <span>
                          {note.updated_at || note.created_at
                            ? new Date(
                                note.updated_at || note.created_at,
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Date unavailable"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <span aria-hidden="true">▧</span>
                  <p>No notes created yet.</p>
                </div>
              )}
            </article>
          </section>

          {/* Create Note Modal */}
          {isNoteModalOpen && (
            <div
              className="note-modal-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isCreatingNote) {
                  setIsNoteModalOpen(false);
                }
              }}
            >
              <section
                className="note-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-note-heading"
              >
                <div className="note-modal-heading">
                  <div>
                    <span className="section-eyebrow">YOUR DIGITAL LOCKER</span>

                    <h2 id="create-note-heading">Create a Note</h2>
                  </div>

                  <button
                    type="button"
                    className="note-modal-close"
                    onClick={() => setIsNoteModalOpen(false)}
                    disabled={isCreatingNote}
                    aria-label="Close create note dialog"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateNote}>
                  <label htmlFor="quick-note-title">Note title</label>

                  <input
                    id="quick-note-title"
                    type="text"
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Enter your note title"
                    maxLength={255}
                    required
                    disabled={isCreatingNote || !isCsrfReady}
                  />

                  <label htmlFor="quick-note-content">Content</label>

                  <textarea
                    id="quick-note-content"
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Write your note here..."
                    rows={5}
                    disabled={isCreatingNote || !isCsrfReady}
                  />

                  {noteError && (
                    <p className="quick-action-error" role="alert">
                      {noteError}
                    </p>
                  )}

                  <div className="note-modal-actions">
                    <button
                      type="button"
                      className="note-cancel-button"
                      onClick={() => setIsNoteModalOpen(false)}
                      disabled={isCreatingNote}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="note-save-button"
                      disabled={isCreatingNote || !isCsrfReady}
                    >
                      {isCreatingNote ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
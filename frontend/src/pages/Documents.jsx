import React, { useEffect, useRef, useState } from "react";
import api, { refreshCsrfToken } from "../services/api";
import DocumentsSkeleton from "../components/skeletons/DocumentsSkeleton";
import "./Documents.css";

// Generate initials from user's registered name
const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
};

export default function Documents() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [type, setType] = useState("");
  const [sort, setSort] = useState("created_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const [pagination, setPagination] = useState({});
  const [userName, setUserName] = useState("");

  const inputRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch logged-in user's profile
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Get a fresh CSRF token before every mutation
  const requireCsrfToken = async () => {
    const token = await refreshCsrfToken();

    if (!token) {
      throw new Error(
        "Could not obtain a security token. Please try again."
      );
    }

    return token;
  };

  // Fetch documents
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/files", {
        params: {
          q: debouncedSearch,
          type: type || undefined,
          sort,
          order: "desc",
          page: 1,
          limit: 50,
        },
      });

      setFiles(response.data.files || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error("Fetch documents error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Reload documents when filters or search change
  useEffect(() => {
    fetchFiles();
  }, [debouncedSearch, type, sort]);

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";

    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(1)} KB`;
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

  // Get file type
  const getFileType = (file) => {
    return file.mime_type === "application/pdf" ? "PDF" : "AUDIO";
  };

  // Handle search result click
  const handleSearchResultClick = (file) => {
    setShowSearchResults(false);
    handlePreview(file);
  };

  // Handle search keyboard actions
  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setShowSearchResults(false);
    }

    if (event.key === "Enter") {
      const firstResult = files[0];

      if (firstResult && search.trim()) {
        handleSearchResultClick(firstResult);
      }
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setShowSearchResults(false);
  };

  // Upload document with progress
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");

    const extension = file.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "mp3", "wav", "m4a"];

    if (!allowed.includes(extension)) {
      setUploadError(
        "Only PDF, MP3, WAV and M4A files are allowed."
      );

      event.target.value = "";
      return;
    }

    const maxSize =
      extension === "pdf"
        ? 50 * 1024 * 1024
        : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setUploadError(
        extension === "pdf"
          ? "PDF file must be smaller than 50 MB."
          : "Audio file must be smaller than 10 MB."
      );

      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadFileName(file.name);
      setUploadStatus("Preparing upload...");

      const formData = new FormData();
      formData.append("file", file);

      await requireCsrfToken();

      setUploadStatus("Uploading...");

      await api.post("/files", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) /
                progressEvent.total
            );

            setUploadProgress(percent);

            setUploadStatus(
              percent >= 100
                ? "Finishing upload..."
                : "Uploading..."
            );
          }
        },
      });

      setUploadProgress(100);
      setUploadStatus("Upload completed");

      await fetchFiles();

      setTimeout(() => {
        setUploadStatus("");
        setUploadProgress(0);
        setUploadFileName("");
      }, 2500);
    } catch (err) {
      console.error("Upload document error:", err);

      setUploadStatus("Upload failed");

      setUploadError(
        err.response?.data?.message ||
          err.message ||
          "Unable to upload document. Please try again."
      );

      setTimeout(() => {
        setUploadStatus("");
        setUploadProgress(0);
        setUploadFileName("");
      }, 3000);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // Delete document
  const handleDelete = async (file) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.file_name}"?`
    );

    if (!confirmed) return;

    try {
      await requireCsrfToken();

      await api.delete(`/files/${file.id}`);

      await fetchFiles();
    } catch (err) {
      console.error("Delete document error:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Unable to delete document."
      );
    }
  };

  // Preview document
  const handlePreview = async (file) => {
    try {
      const response = await api.get(
        `/files/${file.id}/preview`,
        {
          responseType: "blob",
        }
      );

      const blobUrl = URL.createObjectURL(response.data);
      const newWindow = window.open(blobUrl, "_blank");

      if (!newWindow) {
        URL.revokeObjectURL(blobUrl);

        alert(
          "Please allow pop-ups to preview this document."
        );
      } else {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }
    } catch (err) {
      console.error("Preview document error:", err);

      alert(
        err.response?.data?.message ||
          "Unable to preview this document."
      );
    }
  };

  // Download document
  const handleDownload = async (file) => {
    try {
      const response = await api.get(
        `/files/${file.id}/download`,
        {
          responseType: "blob",
        }
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.file_name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("Download document error:", err);

      alert(
        err.response?.data?.message ||
          "Unable to download document."
      );
    }
  };

  // Calculate total storage usage
  const totalUsed = files.reduce(
    (total, file) =>
      total + Number(file.size_bytes || 0),
    0
  );

  // Calculate storage percentage
  const usagePercentage = Math.min(
    (totalUsed / (100 * 1024 * 1024)) * 100,
    100
  );

  return (
    <div className="documents-layout">
      <main className="documents-main">

        {/* HEADER */}
        <header className="documents-header">

          {/* SEARCH */}
          <div
            className="documents-search-wrapper"
            ref={searchRef}
          >
            <div className="documents-search">
              <span>⌕</span>

              <input
                id="document-search"
                type="text"
                placeholder="Search your documents..."
                value={search}
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
                autoComplete="off"
              />

              {search && (
                <button
                  type="button"
                  className="documents-search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            {showSearchResults && search.trim() && (
              <div className="documents-search-dropdown">

                <div className="documents-search-dropdown-heading">
                  <span>SEARCH RESULTS</span>
                  {!loading && (
                    <span>
                      {files.length} found
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="documents-search-message">
                    Searching documents...
                  </div>
                ) : files.length > 0 ? (
                  <div className="documents-search-results">
                    {files.slice(0, 10).map((file) => (
                      <button
                        type="button"
                        className="documents-search-result"
                        key={file.id}
                        onClick={() =>
                          handleSearchResultClick(file)
                        }
                      >
                        <div
                          className={`documents-search-result-icon ${
                            getFileType(file).toLowerCase()
                          }`}
                        >
                          {getFileType(file) === "PDF"
                            ? "PDF"
                            : "♫"}
                        </div>

                        <div className="documents-search-result-info">
                          <strong>{file.file_name}</strong>

                          <span>
                            {getFileType(file)} ·{" "}
                            {formatSize(file.size_bytes)}
                          </span>
                        </div>

                        <span className="documents-search-result-arrow">
                          ↗
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="documents-search-message">
                    <span>⌕</span>
                    <strong>No documents found</strong>
                    <small>
                      Try searching with another file name.
                    </small>
                  </div>
                )}

                {!loading && files.length > 10 && (
                  <div className="documents-search-footer">
                    Showing first 10 results
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="documents-header-actions">
            <span>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>

            <div className="documents-avatar">
              {getInitials(userName)}
            </div>
          </div>
        </header>

        {/* PAGE HEADING */}
        <section className="documents-heading">
          <div>
            <span className="documents-eyebrow">
              YOUR SECURE STORAGE
            </span>

            <h1>My Documents</h1>

            <p>
              All your important files, safely stored in one place.
            </p>
          </div>

          <button
            className="documents-upload-btn"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "+ Upload Document"}
          </button>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.mp3,.wav,.m4a"
            onChange={handleUpload}
          />
        </section>

        {/* UPLOAD PROGRESS POPUP */}
        {uploadStatus && (
          <div className="documents-upload-popup">
            <div className="documents-upload-popup-header">
              <strong>{uploadStatus}</strong>
              <strong>{uploadProgress}%</strong>
            </div>

            <p>{uploadFileName}</p>

            <div className="documents-upload-popup-track">
              <div
                className={
                  uploadStatus === "Upload failed"
                    ? "documents-upload-popup-bar failed"
                    : "documents-upload-popup-bar"
                }
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* UPLOAD ERROR */}
        {uploadError && (
          <div className="documents-upload-error">
            {uploadError}

            <button onClick={() => setUploadError("")}>
              ×
            </button>
          </div>
        )}

        {/* STORAGE INFORMATION */}
        <section className="documents-storage">
          <div>
            <span>YOUR STORAGE</span>

            <h3>
              {loading ? (
                <span className="skeleton-block documents-storage-value-skeleton" />
              ) : (
                formatSize(totalUsed)
              )}

              <small> of 100 MB used</small>
            </h3>
          </div>

          <div className="storage-progress">
            {loading ? (
              <div className="skeleton-block documents-progress-skeleton" />
            ) : (
              <div
                style={{
                  width: `${usagePercentage}%`,
                }}
              />
            )}
          </div>

          <span className="storage-percentage">
            {loading ? (
              <span className="skeleton-block documents-usage-skeleton" />
            ) : (
              `${usagePercentage.toFixed(1)}% used`
            )}
          </span>
        </section>

        {/* DOCUMENT INFORMATION AND FILTERS */}
        <section className="documents-info">
          <div>
            {loading ? (
              <span className="skeleton-block documents-count-skeleton" />
            ) : (
              <strong>{pagination.total ?? files.length}</strong>
            )}

            <span> Total Documents</span>
          </div>

          <div className="documents-filters">
            <label htmlFor="file-type">Type:</label>

            <select
              id="file-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Files</option>
              <option value="pdf">PDF</option>
              <option value="audio">Audio</option>
            </select>

            <label htmlFor="file-sort">Sort:</label>

            <select
              id="file-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="created_at">Date</option>
              <option value="file_name">Name</option>
              <option value="size_bytes">Size</option>
            </select>
          </div>
        </section>

        {/* DOCUMENT LIST */}
        {loading ? (
          <DocumentsSkeleton count={Math.max(files.length, 3)} />
        ) : error ? (
          <div className="documents-message documents-error">
            {error}

            <button onClick={fetchFiles}>
              Try Again
            </button>
          </div>
        ) : files.length === 0 ? (
          <div className="documents-empty">
            <div className="documents-empty-icon">▤</div>

            <h2>No documents found</h2>

            <p>
              Your important files deserve a secure home.
              Upload your first document!
            </p>

            <button onClick={() => inputRef.current?.click()}>
              + Upload Your First Document
            </button>
          </div>
        ) : (
          <section className="documents-grid">
            {files.map((file) => (
              <article
                className="document-card"
                key={file.id}
              >
                <div className="document-card-top">
                  <div
                    className={`document-file-icon ${getFileType(file).toLowerCase()}`}
                  >
                    {getFileType(file) === "PDF" ? "PDF" : "♫"}
                  </div>

                  <span className="document-type-badge">
                    {getFileType(file)}
                  </span>
                </div>

                <h3>{file.file_name}</h3>

                <div className="document-meta">
                  <span>{formatSize(file.size_bytes)}</span>

                  <span>{formatDate(file.created_at)}</span>
                </div>

                <div className="document-card-actions">
                  <button onClick={() => handlePreview(file)}>
                    Preview
                  </button>

                  <button onClick={() => handleDownload(file)}>
                    Download
                  </button>

                  <button
                    className="document-delete-btn"
                    onClick={() => handleDelete(file)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
import React, { useEffect, useRef, useState } from "react";
import api, { refreshCsrfToken } from "../services/api";
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

  // Logged-in user's profile name
  const [userName, setUserName] = useState("");

  const inputRef = useRef(null);

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

  // Get a fresh CSRF token before every mutation.
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
          q: search,
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

  // Reload documents when filters change
  useEffect(() => {
    fetchFiles();
  }, [search, type, sort]);

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

  // Upload document with progress
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");

    const extension = file.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "mp3", "wav", "m4a"];

    // Validate file extension
    if (!allowed.includes(extension)) {
      setUploadError(
        "Only PDF, MP3, WAV and M4A files are allowed."
      );

      event.target.value = "";
      return;
    }

    // Validate file size
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

      // Prepare multipart form data
      const formData = new FormData();
      formData.append("file", file);

      // Get fresh CSRF token
      await requireCsrfToken();

      setUploadStatus("Uploading...");

      // Upload document and track actual progress
      await api.post("/files", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );

            setUploadProgress(percent);
            setUploadStatus(
              percent >= 100 ? "Finishing upload..." : "Uploading..."
            );
          }
        },
      });

      setUploadProgress(100);
      setUploadStatus("Upload completed");

      // Refresh document list
      await fetchFiles();

      // Keep success popup visible briefly
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

      // Keep failed popup visible briefly
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
        { responseType: "blob" }
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
        { responseType: "blob" }
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

          <div className="documents-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search your documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
          <div
            style={{
              position: "fixed",
              right: "25px",
              bottom: "25px",
              width: "320px",
              maxWidth: "calc(100vw - 40px)",
              padding: "18px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.16)",
              border: "1px solid #e8e1d7",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
                color: "#202c26",
              }}
            >
              <strong>{uploadStatus}</strong>

              <strong>{uploadProgress}%</strong>
            </div>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                color: "#777",
                overflowWrap: "anywhere",
              }}
            >
              {uploadFileName}
            </p>

            <div
              style={{
                width: "100%",
                height: "7px",
                backgroundColor: "#eee9e1",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  backgroundColor:
                    uploadStatus === "Upload failed"
                      ? "#c0392b"
                      : "#c98262",
                  borderRadius: "10px",
                  transition: "width 0.2s ease",
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
              {formatSize(totalUsed)}
              <small> of 100 MB used</small>
            </h3>
          </div>

          <div className="storage-progress">
            <div
              style={{
                width: `${usagePercentage}%`,
              }}
            />
          </div>

          <span className="storage-percentage">
            {usagePercentage.toFixed(1)}% used
          </span>

        </section>

        {/* DOCUMENT INFORMATION AND FILTERS */}
        <section className="documents-info">

          <div>
            <strong>
              {pagination.total ?? files.length}
            </strong>

            <span> Total Documents</span>
          </div>

          <div className="documents-filters">

            <label htmlFor="file-type">
              Type:
            </label>

            <select
              id="file-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Files</option>
              <option value="pdf">PDF</option>
              <option value="audio">Audio</option>
            </select>

            <label htmlFor="file-sort">
              Sort:
            </label>

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

          <div className="documents-message">
            Loading your documents...
          </div>

        ) : error ? (

          <div className="documents-message documents-error">

            {error}

            <button onClick={fetchFiles}>
              Try Again
            </button>

          </div>

        ) : files.length === 0 ? (

          <div className="documents-empty">

            <div className="documents-empty-icon">
              ▤
            </div>

            <h2>No documents found</h2>

            <p>
              Your important files deserve a secure home.
              Upload your first document!
            </p>

            <button
              onClick={() => inputRef.current?.click()}
            >
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

                  <span className="document-file-type">
                    {getFileType(file)}
                  </span>

                </div>

                <h3 className="document-file-name">
                  {file.file_name}
                </h3>

                <div className="document-file-details">

                  <span>
                    {formatSize(file.size_bytes)}
                  </span>

                  <span>
                    {formatDate(file.created_at)}
                  </span>

                </div>

                <div className="document-card-actions">

                  <button
                    onClick={() => handlePreview(file)}
                  >
                    Preview
                  </button>

                  <button
                    onClick={() => handleDownload(file)}
                  >
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
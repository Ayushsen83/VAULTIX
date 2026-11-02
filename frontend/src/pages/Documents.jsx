import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";
import "./Documents.css";

export default function Documents() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("created_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pagination, setPagination] = useState({});
  const inputRef = useRef(null);

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
      setError(
        err.response?.data?.message ||
          "Unable to load documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [search, type, sort]);

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";

    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getFileType = (file) => {
    return file.mime_type === "application/pdf" ? "PDF" : "AUDIO";
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");

    const extension = file.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "mp3", "wav", "m4a"];

    if (!allowed.includes(extension)) {
      setUploadError("Only PDF, MP3, WAV and M4A files are allowed.");
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

      const formData = new FormData();
      formData.append("file", file);

      await api.post("/files", formData);
      await fetchFiles();
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
          "Unable to upload document. Please try again."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (file) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.file_name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/files/${file.id}`);
      await fetchFiles();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Unable to delete document."
      );
    }
  };

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
        alert("Please allow pop-ups to preview this document.");
      } else {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Unable to preview this document."
      );
    }
  };

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

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Unable to download document."
      );
    }
  };

  const totalUsed = files.reduce(
    (total, file) => total + Number(file.size_bytes || 0),
    0
  );

  const usagePercentage = Math.min(
    (totalUsed / (100 * 1024 * 1024)) * 100,
    100
  );

  return (
    <div className="documents-layout">
      <aside className="documents-sidebar">
        <div className="documents-brand">
          <div className="documents-brand-icon">V</div>
          <div>
            <h2>VAULTIX</h2>
            <span>Your Digital Locker</span>
          </div>
        </div>

        <nav className="documents-navigation">
          <a href="/home">⌂ <span>Home</span></a>
          <a href="/documents" className="active">
            ▤ <span>Documents</span>
          </a>
          <a href="/notes">▧ <span>Notes</span></a>
          <a href="/profile">♙ <span>Profile</span></a>
        </nav>

        <div className="documents-sidebar-bottom">
          <a href="/login">↪ <span>Logout</span></a>
        </div>
      </aside>

      <main className="documents-main">
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
            <div className="documents-avatar">V</div>
          </div>
        </header>

        <section className="documents-heading">
          <div>
            <span className="documents-eyebrow">
              YOUR SECURE STORAGE
            </span>
            <h1>My Documents<span>.</span></h1>
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

        {uploadError && (
          <div className="documents-upload-error">
            {uploadError}
            <button onClick={() => setUploadError("")}>×</button>
          </div>
        )}

        <section className="documents-storage">
          <div>
            <span>YOUR STORAGE</span>
            <h3>
              {formatSize(totalUsed)} <small>of 100 MB used</small>
            </h3>
          </div>

          <div className="storage-progress">
            <div style={{ width: `${usagePercentage}%` }} />
          </div>

          <span className="storage-percentage">
            {usagePercentage.toFixed(1)}% used
          </span>
        </section>

        <section className="documents-info">
          <div>
            <strong>{pagination.total ?? files.length}</strong>
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

        {loading ? (
          <div className="documents-message">
            Loading your documents...
          </div>
        ) : error ? (
          <div className="documents-message documents-error">
            {error}
            <button onClick={fetchFiles}>Try Again</button>
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
              <article className="document-card" key={file.id}>
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
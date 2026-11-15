import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Header.css";

export default function Header({
  userName = "",
  searchPlaceholder = "Search notes and documents...",
  searchValue = "",
  onSearchChange,
  showSearch = true,
}) {
  const navigate = useNavigate();

  const [accountName, setAccountName] = useState(userName);
  const [query, setQuery] = useState(searchValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (userName) {
      setAccountName(userName);
    }
  }, [userName]);

  useEffect(() => {
    if (userName) return;

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const response = await api.get("/users/me");
        const name = response.data?.user?.name;

        if (isMounted && name) {
          setAccountName(name);
        }
      } catch (error) {
        console.error("Unable to load header profile:", error);
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [userName]);

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  // Debounced global search with request cancellation.
  useEffect(() => {
    const keyword = query.trim();

    if (!showSearch || keyword.length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setLoading(false);
    setSearchError("");

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await api.get("/search", {
          params: {
            q: keyword,
            type: "all",
            page: 1,
            limit: 10,
          },
          signal: controller.signal,
        });

        if (!isActive) return;

        setResults(response.data?.results || []);
      } catch (error) {
        if (!isActive || controller.signal.aborted) return;

        console.error("Global search failed:", error);

        setResults([]);
        setSearchError(
          error.response?.data?.message ||
            "Unable to search right now. Please try again."
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, showSearch]);

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setQuery(value);
    setShowResults(true);
    onSearchChange?.(value);
  };

  // Clear search input and results.
  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setSearchError("");
    setLoading(false);
    setShowResults(false);
    onSearchChange?.("");
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setShowResults(false);
    }
  };

  const handleResultClick = (result) => {
    setShowResults(false);

    if (result.type === "note") {
      navigate("/notes", {
        state: {
          searchQuery: query,
          selectedResult: result,
        },
      });
    } else if (result.type === "document") {
      navigate("/documents", {
        state: {
          searchQuery: query,
          selectedResult: result,
        },
      });
    }
  };

  const initial =
    accountName
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <header className="header">
      {showSearch && (
        <div className="header-search-wrapper">
          <div className="header-search">
            <span
              className="header-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="global-search"
              name="globalSearch"
              type="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={handleSearchChange}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleSearchKeyDown}
              aria-label={searchPlaceholder}
              aria-expanded={showResults}
            />

            {query.length > 0 && (
              <button
                type="button"
                className="header-search-clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
                title="Clear search"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "4px 8px",
                }}
              >
                ×
              </button>
            )}

            {loading && (
              <span className="header-search-loader" />
            )}
          </div>

          {showResults && query.trim().length >= 2 && (
            <div className="global-search-dropdown">
              {loading && (
                <div className="global-search-message">
                  Searching Notes and Documents...
                </div>
              )}

              {!loading && searchError && (
                <div className="global-search-message global-search-error">
                  {searchError}
                </div>
              )}

              {!loading &&
                !searchError &&
                results.length === 0 && (
                  <div className="global-search-message">
                    No matching Notes or Documents found.
                  </div>
                )}

              {!loading && results.length > 0 && (
                <>
                  <div className="global-search-heading">
                    Search Results ({results.length})
                  </div>

                  {results.map((result) => (
                    <button
                      type="button"
                      className="global-search-result"
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                    >
                      <span className="global-search-result-icon">
                        {result.type === "note" ? "📝" : "📄"}
                      </span>

                      <span className="global-search-result-content">
                        <span className="global-search-result-title">
                          {result.title}
                        </span>

                        <span className="global-search-result-snippet">
                          {result.type === "note"
                            ? result.snippet
                            : "Document"}
                        </span>
                      </span>

                      <span className="global-search-result-type">
                        {result.type === "note" ? "Note" : "Document"}
                      </span>
                    </button>
                  ))}
                </>
              )}
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
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
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
  );
}
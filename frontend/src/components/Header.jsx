

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Header.css";

export default function Header({
  userName = "",
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  showSearch = true,
}) {
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState(userName);

  // Keep avatar updated when parent receives user profile.
  useEffect(() => {
    if (userName) {
      setAccountName(userName);
    }
  }, [userName]);

  // Fetch authenticated user's name when not provided.
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
        <div className="header-search">
          <span className="header-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) =>
              onSearchChange?.(event.target.value)
            }
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div className="header-actions">

        {/* Notification Icon */}
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

        {/* Profile Avatar */}
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

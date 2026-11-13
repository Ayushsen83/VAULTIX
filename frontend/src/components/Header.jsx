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

  // Keep the avatar updated when the parent receives the user profile.
  useEffect(() => {
    if (userName) {
      setAccountName(userName);
    }
  }, [userName]);

  // Fetch the authenticated user's name on pages that don't provide it.
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
            onChange={(event) => onSearchChange?.(event.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <button
        type="button"
        className="header-avatar"
        onClick={() => navigate("/profile")}
        aria-label={`Open profile for ${accountName || "user"}`}
        title="View profile"
      >
        {initial}
      </button>
    </header>
  );
}

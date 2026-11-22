import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Sidebar.css";

function MenuIcon({ close = false }) {
  return (
    <span className={`sidebar-menu-icon ${close ? "is-close" : ""}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

function HomeIcon() {
  return (
    <span className="sidebar-link-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    </span>
  );
}

function DocumentsIcon() {
  return (
    <span className="sidebar-link-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3h9l5 5v13H6z" />
        <path d="M15 3v5h5" />
        <path d="M9 13h7M9 17h7" />
      </svg>
    </span>
  );
}

function NotesIcon() {
  return (
    <span className="sidebar-link-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3h14v18H5z" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
        <path d="m15 3 4 4" />
      </svg>
    </span>
  );
}

function ProfileIcon() {
  return (
    <span className="sidebar-link-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    </span>
  );
}

function LogoutIcon() {
  return (
    <span className="sidebar-link-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
    </span>
  );
}

export default function Sidebar({
  collapsed: controlledCollapsed,
  setCollapsed: controlledSetCollapsed,
  mobileOpen: controlledMobileOpen,
  setMobileOpen: controlledSetMobileOpen,
}) {
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setCollapsed = controlledSetCollapsed || setInternalCollapsed;

  const isMobileOpen =
    controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const setMobileOpen = controlledSetMobileOpen || setInternalMobileOpen;

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setMobileOpen(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      {!isMobileOpen && (
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
          aria-expanded={isMobileOpen}
          aria-controls="vaultix-sidebar"
        >
          <MenuIcon />
        </button>
      )}

      {/* Background overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Main sidebar */}
      <aside
        id="vaultix-sidebar"
        className={[
          "app-sidebar",
          isCollapsed ? "is-collapsed" : "",
          isMobileOpen ? "is-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Brand section */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-content">
            <img
              src="/QuadravaulLogo.png"
              alt="Vaultix Logo"
              className="sidebar-brand-logo-img"
            />

            <div className="sidebar-brand-text">
              <h2>VAULTIX</h2>
              <span>Your Digital Locker</span>
            </div>
          </div>

          {/* Desktop collapse button */}
          <button
            type="button"
            className="sidebar-toggle desktop-toggle"
            onClick={() => setCollapsed((previous) => !previous)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <MenuIcon />
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            className="sidebar-toggle mobile-toggle"
            onClick={closeMobileSidebar}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <MenuIcon close />
          </button>
        </div>

        {/* Navigation section */}
        <nav className="sidebar-navigation">
          <NavLink
            to="/home"
            end
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            title="Home"
          >
            <HomeIcon />
            <span className="sidebar-link-text">Home</span>
          </NavLink>

          <NavLink
            to="/documents"
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            title="Documents"
          >
            <DocumentsIcon />
            <span className="sidebar-link-text">Documents</span>
          </NavLink>

          <NavLink
            to="/notes"
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            title="Notes"
          >
            <NotesIcon />
            <span className="sidebar-link-text">Notes</span>
          </NavLink>

          <NavLink
            to="/profile"
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            title="Profile"
          >
            <ProfileIcon />
            <span className="sidebar-link-text">Profile</span>
          </NavLink>
        </nav>

        {/* Logout section */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logout"
          >
            <LogoutIcon />
            <span className="sidebar-link-text">
              {loggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
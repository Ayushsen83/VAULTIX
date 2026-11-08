
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">V</div>

        <div>
          <h2>VAULTIX</h2>
          <span>Your Digital Locker</span>
        </div>
      </div>

      <nav className="sidebar-navigation">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">⌂</span>
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/Documents"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">▤</span>
          <span>Documents</span>
        </NavLink>

        <NavLink
          to="/notes"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">▧</span>
          <span>Notes</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">♙</span>
          <span>Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span className="sidebar-link-icon">↪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

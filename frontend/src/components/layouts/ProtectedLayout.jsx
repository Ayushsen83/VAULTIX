
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar";
import "./ProtectedLayout.css";

export default function ProtectedLayout() {
  return (
    <div className="protected-layout">
      <Sidebar />

      <main className="protected-content">
        <Outlet />
      </main>
    </div>
  );
}

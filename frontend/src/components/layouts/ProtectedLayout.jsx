
// import React from "react";
// import { Outlet } from "react-router-dom";
// import Sidebar from "../sidebar";
// import "./ProtectedLayout.css";

// export default function ProtectedLayout() {
//   return (
//     <div className="protected-layout">
//       <Sidebar />

//       <main className="protected-content">
//         <Outlet />
//       </main>
//     </div>
//   );
// }



import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar";
import "./ProtectedLayout.css";

export default function ProtectedLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className={`protected-layout ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="protected-content">
        <Outlet />
      </main>
    </div>
  );
}

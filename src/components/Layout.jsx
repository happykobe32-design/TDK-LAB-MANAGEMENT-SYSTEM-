import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({
  user,
  page,
  setPage,
  handleLogout,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="page">
      <Sidebar
        user={user}
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        handleLogout={handleLogout}
      />

      <div className="page-wrapper">
        <Topbar
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}

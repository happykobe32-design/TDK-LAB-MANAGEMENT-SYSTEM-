export default function Sidebar({
  user,
  page,
  setPage,
  open,
  handleLogout,
}) {
  // 允許 user 既可能是字串(舊)也可能是物件(新)
  const role = typeof user === "string" ? user : user?.role;
  const userLabel =
    typeof user === "string" ? user : user?.name || user?.username || "-";

  // 你要的「page 變成 role.功能」命名
  const menuByRole = {
    admin: [
      { key: "dashboard", label: "Dashboard" },

      // Admin only（依你會議圖）
      { key: "permission", label: "Permission Maintenance" },
      { key: "config", label: "Configuration Maintenance" },

      // Project
      { key: "project.create", label: "Project - Create/Edit" },
      { key: "project.search", label: "Project - View/Search" },

      // Admin 也可以看 Run Card / 操作（最大權限）
      { key: "runCard.list", label: "Run Cards" },
      { key: "runCard.create", label: "New Run Card" },
      { key: "checkinout", label: "Check In / Out" },
    ],
    engineer: [
      { key: "dashboard", label: "Dashboard" },
      { key: "runCard.list", label: "Run Cards" },
      { key: "runCard.create", label: "New Run Card" },
    ],
    technician: [
      { key: "dashboard", label: "Dashboard" },
      { key: "checkinout", label: "Check In / Out" },
    ],
  };

  const menus = menuByRole[role] || [
    { key: "dashboard", label: "Dashboard" },
  ];

  return (
    <aside
      className={`navbar navbar-vertical navbar-expand-lg ${open ? "" : "d-none"}`}
      data-bs-theme="dark"
      style={{ width: 250 }}
    >
      <div className="container-fluid">
        <h1 className="navbar-brand navbar-brand-autodark">
          <span className="fw-bold">後台</span>
        </h1>

        <ul className="navbar-nav pt-lg-3">
          {menus.map((m) => (
            <li className="nav-item" key={m.key}>
              <button
                className={`nav-link btn btn-link text-start w-100 ${
                  page === m.key ? "active" : ""
                }`}
                onClick={() => setPage(m.key)}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto px-3 pb-3">
          <div className="text-muted mb-1">使用者：{userLabel}</div>
          <div className="text-muted mb-2">身分：{role || "-"}</div>

          <button className="btn btn-danger w-100" onClick={handleLogout}>
            登出
          </button>
        </div>
      </div>
    </aside>
  );
}

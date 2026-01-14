import { useState, useEffect, useRef } from "react";
// 引入 React Router 相關組件
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

// 頁面組件導入
import PermissionMaintenancePage from "./pages/admin/PermissionMaintenancePage";
import ConfigurationMaintenancePage from "./pages/admin/ConfigurationMaintenancePage";
import StressConfigPage from "./pages/admin/StressConfigPage"; // 新增的獨立設定頁
import RunCardListPage from "./pages/shared/RunCardListPage";
import RunCardEditPage from "./pages/shared/RunCardEditPage";
import RunCardFormPage from "./pages/engineer/RunCardCreatePage";
import CheckInOutPage from "./pages/technician/CheckInOutPage";
import PageLayout from "./components/PageLayout";

// ==================================================
// 系統常數
const ROLES = {
  ADMIN: "admin",
  ENGINEER: "engineer",
  TECHNICIAN: "technician",
};

const STATUS = {
  INIT: "Init",
  IN_PROCESS: "In-process",
  COMPLETED: "Completed",
  INVALID: "Invalid",
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation(); // 取得當前路徑
  
  // 從 sessionStorage 讀取登入狀態
  const [user, setUser] = useState(() => sessionStorage.getItem("logged_user"));
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem("logged_role"));

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // RunCard 資料庫存取
  const [runCards, setRunCards] = useState(() => {
    const saved = localStorage.getItem("runCards_db");
    return saved ? JSON.parse(saved) : [];
  });

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [configSubMenuOpen, setConfigSubMenuOpen] = useState(false); 
  const userMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("runCards_db", JSON.stringify(runCards));
  }, [runCards]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 判定是否為當前頁面（用於側邊欄高亮）
  const isActive = (path) => location.pathname === path;

  // 登入邏輯
  const handleLogin = () => {
    const { username, password } = loginData;
    if (password !== "1234") return alert("密碼錯誤");

    let loggedUser = "";
    let loggedRole = "";

    if (username === "admin") {
      loggedUser = "Admin User";
      loggedRole = ROLES.ADMIN;
      navigate("/permission"); 
    } else if (username === "engineer") {
      loggedUser = "Engineer Chris";
      loggedRole = ROLES.ENGINEER;
      navigate("/create"); 
    } else if (username === "technician") {
      loggedUser = "Tech Sam";
      loggedRole = ROLES.TECHNICIAN;
      navigate("/checkinout");
    } else {
      return alert("帳號不存在 (admin / engineer / technician)");
    }

    setUser(loggedUser);
    setUserRole(loggedRole);
    sessionStorage.setItem("logged_user", loggedUser);
    sessionStorage.setItem("logged_role", loggedRole);
    setSidebarOpen(false);
  };

  // 登出邏輯
  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    sessionStorage.removeItem("logged_user");
    sessionStorage.removeItem("logged_role");
    setLoginData({ username: "", password: "" });
    navigate("/");
    setSidebarOpen(false);
  };

  // 產生序號 (YYYYMMDD-XXX)
  const generateSerialId = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = runCards.filter((rc) => rc.id.startsWith(today)).length + 1;
    return `${today}-${String(count).padStart(3, "0")}`;
  };

  // 新增 RunCard
  const handleFinalSubmit = (runCardData) => {
    if (userRole === ROLES.TECHNICIAN) return alert("技術員無權限新增");
    const newCard = {
      id: generateSerialId(),
      status: STATUS.INIT,
      creator: user,
      createdAt: new Date().toISOString(),
      lastModifiedUser: user,
      lastModifiedTime: new Date().toLocaleString(),
      ...runCardData,
    };
    setRunCards((prev) => [...prev, newCard]);
  };

  // 刪除 RunCard
  const handleDelete = (id) => {
    if (userRole === ROLES.TECHNICIAN) return alert("技術員無權限");
    if (userRole === ROLES.ADMIN) {
      setRunCards((prev) => prev.filter((rc) => rc.id !== id));
    } else {
      setRunCards((prev) =>
        prev.map((rc) => (rc.id === id ? { ...rc, status: STATUS.INVALID } : rc))
      );
    }
  };

  const handleEdit = (id) => {
    const card = runCards.find((rc) => rc.id === id);
    if (!card) return;
    setEditingId(id);
    setEditFormData(card);
    navigate("/edit");
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = () => {
    setRunCards((prev) =>
      prev.map((rc) =>
        rc.id === editingId
          ? { ...rc, ...editFormData, lastModifiedUser: user, lastModifiedTime: new Date().toLocaleString() }
          : rc
      )
    );
    setEditingId(null);
    setEditFormData({});
    navigate("/list");
  };

  const handleCheckInOut = (id, action) => {
    setRunCards((prev) =>
      prev.map((rc) =>
        rc.id === id
          ? {
              ...rc,
              status: action === "Check-in" ? STATUS.IN_PROCESS : STATUS.COMPLETED,
              lastModifiedUser: user,
              lastModifiedTime: new Date().toLocaleString(),
            }
          : rc
      )
    );
  };

  // 未登入介面
  if (!user) {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <div className="text-center mb-4">
            <h1 className="fw-bold mb-1">LAB MANAGEMENT SYSTEM</h1>
          </div>
          <div className="card card-md shadow-sm">
            <div className="card-body">
              <h2 className="h3 text-center mb-4">Log in</h2>
              <div className="mb-3">
                <label className="form-label">User ID (admin / engineer / technician)</label>
                <input
                  className="form-control"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                />
              </div>
              <button className="btn btn-primary w-100" onClick={handleLogin}>Login</button>
              <div className="text-muted text-center mt-3 small">預設密碼：1234</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === ROLES.ADMIN;
  const isEngineer = userRole === ROLES.ENGINEER;
  const isTechnician = userRole === ROLES.TECHNICIAN;

  // 選單項目通用樣式
  const navItemStyle = (path) => ({
    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
    backgroundColor: isActive(path) ? "rgba(0, 0, 0, 0.25)" : "transparent",
    borderLeft: isActive(path) ? "4px solid #3b82f6" : "4px solid transparent",
    transition: "all 0.2s ease"
  });

  return (
    <div className={`page ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      {/* 側邊導覽列 */}
      <aside
        className={`navbar navbar-vertical navbar-expand-lg ${sidebarOpen ? "show" : "d-none"}`}
        data-bs-theme="dark"
        style={{
          width: 260,
          position: "fixed",
          zIndex: 1050,
          height: "100vh",
          backgroundColor: "#1e3a8a", 
          borderRight: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <div className="container-fluid px-0">
          <div className="px-4 py-4 border-bottom" style={{ borderColor: "rgba(255, 255, 255, 0.2) !important" }}>
            <h1 className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2" style={{ color: "#ffffff", fontSize: "1.2rem", letterSpacing: "1px" }}>
              <span>⚙️</span> SYSTEM MENU
            </h1>
          </div>
          <ul className="navbar-nav px-0">
            {isAdmin && (
              <li className="nav-item" style={navItemStyle("/permission")}>
                <button
                  className={`nav-link btn w-100 text-start px-4 py-3 ${isActive("/permission") ? "active fw-bold text-white" : ""}`}
                  onClick={() => { navigate("/permission"); setSidebarOpen(false); }}
                >
                  🔐 Permission Maintenance
                </button>
              </li>
            )}

            {isAdmin && (
              <li className="nav-item">
                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.15)" }}>
                  <button
                    className="nav-link btn w-100 text-start px-4 py-3 d-flex align-items-center"
                    onClick={() => setConfigSubMenuOpen(!configSubMenuOpen)}
                  >
                    <span className="flex-grow-1">🛠️ Configuration Maintenance</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                      {configSubMenuOpen ? "▼" : "▶"}
                    </span>
                  </button>
                </div>
                {/* 子選單：Product Family & Stress Settings */}
                {configSubMenuOpen && (
                  <ul className="list-unstyled mb-0">
                    <li style={navItemStyle("/config")}>
                      <button
                        className={`nav-link btn w-100 text-start px-5 py-2 ${isActive("/config") ? "active fw-bold text-white" : ""}`}
                        onClick={() => { navigate("/config"); setSidebarOpen(false); }}
                      >
                        <span className="me-2">•</span> Product Family
                      </button>
                    </li>
                    <li style={navItemStyle("/stress-config")}>
                      <button
                        className={`nav-link btn w-100 text-start px-5 py-2 ${isActive("/stress-config") ? "active fw-bold text-white" : ""}`}
                        onClick={() => { navigate("/stress-config"); setSidebarOpen(false); }}
                      >
                        <span className="me-2">•</span> Test Settings
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {(isAdmin || isEngineer) && (
              <li className="nav-item" style={navItemStyle("/list")}>
                <button
                  className={`nav-link btn w-100 text-start px-4 py-3 ${isActive("/list") ? "active fw-bold text-white" : ""}`}
                  onClick={() => { navigate("/list"); setSidebarOpen(false); }}
                >
                  🔍 Project View / Search
                </button>
              </li>
            )}
            {(isAdmin || isEngineer) && (
              <li className="nav-item" style={navItemStyle("/create")}>
                <button
                  className={`nav-link btn w-100 text-start px-4 py-3 ${isActive("/create") ? "active fw-bold text-white" : ""}`}
                  onClick={() => { navigate("/create"); setSidebarOpen(false); }}
                >
                  ➕ Create Project
                </button>
              </li>
            )}
            {(isAdmin || isTechnician) && (
              <li className="nav-item" style={navItemStyle("/checkinout")}>
                <button
                  className={`nav-link btn w-100 text-start px-4 py-3 ${isActive("/checkinout") ? "active fw-bold text-white" : ""}`}
                  onClick={() => { navigate("/checkinout"); setSidebarOpen(false); }}
                >
                  ⏱️ Check In / Out
                </button>
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* 主要內容區域 */}
      <div
        className="page-wrapper"
        style={{
          marginLeft: sidebarOpen ? 260 : 0,
          transition: "margin 0.3s",
        }}
      >
        <div className="page-header" style={{ background: "#1e3a8a", padding: "12px 20px", color: "#ffffff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", margin: 0 }}>
          <div className="d-flex align-items-center">
            <button className="navbar-toggler me-3 d-block" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
            <div>
              <h2 className="page-title" style={{ margin: 0, color: "#ffffff", fontWeight: "700", letterSpacing: "1px", fontSize: "1.25rem" }}>
                LAB MANAGEMENT SYSTEM
              </h2>
            </div>
            <div className="ms-auto position-relative" ref={userMenuRef}>
              <button className="btn btn-link d-flex align-items-center text-decoration-none" style={{ color: "#ffffff", padding: 0 }} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className="avatar avatar-sm bg-blue-lt me-2" style={{ border: "1px solid #fff" }}>{user?.charAt(0)}</span>
                <div className="text-start d-none d-md-block">
                  <div className="fw-bold small" style={{ lineHeight: "1.2" }}>{user}</div>
                  <div style={{ fontSize: "10px", color: "#cbd5e1" }}>{userRole?.toUpperCase()}</div>
                </div>
              </button>
              {userMenuOpen && (
                <div className="dropdown-menu dropdown-menu-end show shadow" style={{ position: "absolute", right: 0, marginTop: "8px" }}>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page-body" style={{ padding: 0, margin: 0 }}>
          <Routes>
            {/* 管理員專用 */}
            <Route path="/permission" element={isAdmin ? (<PageLayout title="Permission Maintenance" icon="🔐"><PermissionMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/config" element={isAdmin ? (<PageLayout title="Configuration Maintenance" icon="🛠️"><ConfigurationMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/stress-config" element={isAdmin ? (<PageLayout title="Configuration Maintenance" icon="🛠️"><StressConfigPage /></PageLayout>) : <Navigate to="/list" />} />
            
            {/* 共用與角色路由 */}
            <Route path="/list" element={(isAdmin || isEngineer) ? (<PageLayout title="Project View / Search" icon="🔍"><RunCardListPage runCards={runCards} userRole={userRole} handleEdit={handleEdit} handleDelete={handleDelete} /></PageLayout>) : <Navigate to="/checkinout" />} />
            <Route path="/create" element={(isAdmin || isEngineer) ? (<PageLayout title="Create Project" icon="➕"><RunCardFormPage handleFinalSubmit={handleFinalSubmit} /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/edit" element={(<PageLayout title="Edit Project" icon="✏️"><RunCardEditPage userRole={userRole} editingId={editingId} editFormData={editFormData} handleEditFormChange={handleEditFormChange} handleEditSubmit={handleEditSubmit} setPage={(p) => navigate("/"+p)} /></PageLayout>)} />
            <Route path="/checkinout" element={(isAdmin || isTechnician) ? (<PageLayout title="Check In / Out" icon="⏱️"><CheckInOutPage handleCheckInOutProp={handleCheckInOut} /></PageLayout>) : <Navigate to="/list" />} />
            
            {/* 預設路由 */}
            <Route path="/" element={<Navigate to={isAdmin ? "/permission" : (isEngineer ? "/create" : "/checkinout")} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
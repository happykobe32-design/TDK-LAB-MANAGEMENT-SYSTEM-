import { useState, useEffect, useRef } from "react";
// 引入 React Router 相關組件
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import logoImg from "./assets/company-logo.png";
// === 引入外部翻譯設定 ===
import "./i18n"; 
import { useTranslation } from "react-i18next";
// 頁面組件導入
import PermissionMaintenancePage from "./pages/admin/PermissionMaintenancePage";
import ConfigurationMaintenancePage from "./pages/admin/ConfigurationMaintenancePage";
import StressConfigPage from "./pages/admin/StressConfigPage"; 
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [user, setUser] = useState(() => sessionStorage.getItem("logged_user"));
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem("logged_role"));

  const [loginData, setLoginData] = useState({ username: "", password: "" });

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

  const isActive = (path) => location.pathname === path;

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

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    sessionStorage.removeItem("logged_user");
    sessionStorage.removeItem("logged_role");
    setLoginData({ username: "", password: "" });
    navigate("/");
    setSidebarOpen(false);
  };

  const generateSerialId = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = runCards.filter((rc) => rc.id.startsWith(today)).length + 1;
    return `${today}-${String(count).padStart(3, "0")}`;
  };

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

  const changeLanguage = (lng) => { i18n.changeLanguage(lng); };

  const langButtonStyle = (lang) => ({
    color: i18n.language.startsWith(lang) ? "#ffffff" : "rgba(255,255,255,0.5)",
    fontWeight: i18n.language.startsWith(lang) ? "bold" : "normal",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "background 0.2s",
    textDecoration: "none",
    background: "transparent",
    border: "none",
    fontSize: "0.85rem"
  });

  if (!user) {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <div className="text-center mb-4">
            <h1 className="fw-bold mb-1">{t("SYSTEM_TITLE")}</h1>
            <div className="mt-2">
              <button className="btn btn-sm btn-ghost-primary" onClick={() => changeLanguage('en')}>EN</button>
              <span className="mx-1 text-muted">|</span>
              <button className="btn btn-sm btn-ghost-primary" onClick={() => changeLanguage('zh')}>中文</button>
            </div>
          </div>
          <div className="card card-md shadow-sm">
            <div className="card-body">
              <h2 className="h3 text-center mb-4">{t("LOGIN")}</h2>
              <div className="mb-3">
                <label className="form-label">{t("USER_ID")}</label>
                <input className="form-control" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("PASSWORD")}</label>
                <input type="password" className="form-control" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
              </div>
              <button className="btn btn-primary w-100" onClick={handleLogin}>{t("LOGIN")}</button>
              <div className="text-muted text-center mt-3 small">{t("PW_HINT")}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === ROLES.ADMIN;
  const isEngineer = userRole === ROLES.ENGINEER;
  const isTechnician = userRole === ROLES.TECHNICIAN;

  const navItemStyle = (path) => ({
    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
    backgroundColor: isActive(path) ? "rgba(0, 0, 0, 0.25)" : "transparent",
    borderLeft: isActive(path) ? "4px solid #3b82f6" : "4px solid transparent",
    transition: "all 0.2s ease"
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <style>{`
        .lang-btn:hover { background: rgba(255, 255, 255, 0.1) !important; color: #fff !important; }
        .nav-link:hover { background: rgba(0, 0, 0, 0.1); }
        /* 核心修正：強制移除標題欄與內容區的所有外距 */
        .page-header { margin-bottom: 0 !important; }
        .page-body { margin-top: 0 !important; }
      `}</style>

      {/* 獨立頂欄 */}
      <header className="page-header" style={{ 
        background: "#1e3a8a", 
        padding: "10px 20px", 
        color: "#ffffff", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
        zIndex: 1100, 
        flexShrink: 0, 
        margin: 0 
      }}>
        <div className="d-flex align-items-center w-100">
          <button className="navbar-toggler me-3 d-block" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div className="d-flex align-items-center" style={{ marginLeft: "-10px" }}> 
            <img src={logoImg} alt="Logo" style={{ height: "22px", width: "auto", marginRight: "10px" }} />
            <h2 className="page-title" style={{ margin: 0, color: "#ffffff", fontWeight: "600", letterSpacing: "1px", fontSize: "1.2rem" }}>
              {t("SYSTEM_TITLE")}
            </h2>
          </div>
          
          <div className="ms-auto d-flex align-items-center gap-1 me-3">
            <button className="lang-btn" style={langButtonStyle('en')} onClick={() => changeLanguage('en')}>EN</button>
            <span className="text-white-50 small">|</span>
            <button className="lang-btn" style={langButtonStyle('zh')} onClick={() => changeLanguage('zh')}>中文</button>
          </div>

          <div className="position-relative" ref={userMenuRef}>
            <button className="btn btn-link d-flex align-items-center text-decoration-none p-0" style={{ color: "#ffffff" }} onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span className="avatar avatar-sm bg-blue-lt me-2" style={{ border: "1px solid #fff" }}>{user?.charAt(0)}</span>
              <div className="text-start d-none d-md-block">
                <div className="fw-bold small" style={{ lineHeight: "1.2" }}>{user}</div>
                <div style={{ fontSize: "10px", color: "#cbd5e1" }}>{userRole?.toUpperCase()}</div>
              </div>
            </button>
            {userMenuOpen && (
              <div className="dropdown-menu dropdown-menu-end show shadow" style={{ position: "absolute", right: 0, marginTop: "8px" }}>
                <button className="dropdown-item text-danger" onClick={handleLogout}>{t("LOGOUT")}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 下方主要區域 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", marginTop: 0 }}>
        
        {/* 側邊欄 */}
        <aside
          className={`navbar navbar-vertical navbar-expand-lg ${sidebarOpen ? "show" : "d-none"}`}
          data-bs-theme="dark"
          style={{
            width: 270,
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1050,
            backgroundColor: "#1e3a8a", 
            borderRight: "1px solid rgba(255, 255, 255, 0.15)",
            margin: 0
          }}
        >
          <div className="container-fluid px-0">
            <div className="px-0 py-2 border-bottom" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
              <h1 className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2" style={{ color: "#ffffff", fontSize: "1.2rem", letterSpacing: "0px" }}>
                <span>⚙️</span> {t("MENU_MAIN")}
              </h1>
            </div>
            <ul className="navbar-nav px-0">
              {isAdmin && (
                <li className="nav-item" style={navItemStyle("/permission")}>
                  <button className={`nav-link btn w-100 text-start px-4 py-3 m-0 ${isActive("/permission") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/permission"); setSidebarOpen(false); }}>
                    🔐 {t("NAV_PERMISSION")}
                  </button>
                </li>
              )}
              {isAdmin && (
                <li className="nav-item">
                  <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.15)" }}>
                    <button className="nav-link btn w-100 text-start px-4 py-3 m-0 d-flex align-items-center" onClick={() => setConfigSubMenuOpen(!configSubMenuOpen)}>
                      <span className="flex-grow-1">🛠️ {t("NAV_CONFIG")}</span>
                      <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>{configSubMenuOpen ? "▼" : "▶"}</span>
                    </button>
                  </div>
                  {configSubMenuOpen && (
                    <ul className="list-unstyled mb-0">
                      <li style={navItemStyle("/config")}>
                        <button className={`nav-link btn w-100 text-start px-5 py-2 m-0 ${isActive("/config") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/config"); setSidebarOpen(false); }}>
                          <span className="me-2">•</span> {t("NAV_PROD_FAMILY")}
                        </button>
                      </li>
                      <li style={navItemStyle("/stress-config")}>
                        <button className={`nav-link btn w-100 text-start px-5 py-2 m-0 ${isActive("/stress-config") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/stress-config"); setSidebarOpen(false); }}>
                          <span className="me-2">•</span> {t("NAV_TEST_SET")}
                        </button>
                      </li>
                    </ul>
                  )}
                </li>
              )}
              {(isAdmin || isEngineer) && (
                <li className="nav-item" style={navItemStyle("/list")}>
                  <button className={`nav-link btn w-100 text-start px-4 py-3 m-0 ${isActive("/list") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/list"); setSidebarOpen(false); }}>
                    🔍 {t("NAV_VIEW")}
                  </button>
                </li>
              )}
              {(isAdmin || isEngineer) && (
                <li className="nav-item" style={navItemStyle("/create")}>
                  <button className={`nav-link btn w-100 text-start px-4 py-3 m-0 ${isActive("/create") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/create"); setSidebarOpen(false); }}>
                    ➕ {t("NAV_CREATE")}
                  </button>
                </li>
              )}
              {(isAdmin || isTechnician) && (
                <li className="nav-item" style={navItemStyle("/checkinout")}>
                  <button className={`nav-link btn w-100 text-start px-4 py-3 m-0 ${isActive("/checkinout") ? "active fw-bold text-white" : ""}`} onClick={() => { navigate("/checkinout"); setSidebarOpen(false); }}>
                    ⏱️ {t("NAV_CHECK")}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </aside>

        {/* 分頁內容區 */}
        <main
          className="page-body"
          style={{
            flex: 1,
            marginLeft: sidebarOpen ? 270 : 0,
            transition: "margin-left 0.3s ease",
            overflowY: "auto",
            backgroundColor: "#f8fafc",
            padding: 0,
            margin: 0
          }}
        >
          <Routes>
            <Route path="/permission" element={isAdmin ? (<PageLayout title={t("NAV_PERMISSION")} icon="🔐"><PermissionMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/config" element={isAdmin ? (<PageLayout title={t("NAV_CONFIG")} icon="🛠️"><ConfigurationMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/stress-config" element={isAdmin ? (<PageLayout title={t("NAV_CONFIG")} icon="🛠️"><StressConfigPage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/list" element={(isAdmin || isEngineer) ? (<PageLayout title={t("NAV_VIEW")} icon="🔍"><RunCardListPage runCards={runCards} userRole={userRole} handleEdit={handleEdit} handleDelete={handleDelete} /></PageLayout>) : <Navigate to="/checkinout" />} />
            <Route path="/create" element={(isAdmin || isEngineer) ? (<PageLayout title={t("NAV_CREATE")} icon="➕"><RunCardFormPage handleFinalSubmit={handleFinalSubmit} /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/edit" element={(<PageLayout title={t("EDIT_PROJ")} icon="✏️"><RunCardEditPage userRole={userRole} editingId={editingId} editFormData={editFormData} handleEditFormChange={handleEditFormChange} handleEditSubmit={handleEditSubmit} setPage={(p) => navigate("/"+p)} /></PageLayout>)} />
            <Route path="/checkinout" element={(isAdmin || isTechnician) ? (<PageLayout title={t("NAV_CHECK")} icon="⏱️"><CheckInOutPage handleCheckInOutProp={handleCheckInOut} /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/" element={<Navigate to={isAdmin ? "/permission" : (isEngineer ? "/create" : "/checkinout")} />} />
          </Routes>
        </main>
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
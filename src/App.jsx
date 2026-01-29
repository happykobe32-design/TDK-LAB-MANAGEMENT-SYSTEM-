import { useState, useEffect, useRef } from "react";
// 引入 React Router 相關組件
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import logoImg from "./assets/company-logo.png";

// === 引入 Lucide 專業圖示 ===
import { 
  LayoutGrid, 
  ShieldCheck, 
  Settings, 
  Search, 
  PlusCircle, 
  ClipboardCheck, 
  FileEdit,
  ChevronRight,
  ChevronDown,
  Menu // 引入專業選單圖示
} from 'lucide-react';

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

//登入頁面//
  if (!user) {
    return (
      <div className="page page-center">
        <div className="container container-tight py-4">
          <div className="text-center mb-4">
            {/* Flex 容器：讓 LOGO 與文字橫向排列並置中 */}
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <img 
                src={logoImg} 
                alt="Logo" 
                style={{ 
                  height: "30px",          // 手動調整：LOGO 高度
                  width: "auto", 
                  filter: "invert(0.8) brightness(0.5)", // 顏色修正：讓白色 LOGO 變深
                  flexShrink: 0            // 防止 LOGO 被壓縮
                }} 
              />
              <h1 className="fw-bold m-0" style={{ 
                fontSize: "1.6rem", 
                color: "#030303ff",          // 標題顏色
                whiteSpace: "nowrap"       // 強制標題不換列
              }}>
                {t("SYSTEM_TITLE")}
              </h1>
            </div>
            
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
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: isActive(path) ? "#eff6ff" : "transparent",
    borderLeft: isActive(path) ? "4px solid #2563eb" : "4px solid transparent",
    transition: "all 0.2s ease",
    color: isActive(path) ? "#1e40af" : "#475569"
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <style>{`
        .lang-btn:hover { background: rgba(255, 255, 255, 0.1) !important; color: #fff !important; }
        .sidebar-link:hover { 
          background-color: #f8fafc !important; 
          color: #2563eb !important; 
        }
        /* 頂欄按鈕 Hover 效果 */
        .header-btn:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border-radius: 4px;
        }
        .page-header { margin-bottom: 0 !important; }
        .page-body { margin-top: 0 !important; }
      `}</style>

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
          {/* 選單圖示 Hover 灰底效果 */}
          <button className="btn btn-link header-btn p-0 me-1 text-white border-0 shadow-none d-flex align-items-center" onClick={() => setSidebarOpen((v) => !v)}>
            <Menu size={24} />
          </button>
          
          <div className="d-flex align-items-center" style={{ marginLeft: "0px" }}> 
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
            {/* 使用者選單 Hover 灰底效果 */}
            <button className="btn btn-link header-btn d-flex align-items-center text-decoration-none px-2 py-1" style={{ color: "#ffffff", border: "none" }} onClick={() => setUserMenuOpen(!userMenuOpen)}>
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", marginTop: 0 }}>
        
        <aside
          className={`navbar navbar-vertical navbar-expand-lg ${sidebarOpen ? "show" : "d-none"}`}
          style={{
            width: 270,
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1050,
            backgroundColor: "#ffffff", 
            borderRight: "1px solid #e2e8f0", 
            margin: 0,
            boxShadow: "none"
          }}
        >
          <div className="container-fluid px-0">
            <div className="px-4 border-bottom" style={{ borderColor: "#f1f5f9", paddingTop: "8px", paddingBottom: "10px" }}>
              <h1 className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2" style={{ color: "#0f172a", fontSize: "1.05rem" }}>
                <LayoutGrid size={18} strokeWidth={2.2} /> {t("MENU_MAIN")}
              </h1>
            </div>
            <ul className="navbar-nav px-0 pt-2">
              {isAdmin && (
                <li className="nav-item" style={navItemStyle("/permission")}>
                  <button className={`nav-link btn w-100 text-start  py-3 m-0 d-flex align-items-center sidebar-link ${isActive("/permission") ? "active fw-bold" : ""}`} style={{ color: "inherit",justifyContent: "flex-start" }} onClick={() => { navigate("/permission"); setSidebarOpen(false); }}>
                    <ShieldCheck size={18} className="me-2" /> {t("NAV_PERMISSION")}
                  </button>
                </li>
              )}

              {isAdmin && (
                <li className="nav-item">
                  <div style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {/* 修正重點：使用 flex-grow-1 讓文字撐開，並給箭頭固定空間 */}
                    <button 
                      className="nav-link btn w-100 text-start  py-3 m-0 d-flex align-items-center sidebar-link" 
                      style={{ color: "inherit",justifyContent: "flex-start" }} 
                      onClick={() => setConfigSubMenuOpen(!configSubMenuOpen)}
                    >
                      <Settings size={18} className="me-2" style={{ flexShrink: 0 }} />
                      
                      <span className="flex-grow-" style={{ color: "inherit",justifyContent: "flex-start" }}>
                        {t("NAV_CONFIG")}
                      </span>

                      {/* 箭頭容器：確保不被壓縮 */}
                      <div style={{ flexShrink: 0, marginLeft: "8px", display: "flex", alignItems: "center" }}>
                        {configSubMenuOpen ? (
                          <ChevronDown size={16} style={{ opacity: 0.7 }} />
                        ) : (
                          <ChevronRight size={16} style={{ opacity: 0.7 }} />
                        )}
                      </div>
                    </button>
                  </div>
                  
                  {configSubMenuOpen && (
                    <ul className="list-unstyled mb-0" style={{ backgroundColor: "#fbfcfd" }}>
                      <li style={navItemStyle("/config")}>
                        <button className={`nav-link btn w-100 text-start px-5 py-2 m-0 d-flex align-items-center sidebar-link ${isActive("/config") ? "active fw-bold" : ""}`} style={{ color: "inherit", fontSize: "0.9rem", justifyContent: "flex-start" }} onClick={() => { navigate("/config"); setSidebarOpen(false); }}>
                          <span className="me-2">•</span> {t("NAV_PROD_FAMILY")}
                        </button>
                      </li>
                      <li style={navItemStyle("/stress-config")}>
                        <button className={`nav-link btn w-100 text-start px-5 py-2 m-0 d-flex align-items-center sidebar-link ${isActive("/stress-config") ? "active fw-bold" : ""}`} style={{ color: "inherit", fontSize: "0.9rem",  justifyContent: "flex-start" }} onClick={() => { navigate("/stress-config"); setSidebarOpen(false); }}>
                          <span className="me-2">•</span> {t("NAV_TEST_SET")}
                        </button>
                      </li>
                    </ul>
                  )}
                </li>
              )}

              {(isAdmin || isEngineer) && (
                <li className="nav-item" style={navItemStyle("/list")}>
                  <button className={`nav-link btn w-100 text-start  py-3 m-0 d-flex align-items-center sidebar-link ${isActive("/list") ? "active fw-bold" : ""}`} style={{ color: "inherit", justifyContent: "flex-start" }} onClick={() => { navigate("/list"); setSidebarOpen(false); }}>
                    <Search size={18} className="me-2" /> {t("NAV_VIEW")}
                  </button>
                </li>
              )}

              {(isAdmin || isEngineer) && (
                <li className="nav-item" style={navItemStyle("/create")}>
                  <button className={`nav-link btn w-100 text-start  py-3 m-0 d-flex align-items-center sidebar-link ${isActive("/create") ? "active fw-bold" : ""}`} style={{ color: "inherit", justifyContent: "flex-start" }} onClick={() => { navigate("/create"); setSidebarOpen(false); }}>
                    <PlusCircle size={18} className="me-2" /> {t("NAV_CREATE")}
                  </button>
                </li>
              )}

              {(isAdmin || isTechnician) && (
                <li className="nav-item" style={navItemStyle("/checkinout")}>
                  <button className={`nav-link btn w-100 text-start  py-3 m-0 d-flex align-items-center sidebar-link ${isActive("/checkinout") ? "active fw-bold" : ""}`} style={{ color: "inherit", justifyContent: "flex-start" }} onClick={() => { navigate("/checkinout"); setSidebarOpen(false); }}>
                    <ClipboardCheck size={18} className="me-2" /> {t("NAV_CHECK")}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </aside>

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
            <Route path="/permission" element={isAdmin ? (<PageLayout title={t("NAV_PERMISSION")} icon={<ShieldCheck size={20} />}><PermissionMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/config" element={isAdmin ? (<PageLayout title={t("NAV_CONFIG")} icon={<Settings size={20} />}><ConfigurationMaintenancePage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/stress-config" element={isAdmin ? (<PageLayout title={t("NAV_CONFIG")} icon={<Settings size={20} />}><StressConfigPage /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/list" element={(isAdmin || isEngineer) ? (<PageLayout title={t("NAV_VIEW")} icon={<Search size={20} />}><RunCardListPage runCards={runCards} userRole={userRole} handleEdit={handleEdit} handleDelete={handleDelete} /></PageLayout>) : <Navigate to="/checkinout" />} />
            <Route path="/create" element={(isAdmin || isEngineer) ? (<PageLayout title={t("NAV_CREATE")} icon={<PlusCircle size={20} />}><RunCardFormPage handleFinalSubmit={handleFinalSubmit} /></PageLayout>) : <Navigate to="/list" />} />
            <Route path="/edit" element={(<PageLayout title={t("EDIT_PROJ")} icon={<FileEdit size={20} />}><RunCardEditPage userRole={userRole} editingId={editingId} editFormData={editFormData} handleEditFormChange={handleEditFormChange} handleEditSubmit={handleEditSubmit} setPage={(p) => navigate("/"+p)} /></PageLayout>)} />
            <Route path="/checkinout" element={(isAdmin || isTechnician) ? (<PageLayout title={t("NAV_CHECK")} icon={<ClipboardCheck size={20} />}><CheckInOutPage handleCheckInOutProp={handleCheckInOut} /></PageLayout>) : <Navigate to="/list" />} />
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
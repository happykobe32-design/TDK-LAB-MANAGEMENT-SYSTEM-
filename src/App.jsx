import { useState, useEffect, useRef } from "react";
// 引入 React Router 相關組件
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import logoImg from "./assets/company-logo.png";

// === 引入 Lucide 專業圖示 (App 僅保留 Header/Layout 使用的圖示) ===
import { 
  ShieldCheck, 
  Settings, 
  Search, 
  PlusCircle, 
  ClipboardCheck, 
  Menu 
} from 'lucide-react';

// === 引入外部組件 ===
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/Sidebar";
import PageLayout from "./components/PageLayout";

// === 引入外部翻譯設定 ===
import "./constants/i18n"; 
import { useTranslation } from "react-i18next";

// 頁面組件導入
import PermissionMaintenancePage from "./pages/admin/PermissionMaintenancePage";
import ConfigurationMaintenancePage from "./pages/admin/ConfigurationMaintenancePage";
import StressConfigPage from "./pages/admin/StressConfigPage"; 
import RunCardListPage from "./pages/shared/RunCardListPage";
import RunCardFormPage from "./pages/engineer/RunCardCreatePage";
import CheckInOutPage from "./pages/technician/CheckInOutPage";

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

// --- 如果未登入，顯示 LoginPage 元件 ---
  if (!user) {
    return (
      <LoginPage 
        loginData={loginData} 
        setLoginData={setLoginData} 
        handleLogin={handleLogin} 
        changeLanguage={changeLanguage} 
      />
    );
  }

  const isAdmin = userRole === ROLES.ADMIN;
  const isEngineer = userRole === ROLES.ENGINEER;
  const isTechnician = userRole === ROLES.TECHNICIAN;

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <style>{`
        .lang-btn:hover { background: rgba(255, 255, 255, 0.1) !important; color: #fff !important; }
        .sidebar-link:hover { background-color: #f8fafc !important; color: #2563eb !important; }
        .header-btn:hover { background-color: rgba(255, 255, 255, 0.1) !important; border-radius: 4px; }
        .page-header { margin-bottom: 0 !important; }
        .page-body { margin-top: 0 !important; }
      `}</style>

      <header className="page-header" style={{ 
        background: "#1e3a8a", padding: "10px 20px", color: "#ffffff", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", zIndex: 1100, flexShrink: 0, margin: 0 
      }}>
        <div className="d-flex align-items-center w-100">
          <button className="btn btn-link header-btn p-0 me-1 text-white border-0 shadow-none d-flex align-items-center" onClick={() => setSidebarOpen((v) => !v)}>
            <Menu size={24} />
          </button>
          
          <div className="d-flex align-items-center"> 
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
        
        {/* === 抽離後的 Sidebar 元件 === */}
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isAdmin={isAdmin}
          isEngineer={isEngineer}
          isTechnician={isTechnician}
          configSubMenuOpen={configSubMenuOpen}
          setConfigSubMenuOpen={setConfigSubMenuOpen}
        />

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
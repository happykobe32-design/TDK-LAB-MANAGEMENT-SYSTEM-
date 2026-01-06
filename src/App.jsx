import { useState, useEffect, useRef } from "react";
// 引入 React Router 相關組件
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/admin/DashboardPage";
import RunCardListPage from "./pages/shared/RunCardListPage";
import RunCardEditPage from "./pages/shared/RunCardEditPage";
import RunCardFormPage from "./pages/engineer/RunCardCreatePage";
import CheckInOutPage from "./pages/technician/CheckInOutPage";

// ==================================================
// 系統常數(人員分三種)
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

// 為了讓 App 內部可以使用 useNavigate，建立一個內部容器
function AppContent() {
  // ==================================================
  // Global State
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [runCards, setRunCards] = useState(() => {
    const saved = localStorage.getItem("runCards_db");
    return saved ? JSON.parse(saved) : [];
  });

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // ==================================================
  // localStorage sync
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

  // ==================================================
  // Login / Logout
  const handleLogin = () => {
    const { username, password } = loginData;
    if (password !== "1234") return alert("密碼錯誤");

    if (username === "admin") {
      setUser("Admin User");
      setUserRole(ROLES.ADMIN);
      navigate("/dashboard");
    } else if (username === "engineer") {
      setUser("Engineer Chris");
      setUserRole(ROLES.ENGINEER);
      navigate("/create"); 
    } else if (username === "technician") {
      setUser("Tech Sam");
      setUserRole(ROLES.TECHNICIAN);
      navigate("/checkinout");
    } else {
      return alert("帳號不存在 (admin / engineer / technician)");
    }

    setSidebarOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    setLoginData({ username: "", password: "" });
    navigate("/");
    setSidebarOpen(false);
  };

  // ==================================================
  // Run Card Logic
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
    navigate("/list");
  };

  const handleDelete = (id) => {
    if (userRole === ROLES.TECHNICIAN) return alert("技術員無權限");

    if (userRole === ROLES.ADMIN) {
      setRunCards((prev) => prev.filter((rc) => rc.id !== id));
    } else {
      setRunCards((prev) =>
        prev.map((rc) =>
          rc.id === id ? { ...rc, status: STATUS.INVALID } : rc
        )
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
          ? {
              ...rc,
              ...editFormData,
              lastModifiedUser: user,
              lastModifiedTime: new Date().toLocaleString(),
            }
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
              status:
                action === "Check-in"
                  ? STATUS.IN_PROCESS
                  : STATUS.COMPLETED,
              lastModifiedUser: user,
              lastModifiedTime: new Date().toLocaleString(),
            }
          : rc
      )
    );
  };

  // ==================================================
  // Login Page View
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
                <label className="form-label">
                  User ID (admin / engineer / technician)
                </label>
                <input
                  className="form-control"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      username: e.target.value,
                    })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      password: e.target.value,
                    })
                  }
                />
              </div>

              <button
                className="btn btn-primary w-100"
                onClick={handleLogin}
              >
                Login
              </button>

              <div className="text-muted text-center mt-3 small">
                預設密碼：1234
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === ROLES.ADMIN;
  const isEngineer = userRole === ROLES.ENGINEER;
  const isTechnician = userRole === ROLES.TECHNICIAN;

  // ==================================================
  // Main Layout with Routes
  return (
    <div className={`page ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <aside
        className={`navbar navbar-vertical navbar-expand-lg ${sidebarOpen ? "show" : "d-none"}`}
        data-bs-theme="dark"
        style={{
          width: 260,
          position: "fixed",
          zIndex: 1050,
          height: "100vh",
          // --- 關鍵修改：改為與標題一致的深藍色 ---
          backgroundColor: "#1e3a8a", 
          borderRight: "1px solid rgba(255, 255, 255, 0.1)", // 加一條淡淡的右邊框增加層次
        }}
      >
        <div className="container-fluid">
          <h1 className="navbar-brand fw-bold mb-3" style={{ color: "#ffffff", fontSize: "1.5rem" }}>選單</h1>
          <ul className="navbar-nav pt-lg-3">
            {isAdmin && (
              <li className="nav-item">
                <button
                  className="nav-link btn w-100 text-start"
                  onClick={() => {
                    navigate("/dashboard");
                    setSidebarOpen(false);
                  }}
                >
                  Dashboard
                </button>
              </li>
            )}

            {(isAdmin || isEngineer) && (
              <li className="nav-item">
                <button
                  className="nav-link btn w-100 text-start"
                  onClick={() => {
                    navigate("/list");
                    setSidebarOpen(false);
                  }}
                >
                  Project View/Search
                </button>
              </li>
            )}

            {(isAdmin || isEngineer) && (
              <li className="nav-item">
                <button
                  className="nav-link btn w-100 text-start"
                  onClick={() => {
                    navigate("/create");
                    setSidebarOpen(false);
                  }}
                >
                  Create Project
                </button>
              </li>
            )}

            {(isAdmin || isTechnician) && (
              <li className="nav-item">
                <button
                  className="nav-link btn w-100 text-start"
                  onClick={() => {
                    navigate("/checkinout");
                    setSidebarOpen(false);
                  }}
                >
                  Check In / Out
                </button>
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Page Wrapper */}
      <div
        className="page-wrapper"
        style={{
          marginLeft: sidebarOpen ? 260 : 0,
          transition: "margin 0.3s",
        }}
      >
        {/* --- 修改後的深藍色標題列 --- */}
        <div 
          className="page-header" 
          style={{ 
            background: "#1e3a8a", // 使用深藍色
            padding: "12px 0",
            color: "#ffffff",      // 文字為白色
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "1rem"
          }}
        >
          <div className="container-xl d-flex align-items-center">
            {/* 1. 左側漢堡選單按鈕 - 改為白色 */}
            <button
              className="navbar-toggler me-3 d-block"
              style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)", background: "transparent" }}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              ☰
            </button>

            {/* 2. 中央標題區塊 */}
            <div className="flex-grow-1 text-center">
              <h2 className="page-title" style={{ margin: 0, color: "#ffffff", fontWeight: "700", letterSpacing: "1px" }}>
                LAB MANAGEMENT SYSTEM
              </h2>
            </div>

            {/* 3. 右側使用者資訊 - 文字改為白色以利閱讀 */}
            <div className="ms-3 position-relative" ref={userMenuRef}>
              <button
                className="btn btn-link d-flex align-items-center text-decoration-none"
                style={{ color: "#ffffff", padding: 0 }} 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="avatar avatar-sm bg-blue-lt me-2" style={{ border: "1px solid #fff" }}>
                  {user.charAt(0)}
                </span>
                <div className="text-start d-none d-md-block">
                  <div className="fw-bold small" style={{ lineHeight: "1.2" }}>{user}</div>
                  <div style={{ fontSize: "10px", color: "#cbd5e1" }}>
                    {userRole.toUpperCase()}
                  </div>
                </div>
              </button>

              {userMenuOpen && (
                <div
                  className="dropdown-menu dropdown-menu-end show shadow"
                  style={{ position: "absolute", right: 0, marginTop: "8px" }}
                >
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page-body">
          <div className="container-xl">
            <Routes>
              {/* 重點：這裡確保 DashboardPage 收到 navigate 或具備切換頁面的能力 */}
              <Route path="/dashboard" element={isAdmin ? <DashboardPage runCards={runCards} setPage={navigate} /> : <Navigate to="/list" />} />
              <Route path="/list" element={(isAdmin || isEngineer) ? <RunCardListPage runCards={runCards} userRole={userRole} handleEdit={handleEdit} handleDelete={handleDelete} /> : <Navigate to="/checkinout" />} />
              <Route path="/create" element={(isAdmin || isEngineer) ? <RunCardFormPage handleFinalSubmit={handleFinalSubmit} /> : <Navigate to="/list" />} />
              <Route path="/edit" element={<RunCardEditPage userRole={userRole} editingId={editingId} editFormData={editFormData} handleEditFormChange={handleEditFormChange} handleEditSubmit={handleEditSubmit} setPage={(p) => navigate("/"+p)} />} />
              <Route path="/checkinout" element={(isAdmin || isTechnician) ? <CheckInOutPage handleCheckInOutProp={handleCheckInOut} /> : <Navigate to="/list" />} />
              {/* 預設路由 */}
              <Route path="/" element={<Navigate to={isAdmin ? "/dashboard" : (isEngineer ? "/create" : "/checkinout")} />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

// 最外層必須包覆 Router 容器
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
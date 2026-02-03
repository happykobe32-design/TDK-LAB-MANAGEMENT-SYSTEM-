import React from "react";
import { LayoutGrid, ShieldCheck, Settings, Search, PlusCircle, ClipboardCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = ({ sidebarOpen, 
  setSidebarOpen, 
  isAdmin, 
  isEngineer, 
  isTechnician, 
  configSubMenuOpen, 
  setConfigSubMenuOpen 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // 統一導航項目樣式
  const navItemStyle = (path) => ({
    borderBottom: "1px solid #e4e8ecff",
    backgroundColor: isActive(path) ? "#eff6ff" : "transparent",
    transition: "all 0.2s ease",
    color: isActive(path) ? "#1e40af" : "#475569",
    height: "56px",
    display: "flex",
    alignItems: "center",
    overflow: "hidden"
  });

  return (
    <aside
      className={`sidebar-component ${sidebarOpen ? "show" : "d-none"}`}
      style={{
        width: "270px",
        minWidth: "270px",
        maxWidth: "270px",
        position: "fixed", 
        left: 0,
        top: "60px",
        bottom: 0,
        zIndex: 1050,
        backgroundColor: "#ffffff",
        borderRight: "1px solid #c1c5cb",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none"
      }}
    >
      {/* 這裡加入滑鼠移入效果的 CSS */}
      <style>{`
        .nav-btn-hover:hover {
          background-color: #f5f7f9ff !important; /* 灰底 */
          color: #2563eb !important;           /* 藍字 */
        }
        .nav-btn-hover:hover svg {
          color: #2563eb !important;           /* 圖示同步變藍 */
        }
      `}</style>

      {/* 頂部固定標題區 */}
      <div 
        className="px-4 border-bottom d-flex align-items-center" 
        style={{ 
          borderColor: "#f1f5f9", 
          height: "60px",
          flexShrink: 0,
          justifyContent: "center" // 改為 flex-start 配合整體致中
        }}
      >
        <h1 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ color: "#0f172a", fontSize: "1.2rem" }}>
          <LayoutGrid size={18} strokeWidth={2.2} /> {t("MENU_MAIN")}
        </h1>
      </div>

      {/* 可捲動內容區 */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <ul className="nav flex-column px-0 m-0">
          
          {isAdmin && (
            <li style={navItemStyle("/permission")}>
              <button 
                className={`btn w-100 text-start px-4 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/permission") ? "fw-bold" : ""}`} 
                style={{ color: "inherit", background: "none", justifyContent: "flex-start" }}
                onClick={() => { navigate("/permission"); setSidebarOpen(false); }}
              >
                <ShieldCheck size={18} className="me-2" /> {t("NAV_PERMISSION")}
              </button>
            </li>
          )}

          {isAdmin && (
            <li className="nav-item">
              <div style={{ borderBottom: "1px solid #e4e8ec", height: "56px" }}>
                <button 
                  className="btn w-100 text-start px-4 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover" 
                  style={{ color: "#0f172a", background: "none" }} 
                  onClick={() => setConfigSubMenuOpen(!configSubMenuOpen)}
                >
                  <Settings size={18} className="me-2" />
                  <span className="flex-grow-1">{t("NAV_CONFIG")}</span>
                  {configSubMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
              
              {configSubMenuOpen && (
                <ul className="list-unstyled m-0" style={{ backgroundColor: "#fbfcfd" }}>
                  <li style={navItemStyle("/config")}>
                    <button 
                      /* 子分頁寬度感在此調整：px-5 代表左內縮，值越大內容越靠右 */
                      className={`btn w-100 text-start px-5 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/config") ? "fw-bold text-primary" : ""}`} 
                      style={{ fontSize: "0.9rem", color: "inherit", background: "none", justifyContent: "flex-start" }}
                      onClick={() => { navigate("/config"); setSidebarOpen(false); }}
                    >
                      <span className="me-2">•</span> {t("NAV_PROD_FAMILY")}
                    </button>
                  </li>
                  <li style={navItemStyle("/stress-config")}>
                    <button 
                      className={`btn w-100 text-start px-5 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/stress-config") ? "fw-bold text-primary" : ""}`} 
                      style={{ fontSize: "0.9rem", color: "inherit", background: "none", justifyContent: "flex-start" }}
                      onClick={() => { navigate("/stress-config"); setSidebarOpen(false); }}
                    >
                      <span className="me-2">•</span> {t("NAV_TEST_SET")}
                    </button>
                  </li>
                </ul>
              )}
            </li>
          )}

          {(isAdmin || isEngineer || isTechnician) && (
            <li style={navItemStyle("/list")}>
              <button 
                className={`btn w-100 text-start px-4 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/list") ? "fw-bold" : ""}`} 
                style={{ color: "inherit", background: "none", justifyContent: "flex-start" }}
                onClick={() => { navigate("/list"); setSidebarOpen(false); }}
              >
                <Search size={18} className="me-2" /> {t("NAV_VIEW")}
              </button>
            </li>
          )}

          {(isAdmin || isEngineer) && (
            <li style={navItemStyle("/create")}>
              <button 
                className={`btn w-100 text-start px-4 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/create") ? "fw-bold" : ""}`} 
                style={{ color: "inherit", background: "none", justifyContent: "flex-start" }}
                onClick={() => { navigate("/create"); setSidebarOpen(false); }}
              >
                <PlusCircle size={18} className="me-2" /> {t("NAV_CREATE")}
              </button>
            </li>
          )}

          {(isAdmin || isTechnician) && (
            <li style={navItemStyle("/checkinout")}>
              <button 
                className={`btn w-100 text-start px-4 h-100 d-flex align-items-center border-0 shadow-none nav-btn-hover ${isActive("/checkinout") ? "fw-bold" : ""}`} 
                style={{ color: "inherit", background: "none", justifyContent: "flex-start" }}
                onClick={() => { navigate("/checkinout"); setSidebarOpen(false); }}
              >
                <ClipboardCheck size={18} className="me-2" /> {t("NAV_CHECK")}
              </button>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
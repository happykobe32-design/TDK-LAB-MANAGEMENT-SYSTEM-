import React from "react";

/**
 * 統一頁面佈局組件
 * 提供淺藍色標題欄 + 白色內容區的統一風格
 */
export default function PageLayout({ title, icon, children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", margin: 0, padding: 0 }}>
      {/* 淺藍色標題欄 - 完全貼緊，無縫隙 */}
      <div
        style={{
          background: "#1542a4ff",
          color: "#ffffff",
          padding: "12px 20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          margin: 0,
          border: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {icon && <span style={{ fontSize: "1.5rem" }}>{icon}</span>}
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "600", letterSpacing: "0.3px" }}>
            {title}
          </h1>
        </div>
      </div>

      {/* 白色內容區 */}
      <div 
        style={{ 
          flex: 1, 
          backgroundColor: "#ffffff",
          padding: "2rem 20px",
          margin: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

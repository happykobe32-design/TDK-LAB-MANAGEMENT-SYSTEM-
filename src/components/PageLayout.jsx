import React from "react";

/**
 * 統一頁面佈局組件 - 專業優化版
 */
export default function PageLayout({ title, icon, children }) {
  return (
    /* 修正：移除 minHeight: "100vh"，改用 flex: 1 填滿父容器 */
    <div style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0, padding: 0 }}>
      {/* 專業白底標題欄 */}
      <div
        style={{
          background: "#ffffff",
          color: "#1e293b",
          padding: "5px 10px", // 稍微增加一點內距，讓標題更透氣
          borderBottom: "1px solid #e2e8f0",
          margin: 0,
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0, // 確保標題欄不會被縮小
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {icon && (
            <span style={{ 
              fontSize: "1.2rem", 
              filter: "grayscale(100%) opacity(0.7)", 
              display: "flex",
              alignItems: "center"
            }}>
              {icon}
            </span>
          )}
          
          <h1 style={{ 
            margin: 0, 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            letterSpacing: "0.5px",
            color: "#0f172a" 
          }}>
            {title}
          </h1>
        </div>
      </div>

      {/* 內容區 */}
      <div 
        style={{ 
          flex: 1, 
          backgroundColor: "#ffffffff", 
          padding: "0px",        // 關鍵 1: 將 24px 改為 0px，移除四周空隙
          margin: 0,
          width: "100%",
          boxSizing: "border-box",
          overflowY: "auto" // 如果內容太長，讓這個區域自己滾動
        }}
      >
        <div style={{ width: "100%", margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
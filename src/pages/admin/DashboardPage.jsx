import React, { useState, useEffect } from "react";
import KPI_Card from "../../components/KPI_Card";

export default function DashboardPage({ setPage }) {
  const [data, setData] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    newLots: 0
  });
  const [completedProjects, setCompletedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // 用於檢視完整表單

  useEffect(() => {
    const calculateData = () => {
      try {
        const rawData = localStorage.getItem("all_projects");
        const projects = JSON.parse(rawData || "[]");
        
        let totalLots = 0;
        let inProgress = 0;
        let completed = 0;
        let newLots = 0;
        const finishedList = [];

        if (Array.isArray(projects)) {
          projects.forEach(proj => {
            if (proj?.lots && Array.isArray(proj.lots)) {
              proj.lots.forEach(lot => {
                totalLots++;
                const allStresses = lot.stresses || [];
                const allRows = allStresses.flatMap(s => s.rowData || []);
                
                // Status Logic
                const hasEnd = allRows.some(r => r?.endTime && r.endTime !== "");
                const isAllDone = allRows.length > 0 && allRows.every(r => r?.endTime && r.endTime !== "");
                
                if (isAllDone) {
                  completed++;
                  finishedList.push({
                    ...proj.header,
                    lotId: lot.lotId,
                    createdAt: proj.createdAt || proj.header["Created Date"],
                    finalCheckout: allRows.reduce((latest, r) => (r.endTime > latest ? r.endTime : latest), ""),
                    fullData: { header: proj.header, lot: lot }
                  });
                } else if (hasEnd || allRows.some(r => r?.startTime)) {
                  inProgress++;
                } else {
                  newLots++;
                }
              });
            }
          });
        }

        setData({ total: totalLots, inProgress, completed, newLots });
        setCompletedProjects(finishedList);
      } catch (err) {
        console.error("Dashboard calculation error:", err);
      }
    };

    calculateData();
  }, []);

  const downloadReport = (item) => {
    const header = ["Category", "Field", "Value"];
    const rows = [];
    Object.entries(item.fullData.header).forEach(([key, val]) => {
      rows.push(["Project Info", key, val]);
    });
    item.fullData.lot.stresses.forEach(s => {
      s.rowData.forEach((r, idx) => {
        rows.push([`Stress: ${r.stress || s.stress}`, `Step ${idx + 1} Start`, r.startTime || "N/A"]);
        rows.push([`Stress: ${r.stress || s.stress}`, `Step ${idx + 1} End`, r.endTime || "N/A"]);
      });
    });
    const csvContent = "\uFEFF" + [header, ...rows].map(e => e.map(String).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${item.lotId}_${item["Product ID"]}.csv`;
    link.click();
  };

  const navActions = [
    { title: "Create Project", targetPage: "create", icon: "➕", color: "#206bc4" },
    { title: "Check-in / Out", targetPage: "checkinout", icon: "⏱️", color: "#f59e0b" },
    { title: "View / Search", targetPage: "list", icon: "🔍", color: "#2fb344" }
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>


      {/* KPI Section */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "30px" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <KPI_Card title="Total" value={data.total} accent="primary" />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <KPI_Card title="Completed" value={data.completed} accent="success" />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <KPI_Card title="In Progress" value={data.inProgress} accent="warning" />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <KPI_Card title="INIT" value={data.newLots} accent="secondary" />
        </div>
      </div>

      {/* Navigation Cards */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "35px" }}>
        {navActions.map(act => (
          <div 
            key={act.targetPage}
            onClick={() => setPage(act.targetPage)}
            style={{
              flex: 1, padding: "24px", textAlign: "center", background: "white",
              borderRadius: "12px", cursor: "pointer", borderTop: `5px solid ${act.color}`,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>{act.icon}</div>
            <div style={{ fontWeight: "600", color: "#334155" }}>{act.title}</div>
          </div>
        ))}
      </div>

      {/* Master Completed Projects Table Section */}
      <div style={{ background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>
          <h3 style={{ margin: 0, color: "#1e293b" }}>📜 Completed Projects Master List (Admin)</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Showing only finished lots with full records</span>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px" }}>Product ID</th>
                <th style={{ padding: "12px" }}>Lot ID</th>
                <th style={{ padding: "12px" }}>Owner</th>
                <th style={{ padding: "12px" }}>Created Date</th>
                <th style={{ padding: "12px" }}>Final Check-out</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {completedProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No completed projects available.</td>
                </tr>
              ) : (
                completedProjects.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: "500" }}>{item["Product ID"]}</td>
                    <td style={{ padding: "12px" }}>{item.lotId}</td>
                    <td style={{ padding: "12px" }}>{item["Owner"]}</td>
                    <td style={{ padding: "12px" }}>{item.createdAt}</td>
                    <td style={{ padding: "12px" }}>{item.finalCheckout}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button 
                        onClick={() => setSelectedProject(item)}
                        style={{ padding: "6px 12px", background: "#206bc4", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px" }}
                      >
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 表單檢視彈窗 (Modal) */}
      {selectedProject && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', width: '900px', maxHeight: '90vh', borderRadius: '12px', padding: '40px', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setSelectedProject(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '15px', marginBottom: '25px' }}>
              <h2 style={{ margin: 0, letterSpacing: '2px' }}>RELIABILITY TEST TRAVELER</h2>
            </div>

            {/* 第一部分：Header 資訊網格 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #1e293b', marginBottom: '30px' }}>
              {Object.entries(selectedProject.fullData.header).map(([key, val]) => (
                <div key={key} style={{ border: '0.5px solid #e2e8f0', padding: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>{key}</div>
                  <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{val || '-'}</div>
                </div>
              ))}
              <div style={{ border: '0.5px solid #e2e8f0', padding: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>LOT NO.</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{selectedProject.lotId}</div>
              </div>
            </div>

            {/* 第二部分：Operation Logs 實驗記錄 */}
            <h4 style={{ marginBottom: '10px', color: '#1e293b' }}>Test Operation Logs</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '12px' }}>Stress Type</th>
                  <th style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '12px' }}>Check-in Date/Time</th>
                  <th style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '12px' }}>Check-out Date/Time</th>
                  <th style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedProject.fullData.lot.stresses.map((s, sIdx) => (
                  s.rowData.map((r, rIdx) => (
                    <tr key={`${sIdx}-${rIdx}`}>
                      <td style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '13px' }}>{r.stress || s.stress}</td>
                      <td style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '13px' }}>{r.startTime || '-'}</td>
                      <td style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '13px' }}>{r.endTime || '-'}</td>
                      <td style={{ border: '1px solid #1e293b', padding: '10px', fontSize: '13px', textAlign: 'center', color: '#059669', fontWeight: 'bold' }}>COMPLETED</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>

            {/* 底部按鈕區 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button 
                onClick={() => setSelectedProject(null)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
              >
                Close
              </button>
              <button 
                onClick={() => downloadReport(selectedProject)}
                style={{ padding: '10px 25px', borderRadius: '8px', border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📥 Download Report (CSV)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
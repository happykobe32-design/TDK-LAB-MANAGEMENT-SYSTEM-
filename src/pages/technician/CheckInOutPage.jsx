import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../../assets/RunCardCreatePage.css"; 

ModuleRegistry.registerModules([AllCommunityModule]);

// 內部小型組件：KPI 卡片 (樣式優化，與深藍主題呼應)
const StatCard = ({ title, value, color, isActive, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      flex: 1,
      padding: "15px 20px",
      background: "#fff",
      borderRadius: "12px",
      borderLeft: isActive ? `5px solid ${color}` : "1px solid #e2e8f0", // 改為側邊粗條感
      boxShadow: isActive ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "0 1px 3px rgba(0,0,0,0.05)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      minWidth: "150px"
    }}
  >
    <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
    <div style={{ fontSize: "28px", fontWeight: "800", color: color }}>{value}</div>
  </div>
);

export default function CheckInOutPage() {
  const [allProjects, setAllProjects] = useState([]); 
  const [selectedId, setSelectedId] = useState(null); 
  const [filterMode, setFilterMode] = useState("all"); 

  // 1. 初始化
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    if (data.length > 0) {
      const firstActive = data.find(p => p.status !== "completed");
      setSelectedId(firstActive ? firstActive.id : data[0].id);
    }
  }, []);

  // 2. 統計
  const stats = useMemo(() => {
    const counts = { all: 0, ongoing: 0, pending: 0, completed: 0 };
    allProjects.forEach(p => {
      counts.all++;
      const status = p.status || "Init";
      if (status === "in-process") counts.ongoing++;
      else if (status === "Init") counts.pending++;
      else if (status === "completed") counts.completed++;
    });
    return counts;
  }, [allProjects]);

  // 3. 取得當前專案
  const currentProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedId);
  }, [allProjects, selectedId]);

  // 4. 過濾清單
  const taskList = useMemo(() => {
    return allProjects.filter(p => {
      const status = p.status || "Init";
      if (filterMode === "ongoing") return status === "in-process";
      if (filterMode === "pending") return status === "Init";
      if (filterMode === "completed") return status === "completed";
      return true; 
    });
  }, [allProjects, filterMode]);

  // 5. 更新邏輯 (保持不變)
  const syncUpdate = useCallback((lotId, stressId, rid, patch) => {
    setAllProjects(prevAll => {
      const updated = prevAll.map(p => {
        if (p.id !== selectedId) return p;
        const updatedLots = p.lots.map(l => l.id === lotId ? {
          ...l,
          stresses: l.stresses.map(s => s.id === stressId ? {
            ...s,
            rowData: s.rowData.map(r => r._rid === rid ? { ...r, ...patch } : r)
          } : s)
        } : l);
        const allRows = updatedLots.flatMap(l => l.stresses.flatMap(s => s.rowData));
        const isAllDone = allRows.length > 0 && allRows.every(r => r.endTime && r.endTime !== "");
        const isAnyStarted = allRows.some(r => r.startTime && r.startTime !== "");
        let newStatus = "Init";
        if (isAllDone) newStatus = "completed";
        else if (isAnyStarted) newStatus = "in-process";
        return { ...p, lots: updatedLots, status: newStatus };
      });
      localStorage.setItem("all_projects", JSON.stringify(updated));
      return updated;
    });
  }, [selectedId]);

  // 6. 欄位定義 (配色改為深藍專業風)
  const columnDefs = useMemo(() => {
    const isProjectCompleted = currentProject?.status === "completed";
    const baseColDef = { 
      resizable: true, 
      sortable: true,
      cellStyle: { borderRight: '1px solid #eef2f6', fontSize: '12px' } 
    };
    const canEdit = !isProjectCompleted;

    return [
      { ...baseColDef, headerName: "Stress", field: "stress", width: 100, cellStyle: { ...baseColDef.cellStyle, fontWeight: 'bold', color: '#1e3a8a' } },
      { ...baseColDef, headerName: "Type", field: "type", width: 80 },
      { ...baseColDef, headerName: "Operation", field: "operation", width: 110 },
      { ...baseColDef, headerName: "Condition", field: "condition", width: 130 },
      { ...baseColDef, headerName: "Qty", field: "sampleSize", width: 80, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { ...baseColDef, headerName: "Program", field: "testProgram", width: 120, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { ...baseColDef, headerName: "Script", field: "testScript", width: 120, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { 
        ...baseColDef,
        headerName: "Check-in", 
        field: "startTime", 
        width: 150,
        cellRenderer: (p) => (
          <button 
            disabled={!!p.value || isProjectCompleted}
            className={`btn-action ${p.value ? 'btn-done' : 'btn-go'}`}
            onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { startTime: new Date().toLocaleString([], {hour12:false}) })}
          >
            {p.value ? `IN: ${p.value.split(',')[1] || p.value}` : "START"}
          </button>
        )
      },
      { 
        ...baseColDef,
        headerName: "Check-out", 
        field: "endTime", 
        width: 150,
        cellRenderer: (p) => (
          <button 
            disabled={!p.data.startTime || !!p.value || isProjectCompleted}
            className={`btn-action ${ (p.data.startTime && !p.value) ? 'btn-ready' : 'btn-wait' }`}
            onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { endTime: new Date().toLocaleString([], {hour12:false}) })}
          >
            {p.value ? `OUT: ${p.value.split(',')[1] || p.value}` : "FINISH"}
          </button>
        )
      },
      { ...baseColDef, headerName: "Note / Remark", field: "execNote", editable: !isProjectCompleted, flex: 1, minWidth: 150, cellClass: 'editable-cell' },
    ];
  }, [syncUpdate, currentProject]);

  return (
    <div className="checkinout-container" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      
      {/* 標題與 KPI 區塊整合 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "800", color: "#1e293b", fontSize: "24px" }}>RELIABILITY TRACKING</h2>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>Real-time Lab Test Operation & Traceability System</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: '60%' }}>
          <StatCard title="Total" value={stats.all} color="#1e3a8a" isActive={filterMode === 'all'} onClick={() => setFilterMode('all')} />
          <StatCard title="Completed" value={stats.completed} color="#10b981" isActive={filterMode === 'completed'} onClick={() => setFilterMode('completed')} />
          <StatCard title="Running" value={stats.ongoing} color="#3b82f6" isActive={filterMode === 'ongoing'} onClick={() => setFilterMode('ongoing')} />
          <StatCard title="Initial" value={stats.pending} color="#94a3b8" isActive={filterMode === 'pending'} onClick={() => setFilterMode('pending')} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        
        {/* 左側任務清單 (寬度加寬一點) */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <div style={{ height: '78vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: '#1e3a8a', color: 'white' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>LOT QUEUE</h3>
            </div>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {taskList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#cbd5e1', marginTop: '40px' }}>No records found</div>
              ) : (
                taskList.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      border: selectedId === p.id ? '2px solid #1e3a8a' : '1px solid #f1f5f9',
                      background: selectedId === p.id ? '#eff6ff' : '#f8fafc',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '14px', color: selectedId === p.id ? '#1e3a8a' : '#334155' }}>{p.header["Product ID"]}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Lot: {p.lots[0]?.lotId || "N/A"}</div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ 
                         fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold',
                         background: p.status === 'completed' ? '#d1fae5' : (p.status === 'in-process' ? '#dbeafe' : '#f1f5f9'),
                         color: p.status === 'completed' ? '#065f46' : (p.status === 'in-process' ? '#1e40af' : '#475569')
                       }}>
                         {p.status?.toUpperCase() || 'INIT'}
                       </span>
                       <span style={{ fontSize: '10px', color: '#cbd5e1' }}>#{p.id.slice(-4)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右側執行面板 */}
        <div style={{ flexGrow: 1 }}>
          {!currentProject ? (
            <div style={{ background: '#fff', borderRadius: '16px', textAlign: 'center', padding: '120px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
              <h3>Select a project to begin operation</h3>
            </div>
          ) : (
            <>
              {/* 重點資訊 Banner */}
              <div style={{ padding: '20px 24px', marginBottom: '20px', background: '#1e3a8a', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Current Active Project</div>
                  <div style={{ fontWeight: '800', fontSize: '24px' }}>{currentProject.header["Product ID"]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Status</div>
                  <div style={{ fontWeight: '700', fontSize: '18px' }}>{currentProject.status?.toUpperCase()}</div>
                </div>
              </div>

              {/* 詳細屬性表 */}
              <div style={{ background: '#fff', borderRadius: '16px', marginBottom: '20px', padding: '20px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                {Object.entries(currentProject.header).slice(0, 10).map(([k, v]) => (
                  <div key={k} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>{k}</label>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{v || "-"}</span>
                  </div>
                ))}
              </div>

              {/* Lots 表格區 */}
              {currentProject.lots.map(lot => (
                <div key={lot.id} style={{ marginBottom: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: '#f8fafc', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e3a8a', fontWeight: '800', fontSize: '15px' }}>RUN CARD: {lot.lotId}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Created: {currentProject.header["Created Date"] || "N/A"}</span>
                  </div>
                  
                  {lot.stresses.map(s => (
                    <div key={s.id} className="ag-theme-alpine digital-runcard" style={{ width: '100%' }}>
                      <AgGridReact
                        rowData={s.rowData}
                        columnDefs={columnDefs}
                        domLayout="autoHeight"
                        context={{ lotId: lot.id, stressId: s.id }}
                        headerHeight={42}
                        rowHeight={48}
                        singleClickEdit={true}
                        stopEditingWhenCellsLoseFocus={true}
                        onCellValueChanged={(params) => {
                          syncUpdate(lot.id, s.id, params.data._rid, { [params.column.colId]: params.newValue });
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style>{`
        /* 深藍色專業標頭 */
        .digital-runcard .ag-header { 
          background-color: #1e3a8a !important; 
          border-bottom: none !important; 
        }
        .digital-runcard .ag-header-cell-label { 
          color: #ffffff !important; 
          font-weight: 600 !important; 
          font-size: 11px !important; 
          letter-spacing: 0.5px;
        }
        .digital-runcard .ag-root-wrapper { border: none !important; }
        
        /* 單元格樣式 */
        .editable-cell { background-color: #fffef0 !important; cursor: cell !important; }
        .ag-cell-focus { border: 2px solid #3b82f6 !important; }
        
        /* 自定義按鈕 */
        .btn-action {
          width: 100%; height: 32px; border: none; border-radius: 6px; 
          font-weight: 800; font-size: 10px; cursor: pointer; transition: all 0.2s;
        }
        .btn-go { background: #3b82f6; color: white; }
        .btn-go:hover { background: #2563eb; }
        .btn-done { background: #f1f5f9; color: #64748b; cursor: default; }
        
        .btn-ready { background: #10b981; color: white; }
        .btn-ready:hover { background: #059669; }
        .btn-wait { background: #f8fafc; color: #cbd5e1; cursor: not-allowed; border: 1px solid #f1f5f9; }

        /* 滾動條優化 */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; borderRadius: 3px; }
      `}</style>
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../../assets/RunCardCreatePage.css"; 

ModuleRegistry.registerModules([AllCommunityModule]);

// 內部組件：KPI 卡片 (樣式微調更精簡)
const StatCard = ({ title, value, color, isActive, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      flex: 1,
      padding: "12px 15px",
      background: "#fff",
      borderRadius: "8px",
      borderLeft: `4px solid ${color}`,
      boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.05)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      transform: isActive ? "translateY(-2px)" : "none",
      border: isActive ? `1px solid ${color}` : "1px solid #e2e8f0",
      borderLeftWidth: "4px"
    }}
  >
    <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>{title}</div>
    <div style={{ fontSize: "24px", fontWeight: "800", color: color }}>{value}</div>
  </div>
);

export default function CheckInOutPage() {
  const [allProjects, setAllProjects] = useState([]); 
  const [selectedId, setSelectedId] = useState(null); 
  const [filterMode, setFilterMode] = useState("all");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    if (data.length > 0) {
      const firstActive = data.find(p => p.status !== "completed");
      setSelectedId(firstActive ? firstActive.id : data[0].id);
    }
  }, []);

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

  const currentProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedId);
  }, [allProjects, selectedId]);

  const taskList = useMemo(() => {
    return allProjects.filter(p => {
      const status = p.status || "Init";
      if (filterMode === "ongoing") return status === "in-process";
      if (filterMode === "pending") return status === "Init";
      if (filterMode === "completed") return status === "completed";
      return true; 
    });
  }, [allProjects, filterMode]);

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

  const columnDefs = useMemo(() => {
    const isProjectCompleted = currentProject?.status === "completed";
    const canEdit = !isProjectCompleted;

    return [
      { headerName: "Stress", field: "stress", width: 90, pinned: 'left', editable: canEdit, cellStyle: { background: '#f1f5f9', fontWeight: 'bold', color: '#0f172a' }, cellClass: canEdit ? 'editable-cell' : '' },
      { headerName: "Type", field: "type", width: 80, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { headerName: "Operation", field: "operation", width: 130, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { headerName: "Condition", field: "condition", width: 140, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { 
        headerName: "Sample Size", 
        field: "sampleSize", 
        width: 110, 
        editable: canEdit,
        cellStyle: { fontWeight: 'bold' } 
      },
      { headerName: "Program", field: "program", width: 110, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { headerName: "Test Program", field: "testProgram", width: 130, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { headerName: "Test Script", field: "testScript", width: 130, editable: canEdit, cellClass: canEdit ? 'editable-cell' : '' },
      { 
        headerName: "CHECK-IN", 
        field: "startTime", 
        width: 150,
        pinned: 'right',
        cellRenderer: (p) => (
          <button 
            disabled={!!p.value}
            className={`op-button ${p.value ? 'done' : 'start'}`}
            onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { startTime: new Date().toLocaleString([], {hour12:false}) })}
          >
            {p.value ? p.value : "START"}
          </button>
        )
      },
      { 
        headerName: "CHECK-OUT", 
        field: "endTime", 
        width: 150,
        pinned: 'right',
        cellRenderer: (p) => (
          <button 
            disabled={!p.data.startTime || !!p.value}
            className={`op-button ${ (p.data.startTime && !p.value) ? 'finish' : 'waiting' }`}
            onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { endTime: new Date().toLocaleString([], {hour12:false}) })}
          >
            {p.value ? p.value : "FINISH"}
          </button>
        )
      },
      { headerName: "Remark / Note", field: "execNote", editable: canEdit, width: 140, cellClass: canEdit ? 'editable-cell' : '' },
    ];
  }, [syncUpdate, currentProject]);

  return (
    <div style={{ padding: '20px', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui' }}>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* 左側任務清單 (縮小寬度參考 Runcard 介面) */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#1e3a8a', padding: '12px', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>WORK ORDER LIST</div>
            {/* 篩選按鈕 */}
            <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button onClick={() => setFilterMode('all')} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filterMode === 'all' ? '#1e3a8a' : '#f1f5f9', color: filterMode === 'all' ? '#fff' : '#64748b', transition: 'all 0.2s' }}>All ({stats.all})</button>
              <button onClick={() => setFilterMode('ongoing')} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filterMode === 'ongoing' ? '#f59e0b' : '#f1f5f9', color: filterMode === 'ongoing' ? '#fff' : '#64748b', transition: 'all 0.2s' }}>Active ({stats.ongoing})</button>
              <button onClick={() => setFilterMode('completed')} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filterMode === 'completed' ? '#10b981' : '#f1f5f9', color: filterMode === 'completed' ? '#fff' : '#64748b', transition: 'all 0.2s' }}>Done ({stats.completed})</button>
              <button onClick={() => setFilterMode('pending')} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filterMode === 'pending' ? '#94a3b8' : '#f1f5f9', color: filterMode === 'pending' ? '#fff' : '#64748b', transition: 'all 0.2s' }}>Init ({stats.pending})</button>
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
              {taskList.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    padding: '12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px',
                    border: selectedId === p.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: selectedId === p.id ? '#eff6ff' : '#fff',
                  }}
                >
                  <div style={{ fontWeight: '800', color: '#1e293b' }}>{p.header["Product ID"]}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Status: {p.status || "Init"}</div>
                  {/* 進度條簡示 */}
                  <div style={{ width: '100%', height: '4px', background: '#e2e8f0', marginTop: '8px', borderRadius: '2px' }}>
                    <div style={{ width: p.status === 'completed' ? '100%' : (p.status === 'in-process' ? '50%' : '0%'), height: '100%', background: '#2563eb', borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側主操作面板 */}
        <div style={{ flexGrow: 1 }}>
          {!currentProject ? (
            <div style={{ background: '#fff', padding: '50px', textAlign: 'center', borderRadius: '8px' }}>Select a project to begin</div>
          ) : (
            <>
              {/* 工程師填寫的基本資料列 */}
              <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '8px', marginBottom: '15px', borderLeft: '5px solid #1e3a8a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                  {Object.entries(currentProject.header).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '3px' }}>{v || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lot 操作區 */}
              {currentProject.lots.map(lot => (
                <div key={lot.id} style={{ background: '#fff', borderRadius: '8px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ background: '#1e3a8a', color: '#fff', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>LOT</span>
                    <span style={{ fontWeight: '800', color: '#1e3a8a' }}>{lot.lotId}</span>
                  </div>
                  
                  {lot.stresses.map((s, index) => (
                    <React.Fragment key={s.id}>
                      <div className="ag-theme-alpine runcard-grid">
                        <AgGridReact
                          rowData={s.rowData}
                          columnDefs={columnDefs}
                          domLayout="autoHeight"
                          context={{ lotId: lot.id, stressId: s.id }}
                          headerHeight={48}
                          rowHeight={52}
                          onCellValueChanged={(params) => {
                            syncUpdate(lot.id, s.id, params.data._rid, { [params.column.colId]: params.newValue });
                          }}
                        />
                      </div>
                      {index < lot.stresses.length - 1 && <hr style={{ border: '1px solid black', margin: '10px 0' }} />}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style>{`
        /* 表格背景統一白色 */
        .runcard-grid {
          background-color: #ffffff !important;
        }
        .ag-theme-alpine {
          background-color: #ffffff !important;
        }
        
        /* 表格標頭樣式 - 黑框，無藍底 */
        .runcard-grid .ag-header {
          background-color: #ffffff !important;
          border-bottom: 2px solid #000000 !important;
        }
        .runcard-grid .ag-header-cell {
          border-right: 1px solid #000000 !important;
        }
        .runcard-grid .ag-header-cell-label {
          color: #000000 !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          justify-content: center;
        }
        
        /* 表格格線 */
        .runcard-grid .ag-cell {
          border-right: 1px solid #000000 !important;
          border-bottom: 1px solid #000000 !important;
        }
        .runcard-grid .ag-row {
          border-bottom: 1px solid #000000 !important;
        }
        
        /* 按鈕樣式 */
        .op-button {
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 6px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }
        .op-button.start {
          background: #2563eb;
          color: white;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
        }
        .op-button.start:hover { 
          background: #1d4ed8; 
          transform: translateY(-1px);
        }
        
        .op-button.finish {
          background: #10b981;
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
        .op-button.finish:hover { 
          background: #059669;
          transform: translateY(-1px);
        }
        
        .op-button.done {
          background: #e2e8f0;
          color: #64748b;
          cursor: default;
          font-size: 12px;
        }
        .op-button.waiting {
          background: #f1f5f9;
          color: #cbd5e1;
          border: 1px dashed #cbd5e1;
          cursor: not-allowed;
        }

        /* 編輯單元格 */
        .editable-cell {
          background-color: #f9fafb !important;
        }

        .ag-row {
          height: 56px !important;
        }
        
        .ag-row:hover {
          background-color: #f0f9ff !important;
        }

        /* 釘住列背景 */
        .ag-pinned-left-cols-container {
          background-color: #fafbfc !important;
        }
        .ag-pinned-right-cols-container {
          background-color: #fafbfc !important;
        }
      `}</style>
    </div>
  );
}
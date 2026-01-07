import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function CheckInOutPage() {
  const [allProjects, setAllProjects] = useState([]); 
  const [selectedId, setSelectedId] = useState(null); 
  const [filterMode, setFilterMode] = useState("all");
  const [activeLotTab, setActiveLotTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    if (data.length > 0) {
      // 優先選中 In-process，其次選 Init
      const firstActive = data.find(p => p.status === "in-process") || data.find(p => p.status === "Init");
      setSelectedId(firstActive ? firstActive.id : data[0].id);
    }
  }, []);

  useEffect(() => {
    setActiveLotTab(0);
  }, [selectedId]);

  // 計算左側過濾器的數量
  const stats = useMemo(() => {
    const counts = { all: 0, ongoing: 0, pending: 0 };
    allProjects.forEach(p => {
      const status = p.status || "Init";
      if (status !== "completed") {
        counts.all++;
        if (status === "in-process") counts.ongoing++;
        else if (status === "Init") counts.pending++;
      }
    });
    return counts;
  }, [allProjects]);

  const currentProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedId);
  }, [allProjects, selectedId]);

  // 1. 修正過濾邏輯：確保包含 Init
  const taskList = useMemo(() => {
    return allProjects.filter(p => {
      const status = p.status || "Init";
      if (status === "completed") return false; 
      if (filterMode === "ongoing") return status === "in-process";
      if (filterMode === "pending") return status === "Init";
      return true; 
    }).filter(p => p.header["Product ID"]?.toString().includes(searchQuery));
  }, [allProjects, filterMode, searchQuery]);

  // 計算每個項目的完成進度
  const getProjectProgress = (project) => {
    const allRows = project.lots.flatMap(l => l.stresses.flatMap(s => s.rowData));
    if (allRows.length === 0) return 0;
    const done = allRows.filter(r => r.endTime && r.endTime !== "").length;
    return Math.round((done / allRows.length) * 100);
  };

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
      { headerName: "Stress", field: "stress", width: 100, pinned: 'left', cellStyle: { background: '#f8fafc', fontWeight: 'bold', display: 'flex', alignItems: 'center' } },
      { headerName: "Type", field: "type", width: 90, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Operation", field: "operation", width: 120, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Condition", field: "condition", width: 150, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Sample Size", field: "sampleSize", width: 100, editable: canEdit, cellStyle: { fontWeight: 'bold', display: 'flex', alignItems: 'center' } },
      // 補回欄位
      { headerName: "Test Program", field: "testProgram", width: 130, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Test Script", field: "testScript", width: 130, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { 
        headerName: "CHECK-IN", field: "startTime", width: 160, pinned: 'right',
        cellRenderer: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <button 
              disabled={!!p.value}
              className={`op-button ${p.value ? 'done' : 'start'}`}
              onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { startTime: new Date().toLocaleString([], {hour12:false}) })}
            >
              {p.value ? p.value : "START"}
            </button>
          </div>
        )
      },
      { 
        headerName: "CHECK-OUT", field: "endTime", width: 160, pinned: 'right',
        cellRenderer: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <button 
              disabled={!p.data.startTime || !!p.value}
              className={`op-button ${ (p.data.startTime && !p.value) ? 'finish' : 'waiting' }`}
              onClick={() => syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { endTime: new Date().toLocaleString([], {hour12:false}) })}
            >
              {p.value ? p.value : "FINISH"}
            </button>
          </div>
        )
      },
      { headerName: "Remark", field: "execNote", editable: canEdit, width: 120, cellStyle: { display: 'flex', alignItems: 'center' } },
    ];
  }, [syncUpdate, currentProject]);

  // 計算進度條百分比
  const getLotProgress = (lot) => {
    const rows = lot.stresses.flatMap(s => s.rowData);
    if (rows.length === 0) return 0;
    const done = rows.filter(r => r.endTime && r.endTime !== "").length;
    return Math.round((done / rows.length) * 100);
  };

  const activeLot = currentProject?.lots[activeLotTab];

  return (
    <div style={{ padding: 0, background: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui', display: 'flex' }}>
      <div style={{ display: 'flex', gap: 0, width: '100%', height: '100vh' }}>
        
        {/* 左側清單 */}
        <div style={{ width: '280px', flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ background: '#fff', borderRadius: 0, overflow: 'hidden', boxShadow: 'none', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#1e3a8a', padding: '15px', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>WORK ORDER LIST</div>
            
            {/* 搜尋框 */}
            <div style={{ padding: '10px 10px' }}>
              <input 
                type="text" 
                placeholder="Search Product ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  outline: 'none',
                  fontFamily: 'system-ui'
                }}
              />
            </div>
            
            <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '5px' }}>
              <button onClick={() => setFilterMode('all')} className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}>All ({stats.all})</button>
              <button onClick={() => setFilterMode('ongoing')} className={`filter-btn ${filterMode === 'ongoing' ? 'active-ongoing' : ''}`}>In-process ({stats.ongoing})</button>
              <button onClick={() => setFilterMode('pending')} className={`filter-btn ${filterMode === 'pending' ? 'active-pending' : ''}`}>Init ({stats.pending})</button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
              {taskList.map(p => {
                const progress = getProjectProgress(p);
                return (
                <div key={p.id} onClick={() => setSelectedId(p.id)} className={`project-card ${selectedId === p.id ? 'selected' : ''}`}>
                  <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{p.header["Product ID"]}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Status: {p.status || "Init"}</div>
                  {/* Project 總進度條 */}
                  <div style={{ width: '100%', height: '4px', background: '#e2e8f0', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', background: progress === 100 ? '#10b981' : '#2563eb', transition: 'width 0.3s' 
                    }} />
                  </div>
                  {/* 顯示完成百分比 */}
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '6px' }}>{progress}% Complete</div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右側主面板 */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: '#fff', paddingLeft: '20px', paddingRight: '20px' }}>
          {!currentProject ? (
            <div style={{ background: '#fff', padding: '100px', textAlign: 'center', borderRadius: 0, color: '#94a3b8' }}>Select an active project to begin</div>
          ) : (
            <>
              {/* Header Info */}
              <div style={{ background: '#fff', padding: '15px 25px', borderRadius: 0, marginBottom: 0, borderLeft: '6px solid #1e3a8a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '50px', borderBottom: '1px solid #e2e8f0' }}>
                {Object.entries(currentProject.header).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginTop: '2px' }}>{v || "-"}</div>
                  </div>
                ))}
              </div>

              {/* LOT Tabs with Progress Bars */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: 0, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                {currentProject.lots.map((lot, idx) => {
                  const progress = getLotProgress(lot);
                  return (
                    <div 
                      key={lot.id} 
                      onClick={() => setActiveLotTab(idx)}
                      style={{
                        padding: '10px 25px', borderRadius: 0, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                        background: activeLotTab === idx ? '#eff6ff' : 'transparent',
                        color: activeLotTab === idx ? '#1e3a8a' : '#64748b',
                        border: 'none',
                        borderBottom: 'none'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>LOT: {lot.lotId}</div>
                      {/* 2. 加入 LOT 進度條 */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', background: '#e2e8f0' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#2563eb', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Grid Area */}
              {activeLot && (
                <div style={{ background: '#fff', borderRadius: 0, overflow: 'hidden', boxShadow: 'none', border: 'none', padding: '15px 25px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {activeLot.stresses.map((s, index) => (
                    <div key={s.id} className="ag-theme-alpine custom-grid" style={{ flexGrow: 1, marginBottom: index < activeLot.stresses.length - 1 ? '15px' : 0 }}>
                      <AgGridReact
                        rowData={s.rowData}
                        columnDefs={columnDefs}
                        domLayout="autoHeight"
                        context={{ lotId: activeLot.id, stressId: s.id }}
                        headerHeight={42}
                        rowHeight={50}
                        onCellValueChanged={(params) => {
                          syncUpdate(activeLot.id, s.id, params.data._rid, { [params.column.colId]: params.newValue });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .filter-btn { padding: 5px 12px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; background: #fff; color: #64748b; transition: all 0.2s; }
        .filter-btn.active { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
        .filter-btn.active-ongoing { background: #f59e0b; color: #fff; border-color: #f59e0b; }
        .filter-btn.active-pending { background: #94a3b8; color: #fff; border-color: #94a3b8; }

        .project-card { padding: 15px; borderRadius: 10px; cursor: pointer; marginBottom: 8px; border: 1px solid #e2e8f0; background: #fff; transition: all 0.2s; }
        .project-card.selected { border: 2px solid #2563eb; background: #eff6ff; }
        
        .custom-grid { border-top: 1px solid #e2e8f0; }
        .custom-grid .ag-header { background-color: #f8fafc !important; border-bottom: 1.5px solid #e2e8f0 !important; }
        .custom-grid .ag-cell { border-right: 1px solid #f1f5f9 !important; border-bottom: 1px solid #f1f5f9 !important; }
        
        .op-button { width: 100%; height: 32px; border: none; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .op-button.start { background: #2563eb; color: white; }
        .op-button.finish { background: #10b981; color: white; }
        .op-button.done { background: #f1f5f9; color: #64748b; cursor: default; font-family: monospace; }
        .op-button.waiting { background: #fff; color: #cbd5e1; border: 1px dashed #cbd5e1; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
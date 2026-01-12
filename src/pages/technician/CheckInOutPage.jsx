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
  const [configMaster, setConfigMaster] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);

    if (data.length > 0) {
      const firstActive = data.find(p => p.status === "in-process") || data.find(p => p.status === "Init");
      setSelectedId(firstActive ? firstActive.id : data[0].id);
    }
  }, []);

  useEffect(() => {
    setActiveLotTab(0);
  }, [selectedId]);

  const getDisplayName = (key, value) => {
    if (!value) return "-";
    if (key === "Project Family" && configMaster?.productFamilies) {
      const family = configMaster.productFamilies.find(f => f.id === value);
      return family ? family.name : value;
    }
    return value;
  };

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

  const taskList = useMemo(() => {
    return allProjects.filter(p => {
      const status = p.status || "Init";
      if (status === "completed") return false; 
      if (filterMode === "ongoing") return status === "in-process";
      if (filterMode === "pending") return status === "Init";
      return true; 
    }).filter(p => p.header["Product ID"]?.toString().includes(searchQuery));
  }, [allProjects, filterMode, searchQuery]);

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
      { 
        headerName: "STATUS", 
        width: 100, 
        pinned: 'left',
        valueGetter: (p) => {
          if (p.data.endTime) return "Completed";
          if (p.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (p) => {
          const status = p.value;
          let bgColor = "#94a3b8"; 
          if (status === "In-Process") bgColor = "#f59e0b"; 
          if (status === "Completed") bgColor = "#10b981"; 
          
          return (
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <span style={{ 
                background: bgColor, color: 'white', padding: '2px 8px', borderRadius: '4px', 
                fontSize: '10px', fontWeight: 'bold', lineHeight: '1.4'
              }}>
                {status}
              </span>
            </div>
          );
        }
      },
      { 
        headerName: "Stress", 
        field: "stress", 
        width: 100, 
        pinned: 'left', 
        cellClass: 'stress-column-border', 
        headerClass: 'stress-header-border', 
        cellStyle: { background: '#f8fafc', fontWeight: 'bold', display: 'flex', alignItems: 'center' }
      },
      { headerName: "Type", field: "type", width: 90, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Operation", field: "operation", width: 120, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Condition", field: "condition", width: 150, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Sample Size", field: "sampleSize", width: 100, editable: canEdit, cellStyle: { fontWeight: 'bold', display: 'flex', alignItems: 'center' } },
      { headerName: "Test Program", field: "testProgram", width: 130, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { headerName: "Test Script", field: "testScript", width: 130, editable: canEdit, cellStyle: { display: 'flex', alignItems: 'center' } },
      { 
        headerName: "CHECK-IN", field: "startTime", width: 160,
        cellRenderer: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <button 
              disabled={!!p.value}
              className={`op-button ${p.value ? 'done' : 'start'}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to perform START？")) {
                  syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { startTime: new Date().toLocaleString([], {hour12:false}) });
                }
              }}
            >
              {p.value ? p.value : "START"}
            </button>
          </div>
        )
      },
      { 
        headerName: "CHECK-OUT", field: "endTime", width: 160,
        cellRenderer: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <button 
              disabled={!p.data.startTime || !!p.value}
              className={`op-button ${ (p.data.startTime && !p.value) ? 'finish' : 'waiting' }`}
              onClick={() => {
                if (window.confirm("Are you sure you want to FINISH?")) {
                  syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { endTime: new Date().toLocaleString([], {hour12:false}) });
                }
              }}
            >
              {p.value ? p.value : "FINISH"}
            </button>
          </div>
        )
      },
      { headerName: "Remark", field: "execNote", editable: canEdit, width: 120, cellStyle: { display: 'flex', alignItems: 'center' } },
    ];
  }, [syncUpdate, currentProject]);

  const getLotProgress = (lot) => {
    const rows = lot.stresses.flatMap(s => s.rowData);
    if (rows.length === 0) return 0;
    const done = rows.filter(r => r.endTime && r.endTime !== "").length;
    return Math.round((done / rows.length) * 100);
  };

  const activeLot = currentProject?.lots[activeLotTab];

  // 渲染 Header Info 的輔助函數，確保 Product ID 在前
  const renderHeaderInfo = () => {
    if (!currentProject) return null;
    const h = currentProject.header;
    // 定義顯示順序：Product ID 先，接著 Project Family，然後是其他
    const order = ["Product ID", "Project Family"];
    const otherKeys = Object.keys(h).filter(k => !order.includes(k));
    const sortedKeys = [...order, ...otherKeys];

    return sortedKeys.map(k => (
      <div key={k}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{k}</div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginTop: '2px' }}>
          {getDisplayName(k, h[k])}
        </div>
      </div>
    ));
  };

  return (
    <div style={{ padding: 0, background: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui', display: 'flex' }}>
      <div style={{ display: 'flex', gap: 0, width: '100%', height: '100vh' }}>
        
        {/* 左側清單 */}
        <div style={{ width: '280px', flexShrink: 0, background: '#f8fafc', borderRight: 'none' }}>
          <div style={{ background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>
            <div style={{ background: '#1e3a8a', padding: '15px', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>WORK ORDER LIST</div>
            
            <div style={{ padding: '12px 10px', borderBottom: '1px solid #e2e8f0' }}>
              <input 
                type="text" 
                placeholder="Search Product ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', 
                  borderRadius: '6px', fontSize: '12px', outline: 'none', fontFamily: 'system-ui'
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
                  <div style={{ width: '100%', height: '4px', background: '#e2e8f0', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', background: progress === 100 ? '#10b981' : '#2563eb', transition: 'width 0.3s' 
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '6px' }}>{progress}% Complete</div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右側主面板 */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingLeft: '8px', paddingRight: '0px' }}>
          {!currentProject ? (
            <div style={{ background: '#fff', padding: '100px', textAlign: 'center', borderRadius: 0, color: '#94a3b8' }}>Select an active project to begin</div>
          ) : (
            <>
              {/* Header Info - 位置互換處 */}
              <div style={{ background: '#fff', padding: '15px 25px', borderRadius: '8px 8px 0 0', marginBottom: 0, borderLeft: '6px solid #1e3a8a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '50px', borderBottom: '1px solid #e2e8f0', marginRight: '8px', marginTop: '0px' }}>
                {renderHeaderInfo()}
              </div>

              {/* LOT Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: 0, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', marginRight: '8px' }}>
                {currentProject.lots.map((lot, idx) => {
                  const progress = getLotProgress(lot);
                  return (
                    <div 
                      key={lot.id} 
                      onClick={() => setActiveLotTab(idx)}
                      style={{
                        padding: '10px 25px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                        background: activeLotTab === idx ? '#eff6ff' : 'transparent',
                        color: activeLotTab === idx ? '#1e3a8a' : '#64748b',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>LOT: {lot.lotId}</div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', background: '#e2e8f0' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#2563eb', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Grid Area */}
              {activeLot && (
                <div style={{ background: '#fff', padding: '0px 8px 8px 0px', flexGrow: 1, display: 'flex', flexDirection: 'column', marginRight: '8px', marginBottom: '8px' }}>
                  {activeLot.stresses.map((s, index) => (
                    <div key={s.id} className="ag-theme-alpine custom-grid" style={{ height: '100%', width: '100%' }}>
                      <AgGridReact
                        rowData={s.rowData}
                        columnDefs={columnDefs}
                        rowDragManaged={true}
                        animateRows={true}
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
        /* 1. 表格線改黑一點 */
        .custom-grid .ag-header { 
          background-color: #f8fafc !important; 
          border-bottom: 2px solid #333333 !important; 
        }
        .custom-grid .ag-row { 
          border-bottom: 1px solid #444444 !important; 
        }
        .custom-grid .ag-cell { 
          border-right: 1px solid #444444 !important; 
        }
        .custom-grid .ag-header-cell { 
          border-right: 1px solid #444444 !important; 
        }

        /* Stress 欄位特別黑線區隔 */
        .stress-column-border {
          border-right: 2px solid #000000 !important;
        }
        .stress-header-border {
          border-right: 2px solid #000000 !important;
        }

        .filter-btn { padding: 5px 12px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; background: #fff; color: #64748b; }
        .filter-btn.active { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
        .filter-btn.active-ongoing { background: #f59e0b; color: #fff; border-color: #f59e0b; }
        .filter-btn.active-pending { background: #94a3b8; color: #fff; border-color: #94a3b8; }

        .project-card { padding: 15px; border-radius: 10px; cursor: pointer; margin-bottom: 8px; border: 1px solid #e2e8f0; background: #fff; }
        .project-card.selected { border: 2px solid #2563eb; background: #eff6ff; }
        
        .op-button { width: 100%; height: 32px; border: none; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer; }
        .op-button.start { background: #2563eb; color: white; }
        .op-button.finish { background: #10b981; color: white; }
        .op-button.done { background: #f1f5f9; color: #64748b; cursor: default; }
        .op-button.waiting { background: #fff; color: #cbd5e1; border: 1px dashed #cbd5e1; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
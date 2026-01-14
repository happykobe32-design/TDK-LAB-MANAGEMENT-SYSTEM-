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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);

    if (data.length > 0) {
      const firstActive =
        data.find((p) => p.status === "in-process") ||
        data.find((p) => p.status === "Init");
      setSelectedId(firstActive ? firstActive.id : data[0].id);
    }
  }, []);

  useEffect(() => {
    setActiveLotTab(0);
  }, [selectedId]);

  const getDisplayName = (key, value) => {
    if (!value) return "-";
    if (key === "Project Family" && configMaster?.productFamilies) {
      const family = configMaster.productFamilies.find((f) => f.id === value);
      return family ? family.name : value;
    }
    return value;
  };

  const stats = useMemo(() => {
    const counts = { all: 0, ongoing: 0, pending: 0 };
    allProjects.forEach((p) => {
      const status = p.status || "Init";
      if (status !== "completed") {
        counts.all++;
        if (status === "in-process") counts.ongoing++;
        else if (status === "Init") counts.pending++;
      }
    });
    return counts;
  }, [allProjects]);

  const currentProject = useMemo(
    () => allProjects.find((p) => p.id === selectedId),
    [allProjects, selectedId]
  );

  const taskList = useMemo(() => {
    return allProjects
      .filter((p) => {
        const status = p.status || "Init";
        if (status === "completed") return false;
        if (filterMode === "ongoing") return status === "in-process";
        if (filterMode === "pending") return status === "Init";
        return true;
      })
      .filter((p) =>
        p.header["Product ID"]?.toString().includes(searchQuery)
      );
  }, [allProjects, filterMode, searchQuery]);

  const getProjectProgress = (project) => {
    const allRows = project.lots.flatMap((l) =>
      l.stresses.flatMap((s) => s.rowData)
    );
    if (allRows.length === 0) return 0;
    const done = allRows.filter((r) => r.endTime && r.endTime !== "").length;
    return Math.round((done / allRows.length) * 100);
  };

  const syncUpdate = useCallback(
    (lotId, stressId, rid, patch) => {
      setAllProjects((prevAll) => {
        const updated = prevAll.map((p) => {
          if (p.id !== selectedId) return p;
          const updatedLots = p.lots.map((l) =>
            l.id === lotId
              ? {
                  ...l,
                  stresses: l.stresses.map((s) =>
                    s.id === stressId
                      ? {
                          ...s,
                          rowData: s.rowData.map((r) =>
                            r._rid === rid ? { ...r, ...patch } : r
                          ),
                        }
                      : s
                  ),
                }
              : l
          );
          const allRows = updatedLots.flatMap((l) =>
            l.stresses.flatMap((s) => s.rowData)
          );
          const isAllDone = allRows.length > 0 && allRows.every((r) => r.endTime && r.endTime !== "");
          const isAnyStarted = allRows.some((r) => r.startTime && r.startTime !== "");
          let newStatus = "Init";
          if (isAllDone) newStatus = "completed";
          else if (isAnyStarted) newStatus = "in-process";
          return { ...p, lots: updatedLots, status: newStatus };
        });
        localStorage.setItem("all_projects", JSON.stringify(updated));
        return updated;
      });
    },
    [selectedId]
  );

  const columnDefs = useMemo(() => {
    const isProjectCompleted = currentProject?.status === "completed";
    const canEdit = !isProjectCompleted;

    return [
      {
        headerName: "STATUS",
        width: 110,
        pinned: "left",
        valueGetter: (p) => {
          if (p.data.endTime) return "Completed";
          if (p.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (p) => {
          const status = p.value;
          let bgColor = "#f1f5f9";
          let textColor = "#64748b";
          if (status === "In-Process") { bgColor = "#fef3c7"; textColor = "#92400e"; }
          if (status === "Completed") { bgColor = "#dcfce7"; textColor = "#166534"; }
          return (
            <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
              <span style={{ background: bgColor, color: textColor, padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                {status}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Stress",
        field: "stress",
        width: 100,
        pinned: "left",
        editable: false,
        cellClass: "stress-column-border",
        headerClass: "stress-header-border",
        cellStyle: { background: "#f8fafc", fontWeight: "bold", display: "flex", alignItems: "center" },
      },
      { headerName: "Type", field: "type", width: 90, editable: false },
      { headerName: "Operation", field: "operation", width: 120, editable: false },
      { headerName: "Condition", field: "condition", width: 150, editable: false },
      { headerName: "Sample Size", field: "sampleSize", width: 110, editable: canEdit },
      { headerName: "Program Name", field: "programName", width: 130, editable: false },
      { headerName: "Test Program", field: "testProgram", width: 130, editable: canEdit },
      { headerName: "Test Script", field: "testScript", width: 130, editable: canEdit },
      {
        headerName: "CHECK-IN",
        field: "startTime",
        width: 160,
        cellRenderer: (p) => (
          <button
            disabled={!!p.value}
            className={`op-button ${p.value ? "done" : "start"}`}
            onClick={() => {
              if (window.confirm("Are you sure you want to START?")) {
                syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { startTime: new Date().toLocaleString([], { hour12: false }) });
              }
            }}
          >
            {p.value || "▶ START"}
          </button>
        ),
      },
      {
        headerName: "CHECK-OUT",
        field: "endTime",
        width: 160,
        cellRenderer: (p) => (
          <button
            disabled={!p.data.startTime || !!p.value}
            className={`op-button ${p.data.startTime && !p.value ? "finish" : "waiting"}`}
            onClick={() => {
              if (window.confirm("Are you sure you want to FINISH?")) {
                syncUpdate(p.context.lotId, p.context.stressId, p.data._rid, { endTime: new Date().toLocaleString([], { hour12: false }) });
              }
            }}
          >
            {p.value || "■ FINISH"}
          </button>
        ),
      },
      { 
        headerName: "Note", 
        field: "execNote", 
        width: 180, 
        editable: canEdit,
        cellEditor: "agLargeTextCellEditor", // 支援多行編輯
        cellEditorPopup: true,
        wrapText: true,       // 內容自動換行
        autoHeight: true,     // 根據文字內容調整儲存格高度
        cellStyle: { lineHeight: '1.5', padding: '8px' }
      },
    ];
  }, [syncUpdate, currentProject]);

  const getLotProgress = (lot) => {
    const rows = lot.stresses.flatMap((s) => s.rowData);
    if (rows.length === 0) return 0;
    const done = rows.filter((r) => r.endTime && r.endTime !== "").length;
    return Math.round((done / rows.length) * 100);
  };

  const activeLot = currentProject?.lots[activeLotTab];

  const renderHeaderInfo = () => {
    if (!currentProject) return null;
    const h = currentProject.header;
    const order = ["Product ID", "Project Family"];
    const otherKeys = Object.keys(h).filter((k) => !order.includes(k));
    const sortedKeys = [...order, ...otherKeys];
    return sortedKeys.map((k) => (
      <div key={k}>
        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase" }}>{k}</div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: '#334155' }}>{getDisplayName(k, h[k])}</div>
      </div>
    ));
  };

  return (
    <div style={{ padding: 0, background: "#f1f5f9", minHeight: "100vh", fontFamily: "system-ui", display: "flex", overflow: "hidden", position: 'relative' }}>
      
      <div style={{ 
        width: isSidebarOpen ? "280px" : "0px", 
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", 
        flexShrink: 0, 
        overflow: "hidden", 
        background: "#f8fafc",
        borderRight: isSidebarOpen ? "1px solid #cbd5e1" : "0px solid transparent"
      }}>
        <div style={{ width: "280px", height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#1e3a8a", padding: "15px", color: "#fff", fontSize: "13px", fontWeight: "bold", letterSpacing: '0.5px' }}>WORK ORDER LIST</div>
          <div style={{ padding: "12px 10px", borderBottom: "1px solid #cbd5e1" }}>
            <input 
              type="text" 
              placeholder="Search Product ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", outline: "none" }}
            />
          </div>
          <div style={{ padding: "10px", borderBottom: "1px solid #cbd5e1", display: "flex", gap: "5px" }}>
            <button onClick={() => setFilterMode("all")} className={`filter-btn ${filterMode === "all" ? "active" : ""}`}>All ({stats.all})</button>
            <button onClick={() => setFilterMode("ongoing")} className={`filter-btn ${filterMode === "ongoing" ? "active-ongoing" : ""}`}>In-process ({stats.ongoing})</button>
            <button onClick={() => setFilterMode("pending")} className={`filter-btn ${filterMode === "pending" ? "active-pending" : ""}`}>Init ({stats.pending})</button>
          </div>
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}>
            {taskList.map((p) => {
              const progress = getProjectProgress(p);
              return (
                <div key={p.id} onClick={() => setSelectedId(p.id)} className={`project-card ${selectedId === p.id ? "selected" : ""}`}>
                  <div style={{ fontWeight: "800", color: "#1e293b", fontSize: "14px" }}>{p.header["Product ID"]}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Status: {p.status || "Init"}</div>
                  <div style={{ width: "100%", height: "4px", background: "#cbd5e1", marginTop: "8px", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#10b981" : "#2563eb", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e3a8a", marginTop: "6px" }}>{progress}% Complete</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-btn" style={{ left: isSidebarOpen ? '265px' : '10px' }}>
        {isSidebarOpen ? "❮" : "❯"}
      </div>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", background: "#f8fafc", paddingLeft: isSidebarOpen ? "0px" : "30px", transition: "padding 0.4s" }}>
        {!currentProject ? (
          <div style={{ background: "#fff", padding: "100px", textAlign: "center", color: "#94a3b8" }}>Select an active project to begin</div>
        ) : (
          <>
            <div style={{ background: "#fff", padding: "15px 25px", borderLeft: "6px solid #1e3a8a", display: "flex", gap: "50px", borderBottom: "1px solid #cbd5e1", marginRight: "8px" }}>
              {renderHeaderInfo()}
            </div>

            <div style={{ display: "flex", gap: "8px", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", marginRight: "8px", padding: '0 10px' }}>
              {currentProject.lots.map((lot, idx) => {
                const progress = getLotProgress(lot);
                return (
                  <div 
                    key={lot.id} 
                    onClick={() => setActiveLotTab(idx)}
                    style={{
                      padding: "12px 25px", cursor: "pointer", position: "relative", transition: 'all 0.2s',
                      background: activeLotTab === idx ? "#fff" : "transparent",
                      color: activeLotTab === idx ? "#1e3a8a" : "#64748b",
                      borderRadius: '8px 8px 0 0',
                      marginTop: '5px',
                      border: activeLotTab === idx ? '1px solid #cbd5e1' : '1px solid transparent',
                      borderBottom: 'none'
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "bold" }}>LOT: {lot.lotId}</div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "3px", background: "#cbd5e1" }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#10b981" : "#2563eb", transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ flexGrow: 1, overflowY: "auto", padding: "15px 15px 15px 0px" }}>
              {activeLot && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {activeLot.stresses.map((s) => (
                    <div key={s.id} className="ag-theme-alpine custom-grid" style={{ width: "100%" }}>
                      <AgGridReact
                        rowData={s.rowData}
                        columnDefs={columnDefs}
                        context={{ lotId: activeLot.id, stressId: s.id }}
                        headerHeight={45}
                        rowHeight={52}
                        domLayout="autoHeight" // 表格會根據內容自動增長，填滿空間
                        // 新增以下這段設定
                        defaultColDef={{
                          sortable: false,      // 1. 禁用排序
                          suppressMovable: true, // 2. 禁用標題拖拉移位
                          resizable: true,       // 如果你希望還能調整欄位寬度，保留這個；若也要禁止調寬度則設為 false
                        }}
                        onCellValueChanged={(params) => {
                          syncUpdate(activeLot.id, s.id, params.data._rid, { [params.column.colId]: params.newValue });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .sidebar-toggle-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 32px; height: 32px; background: #fff; border: 1px solid #cbd5e1;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          color: #1e3a8a; font-size: 12px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-toggle-btn:hover { background: #1e3a8a; color: #fff; transform: translateY(-50%) scale(1.1); }

        /* 加深隔線顏色 */
        .custom-grid .ag-header { background-color: #f8fafc !important; border-bottom: 2px solid #000 !important; }
        .custom-grid .ag-row { border-bottom: 1px solid #000 !important; } 
        .custom-grid .ag-cell { border-right: 1px solid #000 !important; display: flex; align-items: center; }
        .custom-grid .ag-header-cell { border-right: 1px solid #000 !important; }
        .stress-column-border { border-right: 2px solid #000 !important; }
        .stress-header-border { border-right: 2px solid #000 !important; }

        .filter-btn { padding: 5px 12px; font-size: 11px; font-weight: bold; border-radius: 20px; border: 1px solid #cbd5e1; cursor: pointer; background: #fff; color: #64748b; }
        .filter-btn.active { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
        .filter-btn.active-ongoing { background: #f59e0b; color: #fff; border-color: #f59e0b; }
        .filter-btn.active-pending { background: #94a3b8; color: #fff; border-color: #94a3b8; }

        .project-card { padding: 15px; border-radius: 10px; cursor: pointer; margin-bottom: 8px; border: 1px solid #cbd5e1; background: #fff; transition: all 0.2s; }
        .project-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .project-card.selected { border-left: 5px solid #2563eb; background: #eff6ff; }
        
        .op-button { width: 100%; height: 34px; border: none; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s; }
        .op-button.start { background: #2563eb; color: white; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .op-button.finish { background: #10b981; color: white; box-shadow: 0 2px 4px rgba(16,185,129,0.2); }
        .op-button.done { background: #f1f5f9; color: #94a3b8; cursor: default; }
        .op-button.waiting { background: transparent; color: #cbd5e1; border: 1px dashed #cbd5e1; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
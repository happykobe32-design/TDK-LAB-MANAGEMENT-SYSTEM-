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
    if (key === "Product Family" && configMaster?.productFamilies) {
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
        width: 90,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data.endTime === "SKIPPED") return "Skipped";
          if (params.data.endTime) return "Completed";
          if (params.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (params) => {
          const status = params.value;
          let bgColor = "#f1f5f9";
          let textColor = "#64748b";
          if (status === "In-Process") { bgColor = "#fef3c7"; textColor = "#92400e"; }
          if (status === "Completed") { bgColor = "#dcfce7"; textColor = "#166534"; }
          if (status === "Skipped") { bgColor = "#f1f5f9"; textColor = "#94a3b8"; }
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
        width: 110,
        pinned: "left",
        editable: false,
        cellClass: "stress-column-border",
        headerClass: "stress-header-border",
        cellStyle: { background: "#f8fafc", fontWeight: "bold", display: "flex", alignItems: "center" },
      },
      { headerName: "Type", field: "type", width: 90, editable: false },
      { headerName: "Operation", field: "operation", width: 120, editable: false },
      { headerName: "Condition", field: "condition", width: 140, editable: false },
      { 
        headerName: "Unit/Q'ty", 
        field: "qty", 
        width: 90, 
        editable: canEdit,
        cellStyle: (params) => ({ background: canEdit ? "#fffde7" : null }) 
      },
      { headerName: "Program Name", field: "programName", width: 140, editable: false },
      { headerName: "Test Program", field: "testProgram", width: 140, editable: false, cellStyle: { background: "#ffffff" } },
      { headerName: "Test Script", field: "testScript", width: 140, editable: false, cellStyle: { background: "#ffffff" } },
      {
        headerName: "CHECK-IN",
        field: "startTime",
        width: 130,
        cellStyle: (params) => ({ background: (canEdit && !params.value) ? "#fffde7" : null }),
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          let isPrevStepDone = true;
          if (rowIndex > 0) {
            const prevRow = params.api.getDisplayedRowAtIndex(rowIndex - 1);
            isPrevStepDone = !!(prevRow?.data?.endTime);
          }
          const isSkipped = params.data.endTime === "SKIPPED";
          return (
            <button
              disabled={!!params.value || !isPrevStepDone || isSkipped}
              className={`op-button btn-hover-effect ${params.value ? (isSkipped ? "waiting" : "done") : (isPrevStepDone && !isSkipped ? "start" : "waiting")}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to START?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { startTime: new Date().toLocaleString([], { hour12: false }) });
                }
              }}
            >
              {isSkipped ? "SKIPPED" : (params.value || (isPrevStepDone ? "▶ START" : "🔒 LOCKED"))}
            </button>
          );
        },
      },
      {
        headerName: "CHECK-OUT",
        field: "endTime",
        width: 130,
        cellStyle: (params) => ({ background: (canEdit && params.data.startTime && !params.value) ? "#fffde7" : null }),
        cellRenderer: (params) => {
          const isSkipped = params.value === "SKIPPED";
          return (
            <button
              disabled={!params.data.startTime || !!params.value || isSkipped}
              className={`op-button btn-hover-effect ${params.data.startTime && !params.value ? "finish" : "waiting"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to FINISH?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { endTime: new Date().toLocaleString([], { hour12: false }) });
                }
              }}
            >
              {isSkipped ? "SKIPPED" : (params.value || "■ FINISH")}
            </button>
          );
        }
      },
      { 
        headerName: "Hardware", 
        field: "hardware", 
        width: 95, 
        editable: canEdit,
        cellStyle: (params) => ({ background: canEdit ? "#fffde7" : null }) 
      },
      { 
        headerName: "Note", 
        field: "note", 
        width: 95, 
        editable: canEdit,
        cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: (params) => ({ lineHeight: '1.5', padding: '8px', background: canEdit ? "#fffde7" : null })
      },
      {
        headerName: "", // SKIP
        width: 50,
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          let isPrevStepDone = true;
          if (rowIndex > 0) {
            const prevRow = params.api.getDisplayedRowAtIndex(rowIndex - 1);
            isPrevStepDone = !!(prevRow?.data?.endTime);
          }
          const isProcessing = !!params.data.startTime || !!params.data.endTime;
          
          return (
            <button
              disabled={isProcessing || !isPrevStepDone}
              style={{
                width: "100%",
                height: "24px",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: (isProcessing || !isPrevStepDone) ? "not-allowed" : "pointer",
                background: (isProcessing || !isPrevStepDone) ? "#f1f5f9" : "#fff",
                color: (isProcessing || !isPrevStepDone) ? "#cbd5e1" : "#ef4444",
                border: `1px solid ${(isProcessing || !isPrevStepDone) ? "#cbd5e1" : "#ef4444"}`,
                borderRadius: "4px"
              }}
              onClick={() => {
                if (window.confirm("Skip this step?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { 
                    startTime: "SKIPPED", 
                    endTime: "SKIPPED" 
                  });
                }
              }}
            >
              SKIP
            </button>
          );
        }
      }
    ];
  }, [syncUpdate, currentProject]);

  const getLotProgress = (lot) => {
    const rows = lot.stresses.flatMap((s) => s.rowData);
    if (rows.length === 0) return 0;
    const done = rows.filter((r) => r.endTime && r.endTime !== "").length;
    return Math.round((done / rows.length) * 100);
  };

  const activeLot = currentProject?.lots[activeLotTab];

  const renderHeaderExcel = () => {
    if (!currentProject) return null;
    const h = currentProject.header;
    const order = [
      { label: "PRODUCT FAMILY", key: h["Product Family"] ? "Product Family" : "Project Family" },
      { label: "PRODUCT", key: "Product" },
      { label: "PRODUCT ID", key: "Product ID" },
      { label: "VERSION", key: "Version" },
      { label: "QR", key: "QR" },
      { label: "SAMPLE SIZE", key: "Sample Size" },
      { label: "OWNER", key: "Owner" },
      { label: "REMARK", key: "Remark" }
    ];

    return (
      <div style={{ display: "flex", width: "100%", border: "1px solid #cbd5e1", borderBottom: 'none' }}>
        {order.map((item, i) => {
          const val = getDisplayName("Product Family", h[item.key]);
          return (
            <div key={item.label} style={{ 
              flex: 1, 
              borderRight: i === order.length - 1 ? "none" : "1px solid #cbd5e1",
              minWidth: "80px",
              background: "#fff"
            }}>
              <div style={{ 
                fontSize: "10px", background: "#f1f5f9", color: "#475569", fontWeight: "800", padding: "6px 8px",
                borderBottom: "1px solid #cbd5e1", textAlign: "center"
              }}>
                {item.label}
              </div>
              <div style={{ 
                fontSize: "12px", color: "#1e293b", padding: "10px 8px", fontWeight: "600", textAlign: "center",
                wordBreak: "break-all", whiteSpace: "normal", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {val}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: 0, background: "#f1f5f9", minHeight: "100vh", fontFamily: "system-ui", display: "flex", overflow: "hidden", position: 'relative' }}>
      
      <div style={{ 
        width: isSidebarOpen ? "280px" : "0px", 
        transition: "width 0.3s ease", 
        flexShrink: 0, 
        overflow: "hidden", 
        background: "#f8fafc",
        borderRight: isSidebarOpen ? "1px solid #cbd5e1" : "0px solid transparent"
      }}>
        <div style={{ width: "280px", height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#1e3a8a", padding: "15px", color: "#fff", fontSize: "13px", fontWeight: "bold", letterSpacing: '0.5px' }}>WORK ORDER LIST</div>
          <div style={{ padding: "3px 3px", borderBottom: "1px solid #cbd5e1" }}>
            <input 
              type="text" 
              placeholder="Search Product ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", outline: "none" }}
            />
          </div>
          <div style={{ padding: "5px", borderBottom: "1px solid #cbd5e1", display: "flex", gap: "8px" }}>
            <button onClick={() => setFilterMode("all")} className={`filter-btn btn-hover-effect ${filterMode === "all" ? "active" : ""}`}>All ({stats.all})</button>
            <button onClick={() => setFilterMode("ongoing")} className={`filter-btn btn-hover-effect ${filterMode === "ongoing" ? "active-ongoing" : ""}`}>In-process ({stats.ongoing})</button>
            <button onClick={() => setFilterMode("pending")} className={`filter-btn btn-hover-effect ${filterMode === "pending" ? "active-pending" : ""}`}>Init ({stats.pending})</button>
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

      <div 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className="sidebar-toggle-btn" 
        style={{ 
          left: isSidebarOpen ? '280px' : '0px', 
          borderRadius: isSidebarOpen ? '0 50% 50% 0' : '0 50% 50% 0' 
        }}
      >
        {isSidebarOpen ? "❮" : "❯"}
      </div>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", background: "#f8fafc", transition: "all 0.3s ease" }}>
        {!currentProject ? (
          <div style={{ background: "#fff", padding: "100px", textAlign: "center", color: "#94a3b8" }}>Select an active project to begin</div>
        ) : (
          <>
            <div style={{ background: "#fff", borderBottom: "1px solid #cbd5e1" }}>
              {renderHeaderExcel()}
            </div>

            <div style={{ display: "flex", gap: "0px", background: "#f1f5f9", padding: '0px 0 0 0px' }}>
              {currentProject.lots.map((lot, idx) => {
                const progress = getLotProgress(lot);
                const isActive = activeLotTab === idx;
                return (
                  <div 
                    key={lot.id} 
                    onClick={() => setActiveLotTab(idx)}
                    className="btn-hover-effect lot-tab"
                    style={{
                      padding: "8px 30px", cursor: "pointer", position: "relative", transition: 'all 0.2s',
                      background: isActive ? "#fff" : "#e2e8f0",
                      color: isActive ? "#111112ff" : "#111112ff",
                      borderRadius: '8px 8px 0 0',
                      border: '1px solid #cbd5e1',
                      borderBottom: isActive ? '1px solid #fff' : '1px solid #cbd5e1',
                      zIndex: isActive ? 2 : 1,
                      marginBottom: isActive ? '2px' : '0',
                      fontWeight: "600", fontSize: "12px"
                    }}
                  >
                    LOT: {lot.lotId}
                    <div style={{ position: "absolute", bottom: 0, left: '10%', width: "80%", height: "2px", background: "#ebeae9f1", borderRadius: '2px' }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#10b981" : "#2563eb", transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ flexGrow: 1, overflowY: "auto", padding: "0" }}>
              <div style={{ background: "#000000ff", borderTop: '1px solid #000000ff' }}>
                {activeLot && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {activeLot.stresses.map((s, sIdx) => (
                      <div key={s.id} className="ag-theme-alpine custom-grid" style={{ width: "100%", borderBottom: sIdx === activeLot.stresses.length - 1 ? 'none' : '10px solid #f1f9f4ff' }}>
                        <AgGridReact
                          rowData={s.rowData}
                          columnDefs={columnDefs}
                          context={{ lotId: activeLot.id, stressId: s.id }}
                          headerHeight={30}
                          rowHeight={40}
                          domLayout="autoHeight"
                          defaultColDef={{
                            sortable: false,
                            suppressMovable: true,
                            resizable: true,
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
            </div>
          </>
        )}
      </div>

      <style>{`
        .sidebar-toggle-btn {
          position: absolute; top: 10px; 
          width: 20px; height: 30px; background: #fff; border: 1px solid #cbd5e1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 1000; box-shadow: 2px 0 5px rgba(0,0,0,0.05);
          color: #0645f4ff; font-size: 10px; transition: all 0.3s ease;
        }
        .sidebar-toggle-btn:hover { background: #e2e8f0; color: #1e3a8a; width: 28px; }

        .btn-hover-effect:hover {
          background-color: #e2e8f0 !important;
          transition: background-color 0.2s;
        }

        .custom-grid .ag-header { background-color: #f8fafc !important; border-bottom: 2px solid #000 !important; }
        .custom-grid .ag-row { border-bottom: 1px solid #000 !important; } 
        .custom-grid .ag-cell { border-right: 1px solid #000 !important; display: flex; align-items: center; }
        .custom-grid .ag-header-cell { border-right: 1px solid #000 !important; }
        .stress-column-border { border-right: 2px solid #000 !important; }
        .stress-header-border { border-right: 2px solid #000 !important; }

        .filter-btn { padding: 5px 12px; font-size: 11px; font-weight: bold; border-radius: 20px; border: 1px solid #cbe1cfff; cursor: pointer; background: #fff; color: #64748b; }
        .filter-btn.active { background: #1e3a8a !important; color: #fff; border-color: #1e3a8a; }
        .filter-btn.active-ongoing { background: #f59e0b !important; color: #fff; border-color: #f59e0b; }
        .filter-btn.active-pending { background: #94a3b8 !important; color: #fff; border-color: #94a3b8; }

        .project-card { padding: 15px; border-radius: 10px; cursor: pointer; margin-bottom: 8px; border: 1px solid #cbd5e1; background: #fff; transition: all 0.2s; }
        .project-card:hover { transform: translateY(-2px); background-color: #f8fafc; }
        .project-card.selected { border-left: 5px solid #2563eb; background: #eff6ff; }
        
        .op-button { width: 100%; height: 34px; border: none; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s; }
        .op-button.start { background: #2563eb; color: white; }
        .op-button.finish { background: #10b981; color: white; }
        .op-button.done { background: #f1f5f9; color: #94a3b8; cursor: default; }
        .op-button.waiting { background: transparent; color: #cbd5e1; border: 1px dashed #cbd5e1; cursor: not-allowed; }
        
        .op-button.start:hover { background-color: #1d4ed8 !important; }
        .op-button.finish:hover { background-color: #059669 !important; }
      `}</style>
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useLocation } from "react-router-dom";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function CheckInOutPage() {
  const location = useLocation();
  const [allProjects, setAllProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeLotTab, setActiveLotTab] = useState(0);
  const [configMaster, setConfigMaster] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(data);
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);

    const params = new URLSearchParams(location.search);
    const pIdxParam = params.get("pIdx");
    const lastViewedId = localStorage.getItem("last_viewed_project_id");

    if (data.length > 0) {
      if (pIdxParam !== null) {
        const targetProject = data[parseInt(pIdxParam)];
        if (targetProject) {
          setSelectedId(targetProject.id);
          localStorage.setItem("last_viewed_project_id", targetProject.id);
          return;
        }
      }
      if (lastViewedId) {
        const exists = data.find(p => p.id === lastViewedId);
        if (exists) {
          setSelectedId(lastViewedId);
          return;
        }
      }
      const firstActive = data.find((p) => p.status === "in-process") || data.find((p) => p.status === "Init");
      const finalId = firstActive ? firstActive.id : data[0].id;
      setSelectedId(finalId);
    }
  }, [location.search]);

  const getDisplayName = (key, value) => {
    if (!value) return "-";
    if (key === "Product Family" && configMaster?.productFamilies) {
      const family = configMaster.productFamilies.find((f) => f.id === value);
      return family ? family.name : value;
    }
    return value;
  };

  const currentProject = useMemo(
    () => allProjects.find((p) => p.id === selectedId),
    [allProjects, selectedId]
  );

  const getRowId = useCallback((params) => params.data._rid, []);

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
          const allRows = updatedLots.flatMap((l) => l.stresses.flatMap((s) => s.rowData));
          const isAllDone = allRows.length > 0 && allRows.every((r) => r.endTime && r.endTime !== "");
          const isAnyStarted = allRows.some((r) => r.startTime && r.startTime !== "");
          let newStatus = isAllDone ? "completed" : (isAnyStarted ? "in-process" : "Init");
          return { ...p, lots: updatedLots, status: newStatus };
        });
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
        width: 85,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data.endTime === "SKIPPED") return "Skipped";
          if (params.data.endTime) return "Completed";
          if (params.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (params) => {
          const status = params.value;
          let color = "#64748b"; // Init (Slate 500)
          let bgColor = "#f1f5f9"; 
          
          if (status === "Skipped") {
            color = "#94a3b8"; 
            bgColor = "#f8fafc"; 
          } else if (status === "In-Process") {
            color = "#b45309"; // Dark Orange
            bgColor = "#fef3c7"; 
          } else if (status === "Completed") {
            color = "#065f46"; // Dark Green
            bgColor = "#d1fae5"; 
          }
          
          return (
            <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "center" }}>
              <span style={{ 
                backgroundColor: bgColor, 
                color: color, 
                padding: "2px 6px", 
                borderRadius: "12px", 
                fontSize: "10px", 
                fontWeight: "800",
                lineHeight: "1"
              }}>
                {status.toUpperCase()}
              </span>
            </div>
          );
        },
      },
      {headerName: "Stress",field: "stress",width: 100,pinned: "left",},
      { headerName: "Type", field: "type", width: 80 },
      { headerName: "Operation", field: "operation", width: 100 },
      { 
        headerName: "Condition", 
        field: "condition", 
        width: 140, 
        wrapText: true, 
        autoHeight: true,
        cellStyle: { lineHeight: "1.2", padding: "4px 2px" }
      },
      { 
        headerName: "Units/Q'ty", 
        field: "qty", 
        width: 79, 
        editable: canEdit,
        cellStyle: (params) => ({ 
          background: canEdit ? "#fefce8" : "#fff", 
          textAlign: 'center',
          fontWeight: 'bold'
        }) 
      },
      { headerName: "Program Name", field: "programName", width: 120, wrapText: true, autoHeight: true },
      { headerName: "Test Program", field: "testProgram", width: 120, wrapText: true, autoHeight: true },
      { headerName: "Test Script", field: "testScript", width: 120, wrapText: true, autoHeight: true },
      {
        headerName: "CHECK-IN",
        field: "startTime",
        width: 120,
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          const isPrevStepDone = rowIndex === 0 || !!(params.api.getDisplayedRowAtIndex(rowIndex - 1)?.data?.endTime);
          const isSkipped = params.data.endTime === "SKIPPED";
          return (
            <button
              disabled={!!params.value || !isPrevStepDone || isSkipped}
              className={`op-button ${params.value ? "done" : (isPrevStepDone ? "start" : "waiting")}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to START?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { startTime: new Date().toLocaleString([], { hour12: false }) });
                }
              }}
            >
              {isSkipped ? "SKIPPED" : (params.value || (isPrevStepDone ? "▶ START" : "🔒"))}
            </button>
          );
        },
      },
      {
        headerName: "CHECK-OUT",
        field: "endTime",
        width: 120,
        cellRenderer: (params) => {
          const isSkipped = params.value === "SKIPPED";
          const canFinish = !!params.data.startTime && !params.value;
          return (
            <button
              disabled={!params.data.startTime || !!params.value || isSkipped}
              className={`op-button ${params.value ? "done" : (canFinish ? "finish" : "waiting")}`}
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
        width: 78, 
        editable: canEdit,
        cellStyle: (params) => ({ background: canEdit ? "#fefce8" : "#fff" }) 
      },
      { 
        headerName: "Note", 
        field: "note", 
        width: 100, 
        editable: canEdit,
        wrapText: true,
        autoHeight: true,
        cellStyle: (params) => ({ background: canEdit ? "#fefce8" : "#fff", lineHeight: '1.2' })
      },
      {
        headerName: "",
        width: 50,
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          const isThisStarted = !!params.data.startTime || !!params.data.endTime;
          let isPrevFullyDone = true;
          if (rowIndex > 0) {
            const prevRow = params.api.getDisplayedRowAtIndex(rowIndex - 1);
            isPrevFullyDone = !!prevRow?.data?.endTime;
          }
          const canSkipNow = !isThisStarted && isPrevFullyDone;

          return (
            <button
              disabled={!canSkipNow}
              className={`skip-btn ${canSkipNow ? "skip-active" : "skip-disabled"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to Skip this step?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { startTime: "SKIPPED", endTime: "SKIPPED" });
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
      <div style={{ display: "flex", width: "100%", border: "1px solid #334155", background: "#fff", marginBottom: "4px", borderRadius: "4px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {order.map((item, i) => (
          <div key={i} style={{ flex: 1, borderRight: i === order.length - 1 ? "none" : "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "9px", background: "#334155", color: "#fff", padding: "4px 2px", fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "12px", color: "#1e293b", padding: "6px 4px", fontWeight: "bold", textAlign: "center", minHeight: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getDisplayName("Product Family", h[item.key])}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: "10px", background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Roboto, sans-serif" }}>
      {!currentProject ? (
        <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>No Project Selected</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0px", maxWidth: "1400px", margin: "0 auto" }}>
          
          {renderHeaderExcel()}

          <div style={{ display: "flex", gap: "2px", paddingLeft: "0px" }}>
            {currentProject.lots.map((lot, idx) => (
              <div 
                key={lot.id} 
                onClick={() => setActiveLotTab(idx)}
                style={{
                  padding: "4px 8px", cursor: "pointer", fontSize: "11px", fontWeight: "bold",
                  background: activeLotTab === idx ? "#fff" : "#e2e8f0",
                  color: activeLotTab === idx ? "#2563eb" : "#64748b",
                  border: "1px solid #cbd5e1", borderBottom: activeLotTab === idx ? "2px solid #fff" : "1px solid #cbd5e1",
                  borderRadius: "6px 6px 0 0", zIndex: activeLotTab === idx ? 10 : 1,
                  marginBottom: "-1px", transition: "all 0.2s"
                }}
              >
                LOT: {lot.lotId}
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "0 4px 4px 4px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            {activeLot && activeLot.stresses.map((s, sIdx) => (
              <div key={s.id} className="ag-theme-alpine custom-grid" style={{ width: "100%", borderBottom: sIdx === activeLot.stresses.length - 1 ? 'none' : '4px solid #f1f5f9' }}>
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  context={{ lotId: activeLot.id, stressId: s.id }}
                  headerHeight={25}
                  rowHeight={32}
                  domLayout="autoHeight"
                  getRowId={getRowId}
                  defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }}
                  onCellValueChanged={(p) => syncUpdate(activeLot.id, s.id, p.data._rid, { [p.column.colId]: p.newValue })}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 0' }}>
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to save?")) {
                  localStorage.setItem("all_projects", JSON.stringify(allProjects));
                  alert("Data has been saved!");
                }
              }}
              style={{
                padding: '5px 30px', backgroundColor: '#0f172a', color: '#fff',
                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.1s'
              }}
            >
              SAVE 
            </button>
          </div>
        </div> 
      )}

      <style>{`
        .custom-grid { 
          box-sizing: border-box;
        }
        .custom-grid .ag-header { 
          background-color: #334155 !important; 
          border-bottom: 1px solid #1e293b !important;
        }
        .custom-grid .ag-header-cell-label { 
          color: #ffffff !important; 
          font-size: 11px; 
          font-weight: 700; 
          justify-content: center; 
          letter-spacing: 0.05em;
        }
        /*表格線*/  
        .custom-grid .ag-cell { 
          font-size: 11px; 
          border-right: 1px solid #b5b9bcff !important; 
          display: flex; 
          align-items: center; 
          color: #334155;
        }
        .custom-grid .ag-row { border-bottom: 1px solid #b5b9bcff !important; }
        
        .op-button { 
          width: 100%; height: 28px; border: none; border-radius: 4px; 
          font-weight: 800; font-size: 10px; cursor: pointer; transition: all 0.2s;
        }
        .op-button.start { background: #2563eb; color: #fff; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .op-button.start:hover { background: #1d4ed8; }
        
        .op-button.finish { background: #059669; color: #fff; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
        .op-button.finish:hover { background: #047857; }
        
        .op-button.done { background: transparent; color: #94a3b8; border: 1px solid #e2e8f0; cursor: default; }
        .op-button.waiting { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; cursor: not-allowed; }
        
        .skip-btn { width: 100%; height: 22px; font-size: 9px; font-weight: bold; cursor: pointer; border-radius: 4px; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .skip-active { color: #ef4444; border-color: #fecaca; background: #fff5f5; }
        .skip-active:hover { background: #fee2e2; border-color: #ef4444; }
        .skip-disabled { color: #e2e8f0; background: transparent; cursor: not-allowed; border-color: #f1f5f9; }
      `}</style>
    </div>
  );
}
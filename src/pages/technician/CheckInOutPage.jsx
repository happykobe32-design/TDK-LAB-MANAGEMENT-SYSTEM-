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

  // 重要：防止編輯時畫面跳動的 key
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
        width: 73,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data.endTime === "SKIPPED") return "Skipped";
          if (params.data.endTime) return "Completed";
          if (params.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (params) => {
          const status = params.value;
          let color = "#525f71ff"; // Init 預設顏色 (灰色)
          let bgColor = "transparent";
          if (status === "Skipped") {
            color = "#cdccceff"; 
            bgColor = "#f5f3ff"; 
          } else if (status === "In-Process") {
            color = "#f59e0b"; 
          } else if (status === "Completed") {
            color = "#10b981"; 
          }
          return (
            <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "center" }}>
              <span style={{ border: `1px solid ${color}`, color: color, padding: "0px 2px", borderRadius: "5px", fontSize: "10px", fontWeight: "bold" }}>
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
      { headerName: "Units/Q'ty", field: "qty", width: 79, editable: canEdit,cellStyle: (params) => ({ background: canEdit ? "#fff9c4" : "#fff", textAlign: 'center' }) },
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
        cellStyle: (params) => ({ background: canEdit ? "#fff9c4" : "#fff" }) 
      },
      { 
        headerName: "Note", 
        field: "note", 
        width: 100, 
        editable: canEdit,
        wrapText: true,
        autoHeight: true,
        cellStyle: (params) => ({ background: canEdit ? "#fff9c4" : "#fff", lineHeight: '1.2' })
      },
      {
        headerName: "",
        width: 60,
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          const isThisStarted = !!params.data.startTime || !!params.data.endTime;
          
          // 判斷前一個步驟是否完全結束
          let isPrevFullyDone = true;
          if (rowIndex > 0) {
            const prevRow = params.api.getDisplayedRowAtIndex(rowIndex - 1);
            isPrevFullyDone = !!prevRow?.data?.endTime;
          }

          // 只有在前一步已結束，且這步還沒開始時，才變紅色可點擊
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
      <div style={{ display: "flex", width: "100%", border: "2px solid #000", background: "#fff" }}>
        {order.map((item, i) => (
          <div key={i} style={{ flex: 1, borderRight: i === order.length - 1 ? "none" : "1px solid #000" }}>
            <div style={{ fontSize: "9px", background: "#334155", color: "#fff", padding: "2px 4px", fontWeight: "bold", textAlign: "center", borderBottom: "1px solid #000" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "12px", color: "#000", padding: "4px", fontWeight: "bold", textAlign: "center", minHeight: "22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getDisplayName("Product Family", h[item.key])}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: "0px", background: "#fff", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      {!currentProject ? (
        <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>No Project Selected</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
          
          {renderHeaderExcel()}

          <div style={{ display: "flex", gap: "2px", background: "#ffffffff", padding: "1px 4px 0 0px", }}>
            {currentProject.lots.map((lot, idx) => (
              <div 
                key={lot.id} 
                onClick={() => setActiveLotTab(idx)}
                style={{
                  padding: "4px 8px", cursor: "pointer", fontSize: "11px", fontWeight: "bold",
                  background: activeLotTab === idx ? "#fff" : "#cbd5e1",
                  color: activeLotTab === idx ? "#000" : "#64748b",
                  border: "1px solid #979494ff", borderBottom: activeLotTab === idx ? "none" : "1px solid #000",
                  borderRadius: "3px 3px 0 0", zIndex: activeLotTab === idx ? 10 : 1
                }}
              >
                LOT: {lot.lotId}
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderTop: 'none' }}>
            {activeLot && activeLot.stresses.map((s, sIdx) => (
              <div key={s.id} className="ag-theme-alpine custom-grid" style={{ width: "100%", borderBottom: sIdx === activeLot.stresses.length - 1 ? 'none' : '6px solid #334155' }}>
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  context={{ lotId: activeLot.id, stressId: s.id }}
                  headerHeight={25}
                  rowHeight={30}
                  domLayout="autoHeight"
                  getRowId={getRowId}
                  defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }}
                  onCellValueChanged={(p) => syncUpdate(activeLot.id, s.id, p.data._rid, { [p.column.colId]: p.newValue })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-grid .ag-header { background-color: #334155 !important; }
        .custom-grid .ag-header-cell-label { color: #fffffffb !important; font-size: 11px; font-weight: bold; justify-content: center; }
        .custom-grid .ag-cell { font-size: 11px; border-right: 1px solid #000 !important; display: flex; align-items: center; padding: 2px 2px !important; }
        .custom-grid .ag-row { border-bottom: 1px solid #000 !important; }
        .stress-column-border { border-right: 2px solid #000 !important; }
        
        .op-button { width: 100%; height: 24px; border: none; border-radius: 3px; font-weight: bold; font-size: 10px; cursor: pointer; }
        .op-button.start { background: #2563eb; color: #fff; }
        .op-button.finish { background: #059669; color: #fff; }
        .op-button.done { background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; cursor: default; }
        .op-button.waiting { background: #f8fafc; color: #cbd5e1; cursor: not-allowed; }
        
        .skip-btn { width: 100%; height: 20px; font-size: 9px; font-weight: bold; cursor: pointer; border-radius: 2px; border: 1px solid #d1d5db; transition: all 0.2s; }
        .skip-active { color: #ef4444; border-color: #ef4444; background: #fff; }
        .skip-active:hover { background: #fee2e2; }
        .skip-disabled { color: #cbd5e1; background: #f3f4f6; cursor: not-allowed; border-color: #e5e7eb; }
      `}</style>
    </div>
  );
}
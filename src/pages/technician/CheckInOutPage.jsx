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
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);

    const params = new URLSearchParams(location.search);
    const pIdxParam = params.get("pIdx");
    const lIdxParam = params.get("lIdx");
    const lastViewedId = localStorage.getItem("last_viewed_project_id");

    if (data.length > 0) {
      setAllProjects(data);

      if (pIdxParam !== null) {
        const targetProject = data[parseInt(pIdxParam)];
        if (targetProject) {
          setSelectedId(targetProject.id);
          localStorage.setItem("last_viewed_project_id", targetProject.id);
          if (lIdxParam !== null) {
            setActiveLotTab(parseInt(lIdxParam));
          }
          return;
        }
      }

      if (lastViewedId) {
        const exists = data.find(p => p.id === lastViewedId);
        if (exists) { setSelectedId(lastViewedId); return; }
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
          const isAllDone = allRows.length > 0 && allRows.every((r) => 
            (r.endTime && r.endTime !== "") || r.endTime === "SKIPPED"
          );
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

    // ✅ 修改這裡：日期時間在第一行，名字在第二行
    const getCurrentInfo = () => {
      const userName = sessionStorage.getItem("logged_user") || "Unknown";
      const now = new Date();
      // 第一行：2025/2/3 14:25
      const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      // 回傳兩行字串，中間用 \n 分隔
      return `${timeStr}\n(${userName})`;
    };

    return [
      {
        headerName: "STATUS",
        width: 65,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data.endTime === "SKIPPED" || params.data.startTime === "SKIPPED") return "Skipped";
          if (params.data.endTime) return "Completed";
          if (params.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (params) => {
          const status = params.value;
          let color = "#727a84ff"; 
          let bgColor = "#c2cad1ff";          
          if (status === "Skipped") {color = "#76808eff"; bgColor = "#f8fafc"; } 
          else if (status === "In-Process") {color = "#b45309";bgColor = "#fef3c7"; } 
          else if (status === "Completed") {color = "#065f46";bgColor = "#d1fae5"; } 

          return (
            <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "center" }}>
              <span style={{ 
                backgroundColor: bgColor, 
                color: color, 
                padding: "2px 3px", 
                borderRadius: "12px", 
                fontSize: "9px", 
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
      { headerName: "Type", field: "type", width: 75 },
      { headerName: "Operation", field: "operation", width: 85 },
      { 
        headerName: "Condition", 
        field: "condition", 
        width: 110, 
        wrapText: true, 
        autoHeight: true,
        cellStyle: { lineHeight: "1.2", padding: "4px 2px" }
      },
      { 
        headerName: "Units/Q'ty", 
        field: "qty", 
        width: 74, 
        editable: (p) => canEdit && p.data.startTime !== "SKIPPED",
        cellStyle: (params) => ({ background: params.data.startTime === "SKIPPED" ? "#ffffffff" : (canEdit ? "#fefce8" : "#fff") })
      },
      { headerName: "Program Name", field: "programName", width: 100, wrapText: true, autoHeight: true },
      { headerName: "Test Program", field: "testProgram", width: 100, wrapText: true, autoHeight: true },
      { headerName: "Test Script", field: "testScript", width: 100, wrapText: true, autoHeight: true },
      {
        headerName: "CHECK-IN",
        field: "startTime",
        width: 125, // 稍微調寬一點以容納完整日期時間
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          const isSkipped = params.data.startTime === "SKIPPED";
          const prevRow = rowIndex > 0 ? params.api.getDisplayedRowAtIndex(rowIndex - 1)?.data : null;
          const isPrevStepDone = rowIndex === 0 || (!!prevRow?.endTime && prevRow?.endTime !== "");

          if (isSkipped) return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;

          if (params.value) {
            const parts = String(params.value).split('\n');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', width: '100%' }}>
                <span style={{ color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>{parts[0]}</span>
                <span style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 'bold' }}>{parts[1] || ""}</span>
              </div>
            );
          }

          return (
            <button
              disabled={!isPrevStepDone}
              className={`op-button ${isPrevStepDone ? "start" : "waiting"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to START?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { startTime: getCurrentInfo() });
                }
              }}
            >
              {isPrevStepDone ? "▶ START" : "🔒"}
            </button>
          );
        },
      },
      {
        headerName: "CHECK-OUT",
        field: "endTime",
        width: 125,
        cellRenderer: (params) => {
          const isSkipped = params.data.endTime === "SKIPPED";
          if (isSkipped) return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;

          if (params.value) {
            const parts = String(params.value).split('\n');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', width: '100%' }}>
                <span style={{ color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>{parts[0]}</span>
                <span style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 'bold' }}>{parts[1] || ""}</span>
              </div>
            );
          }

          const canFinish = !!params.data.startTime && params.data.startTime !== "SKIPPED";
          return (
            <button
              disabled={!canFinish}
              className={`op-button ${canFinish ? "finish" : "waiting"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to FINISH?")) {
                  syncUpdate(params.context.lotId, params.context.stressId, params.data._rid, { endTime: getCurrentInfo() });
                }
              }}
            >
              ■ FINISH
            </button>
          );
        }
      },
      { 
        headerName: "Hardware", 
        field: "hardware", 
        width: 70, 
        editable: (p) => canEdit && p.data.startTime !== "SKIPPED",
        cellStyle: (params) => ({ background: params.data.startTime === "SKIPPED" ? "#ffffffff" : (canEdit ? "#fefce8" : "#fff") }) 
      },
      { 
        headerName: "Note", 
        field: "note", 
        width: 120, 
        editable: (p) => canEdit && p.data.startTime !== "SKIPPED",
        cellStyle: (params) => ({ background: params.data.startTime === "SKIPPED" ? "#ffffffff" : (canEdit ? "#fefce8" : "#fff") }) 
      },
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
    <div style={{ padding: "10px", background: "#ffffffff", minHeight: "100vh", fontFamily: "Segoe UI, Roboto, sans-serif" }}>
      {!currentProject ? (
        <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>No Project Selected</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0px", maxWidth: "1400px", margin: "0 auto" }}>
          
          {renderHeaderExcel()}

          <div style={{ display: "flex", gap: "2px", paddingLeft: "0px" }}>
            {currentProject.lots.map((lot, idx) => {
              const params = new URLSearchParams(window.location.search);
              const lIdxParam = params.get("lIdx");
              if (lIdxParam !== null && idx !== parseInt(lIdxParam)) return null;

              return (
                <div 
                  key={lot.id} 
                  onClick={() => setActiveLotTab(idx)}
                  style={{
                    padding: "4px 15px", 
                    cursor: "pointer", 
                    fontSize: "11px", 
                    fontWeight: "bold",
                    background: activeLotTab === idx ? "#fff" : "#e2e8f0",
                    color: activeLotTab === idx ? "#2563eb" : "#64748b",
                    border: "1px solid #cbd5e1", 
                    borderBottom: activeLotTab === idx ? "2px solid #fff" : "1px solid #cbd5e1",
                    borderRadius: "6px 6px 0 0", 
                    zIndex: activeLotTab === idx ? 10 : 1,
                    marginBottom: "-1px", 
                    transition: "all 0.2s"
                  }}
                >
                  LOT: {lot.lotId}
                </div>
              );
            })}
          </div>

          <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "0 4px 4px 4px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            {activeLot && activeLot.stresses.map((s, sIdx) => (
              <div key={s.id} className="ag-theme-alpine custom-grid" style={{ width: "100%", borderBottom: sIdx === activeLot.stresses.length - 1 ? 'none' : '4px solid #f1f5f9' }}>
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  context={{ lotId: activeLot.id, stressId: s.id }}
                  headerHeight={25}
                  rowHeight={42} // 稍微加高 Row 以容納兩行文字
                  domLayout="autoHeight"
                  getRowId={getRowId}
                  getRowStyle={(params) => {
                    if (params.data.startTime === "SKIPPED") {
                      return { backgroundColor: "#ffffffff" };
                    }
                  }}
                  defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }}
                  onCellValueChanged={(p) => syncUpdate(activeLot.id, s.id, p.data._rid, { [p.column.colId]: p.newValue })}
                />
              </div>
            ))}
          </div>
        </div> 
      )}

      <style>{`
        .custom-grid { box-sizing: border-box; }
        .custom-grid .ag-header { background-color: #334155 !important; border-bottom: 1px solid #1e293b !important; }
        .custom-grid .ag-header-cell-label { 
          color: #ffffff !important; font-size: 9px; font-weight: 700; 
          justify-content: center; letter-spacing: 0.05em;
        }
        .custom-grid .ag-cell { 
          font-size: 10px; padding: 2px 4px !important; 
          line-height: 1.1 !important; border-right: 1px solid #b5b9bcff !important; 
          display: flex; align-items: center; color: #000000ff;
        }
        .custom-grid .ag-row { border-bottom: 1px solid #b5b9bcff !important; }
        .op-button { 
          width: 100%; height: 25px; border: none; border-radius: 4px; 
          font-weight: 800; font-size: 10px; cursor: pointer; transition: all 0.2s;
        }
        .op-button.start { background: #2563eb; color: #fff; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .op-button.start:hover { background: #1d4ed8; }
        .op-button.finish { background: #059669; color: #fff; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
        .op-button.finish:hover { background: #047857; }
        .op-button.waiting { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
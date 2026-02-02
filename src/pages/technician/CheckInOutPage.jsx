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
    const lIdxParam = params.get("lIdx"); // technician跳轉邏輯:QR+Lot 獲取特定的 Lot 索引
    const lastViewedId = localStorage.getItem("last_viewed_project_id");

    if (data.length > 0) {
      setAllProjects(data); // 始終載入完整數據，避免表格抓不到資料

      if (pIdxParam !== null) {
        const targetProject = data[parseInt(pIdxParam)];
        if (targetProject) {
          setSelectedId(targetProject.id);
          localStorage.setItem("last_viewed_project_id", targetProject.id);
          
          // ✅ 核心：如果是從 QR 跳轉過來的，強制設定該 Lot 為當前分頁
          if (lIdxParam !== null) {
            setActiveLotTab(parseInt(lIdxParam));
          }
          return;
        }
      }

      // 一般進入流程
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
          // 💡 修改這裡：檢查是否全部完成 (包括被跳過的)
          const isAllDone = allRows.length > 0 && allRows.every((r) => 
            (r.endTime && r.endTime !== "") || r.endTime === "SKIPPED"
          );
          const isAnyStarted = allRows.some((r) => r.startTime && r.startTime !== "");
          let newStatus = isAllDone ? "completed" : (isAnyStarted ? "in-process" : "Init");
          return { ...p, lots: updatedLots, status: newStatus };
        });
        // ✅ 輸入即存檔
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
        width: 65,
        pinned: "left",
        valueGetter: (params) => {
          // 邏輯：只要 endTime 或 startTime 是 "SKIPPED"，狀態就是 Skipped
          if (params.data.endTime === "SKIPPED" || params.data.startTime === "SKIPPED") return "Skipped";
          if (params.data.endTime) return "Completed";
          if (params.data.startTime) return "In-Process";
          return "Init";
        },
        cellRenderer: (params) => {
          const status = params.value;
          let color = "#727a84ff"; // Init (Slate 500)
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
        width: 120,
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex;
          const isSkipped = params.data.startTime === "SKIPPED";
          
          // 💡 關鍵邏輯：檢查前一步是否完成 或 被跳過
          const prevRow = rowIndex > 0 ? params.api.getDisplayedRowAtIndex(rowIndex - 1)?.data : null;
          const isPrevStepDone = rowIndex === 0 || (!!prevRow?.endTime && prevRow?.endTime !== "");

          if (isSkipped) return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;

          const isDone = !!params.value;
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
          const isSkipped = params.data.endTime === "SKIPPED";
          if (isSkipped) return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;

          const canFinish = !!params.data.startTime && params.data.startTime !== "SKIPPED" && !params.value;
          const isDone = !!params.value;
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

          {/* 渲染 Lot Tabs */}
          <div style={{ display: "flex", gap: "2px", paddingLeft: "0px" }}>
            {currentProject.lots.map((lot, idx) => {
              // --- 隱藏邏輯：檢查 URL 是否有指定特定的 lIdx ---
              const params = new URLSearchParams(window.location.search);
              const lIdxParam = params.get("lIdx");
              
              // 如果 URL 指定了 lIdx，且目前這個 Tab 不是該索引，就不顯示
              if (lIdxParam !== null && idx !== parseInt(lIdxParam)) {
                return null;
              }

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
                  rowHeight={32}
                  domLayout="autoHeight"
                  getRowId={getRowId}
                  // 💡 加入這個屬性
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
        .custom-grid { 
          box-sizing: border-box;
        }
        .custom-grid .ag-header { 
          background-color: #334155 !important; 
          border-bottom: 1px solid #1e293b !important;
        }
          /*表頭*/ 
        .custom-grid .ag-header-cell-label { 
          color: #ffffff !important; 
          font-size: 9px; 
          font-weight: 700; 
          justify-content: center; 
          letter-spacing: 0.05em;
        }
        /*表格內*/  
        .custom-grid .ag-cell { 
          font-size: 10px;
          padding: 2px 4px !important; /* 減少左右內邊距 */ 
          line-height: 1.1 !important;
          border-right: 1px solid #b5b9bcff !important; 
          display: flex; 
          align-items: center; 
          color: #000000ff;
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
        
        .op-button.done { background: transparent; color: #94a3b8; border: 1px solid #e2e8f0; cursor: default; }
        .op-button.waiting { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; cursor: not-allowed; }

      `}</style>
    </div>
  );
}
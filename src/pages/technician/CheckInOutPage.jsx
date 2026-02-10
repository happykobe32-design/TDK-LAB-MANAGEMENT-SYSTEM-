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
  const [activeStressIdx, setActiveStressIdx] = useState(null);
  const [configMaster, setConfigMaster] = useState(null);
  
  // 獲取當前使用者角色
  const userRole = sessionStorage.getItem("logged_role"); 
  const isTechnician = userRole === "technician";
  const isAdminOrEngineer = userRole === "admin" || userRole === "engineer";

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);

    const params = new URLSearchParams(location.search);
    const pIdx = params.get("pIdx");
    const lIdx = params.get("lIdx");
    const sIdx = params.get("sIdx");
    const urlStress = params.get("stress");

    if (data.length > 0) {
      setAllProjects(data);
      
      if (pIdx !== null) {
        const target = data[parseInt(pIdx)];
        if (target) {
          const l = lIdx !== null ? parseInt(lIdx) : 0;
          const s = sIdx !== null ? parseInt(sIdx) : 0;
          setSelectedId(target.id);
          setActiveLotTab(l);
          setActiveStressIdx(s);
          
          localStorage.setItem("last_viewed_project_id", target.id);
          localStorage.setItem("last_viewed_lIdx", l);
          localStorage.setItem("last_viewed_sIdx", s);
          if (urlStress) localStorage.setItem("last_viewed_stress_name", urlStress);
          return;
        }
      }
      
      const lastId = localStorage.getItem("last_viewed_project_id");
      const lastL = localStorage.getItem("last_viewed_lIdx");
      const lastS = localStorage.getItem("last_viewed_sIdx");
      
      const exists = data.find(p => p.id === lastId);
      if (exists) {
        setSelectedId(lastId);
        setActiveLotTab(lastL !== null ? parseInt(lastL) : 0);
        setActiveStressIdx(lastS !== null ? parseInt(lastS) : 0);
      } else {
        setSelectedId(data[0].id);
        setActiveLotTab(0);
        setActiveStressIdx(0);
      }
    }
  }, [location.search]);

  const currentProject = useMemo(() => allProjects.find(p => p.id === selectedId), [allProjects, selectedId]);
  const activeLot = currentProject?.lots[activeLotTab];

  const targetStress = useMemo(() => {
    if (!activeLot) return null;
    if (activeStressIdx !== null && activeLot.stresses[activeStressIdx]) {
      return activeLot.stresses[activeStressIdx];
    }
    return activeLot.stresses[0];
  }, [activeLot, activeStressIdx]);

  const getRowId = useCallback((params) => params.data._rid, []);

  // 核心自動存檔與同步邏輯
  const syncUpdate = useCallback((lotId, stressId, rid, patch) => {
    setAllProjects(prev => {
      const updated = prev.map(p => {
        if (p.id !== selectedId) return p;
        const newLots = p.lots.map(l => {
          if (l.id !== lotId) return l;
          return {
            ...l,
            stresses: l.stresses.map(s => s.id === stressId ? {
              ...s, rowData: s.rowData.map(r => r._rid === rid ? { ...r, ...patch } : r)
            } : s)
          };
        });
        return { ...p, lots: newLots };
      });
      localStorage.setItem("all_projects", JSON.stringify(updated));
      return updated;
    });
  }, [selectedId]);

  const columnDefs = useMemo(() => {
    const getCurrentInfo = () => {
      const user = sessionStorage.getItem("logged_user") || "Unknown";
      const now = new Date();
      return `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}\n(${user})`;
    };

    // 權限檢查輔助函式
    const getEditable = (field) => {
        if (isAdminOrEngineer) return true;
        if (isTechnician) {
            return ["qty", "startTime", "endTime", "hardware", "note"].includes(field);
        }
        return false;
    };

    const baseCols = [
      { 
        headerName: "STATUS", width: 75, pinned: "left",
        valueGetter: p => {
            if (p.data.startTime === "SKIPPED") return "SKIPPED";
            return p.data.endTime ? "COMPLETED" : (p.data.startTime ? "IN-PROCESS" : "INIT");
        },
        cellRenderer: p => (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <span style={{ 
              fontSize: "9px", fontWeight: "800", padding: "2px 4px", borderRadius: "10px",
              background: p.value === "COMPLETED" ? "#d1fae5" : (p.value === "IN-PROCESS" ? "#fef3c7" : (p.value === "SKIPPED" ? "#f1f5f9" : "#e2e8f0")),
              color: p.value === "COMPLETED" ? "#065f46" : (p.value === "IN-PROCESS" ? "#92400e" : (p.value === "SKIPPED" ? "#94a3b8" : "#64748b"))
            }}>{p.value}</span>
          </div>
        )
      },
      { headerName: "Type", field: "type", width: 70, editable: getEditable("type") },
      { headerName: "Operation", field: "operation", width: 90, editable: getEditable("operation") },
      { headerName: "Condition", field: "condition", width: 130, wrapText: true, autoHeight: true, editable: getEditable("condition") },
      { headerName: "Program Name", field: "programName", width: 100, wrapText: true, autoHeight: true, editable: getEditable("programName") },
      { headerName: "Test Program", field: "testProgram", width: 100, wrapText: true, autoHeight: true, editable: getEditable("testProgram") },
      { headerName: "Test Script", field: "testScript", width: 100, wrapText: true, autoHeight: true, editable: getEditable("testScript") },
      { headerName: "Units", field: "qty", width: 60, editable: getEditable("qty"), cellStyle: { background: "#fffbe6" } },
      {
        headerName: "CHECK-IN",
        field: "startTime",
        width: 115,
        cellRenderer: p => {
          if (p.data.startTime === "SKIPPED") return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;
          if (p.value) {
            const parts = String(p.value).split('\n');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', width: '100%' }}>
                <span style={{ color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>{parts[0]}</span>
                <span style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 'bold' }}>{parts[1] || ""}</span>
              </div>
            );
          }
          const rowIndex = p.node.rowIndex;
          let canStart = rowIndex === 0 || (p.api.getDisplayedRowAtIndex(rowIndex - 1)?.data.endTime);
          return (
            <button 
              disabled={!canStart}
              className={`op-btn ${canStart ? "start" : "disabled"}`} 
              onClick={() => {
                if (window.confirm("Are you sure you want to START?")) {
                  syncUpdate(activeLot.id, targetStress.id, p.data._rid, { startTime: getCurrentInfo() });
                }
              }}
            >▶ START</button>
          );
        }
      },
      {
        headerName: "CHECK-OUT",
        field: "endTime",
        width: 125,
        cellRenderer: (params) => {
          if (params.data.startTime === "SKIPPED") return <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "10px", fontWeight: "bold" }}>SKIPPED</div>;
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
              className={`op-btn ${canFinish ? "end" : "disabled"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to FINISH?")) {
                  syncUpdate(activeLot.id, targetStress.id, params.data._rid, { endTime: getCurrentInfo() });
                }
              }}
            >■ FINISH</button>
          );
        }
      },
      { headerName: "Hardware", field: "hardware", width: 80, editable: getEditable("hardware"), cellStyle: { background: "#fffbe6" } },
      { headerName: "Note", field: "note", width: 120, editable: getEditable("note"), cellStyle: { background: "#fffbe6" } },
    ];

    // 如果是 Admin 或 Engineer，加入 Skip 按鈕
    if (isAdminOrEngineer) {
      baseCols.push({
        headerName: "SKIP",
        width: 60,
        cellRenderer: p => {
          const isSkipped = p.data.startTime === "SKIPPED";
          return (
            <button 
              style={{
                width: "100%", height: "22px", fontSize: "9px", padding: "0",
                background: isSkipped ? "#cbd5e1" : "#fff",
                border: "1px solid #000", color: isSkipped ? "#fff" : "#000",
                cursor: "pointer", fontWeight: "bold"
              }}
              onClick={() => {
                if (isSkipped) {
                  syncUpdate(activeLot.id, targetStress.id, p.data._rid, { startTime: "", endTime: "" });
                } else {
                  if (window.confirm("Skip this step?")) {
                    syncUpdate(activeLot.id, targetStress.id, p.data._rid, { startTime: "SKIPPED", endTime: "SKIPPED" });
                  }
                }
              }}
            >
              {isSkipped ? "UNDO" : "SKIP"}
            </button>
          );
        }
      });
    }

    return baseCols;
  }, [syncUpdate, activeLot, targetStress, isAdminOrEngineer, isTechnician]);

  const renderWorkOrderHeader = () => {
    if (!currentProject) return null;
    const h = currentProject.header;
    
    let pfDisplay = h["Product Family"];
    if (pfDisplay && pfDisplay.startsWith("PF_")) {
       const found = configMaster?.productFamilies?.find(f => f.id === pfDisplay);
       if (found) pfDisplay = found.name;
       else if (currentProject.productFamilyName) pfDisplay = currentProject.productFamilyName;
    }

    const stressName = targetStress?.stress || 
                       (activeLot?.stresses && activeLot.stresses[activeStressIdx]?.stress) || 
                       (new URLSearchParams(location.search)).get("stress") || 
                       localStorage.getItem("last_viewed_stress_name") || "-";
    
    const InfoBox = ({ label, value, color = "#000000ff", flex = 1 }) => (
      <div style={{ flex: flex, borderRight: "1px solid #000000ff", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#d7dbdeff", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderBottom: "1px solid #000000ff", color: "#000000ff" }}>{label}</div>
        <div style={{ padding: "4px 6px", fontSize: "12px", fontWeight: "bold", color: color }}>{value || "-"}</div>
      </div>
    );

    return (
      <div style={{ border: "1px solid #000000ff", borderRadius: "0px", overflow: "hidden", background: "#fff", marginBottom: "10px" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #000000ff" }}>
          <InfoBox label="PRODUCT FAMILY" value={pfDisplay} />
          <InfoBox label="PRODUCT" value={h["Product"]} />
          <InfoBox label="VERSION" value={h["Version"]} />
          <InfoBox label="SAMPLE SIZE" value={h["Sample Size"]} />
          <InfoBox label="QR" value={h["QR"]} />
          <InfoBox label="OWNER" value={h["Owner"]} />
        </div>
        <div style={{ display: "flex" }}>
          <InfoBox label="LOT NO." value={activeLot?.lotId} />
          <InfoBox label="STRESS" value={stressName}  />         
          <InfoBox label="REMARK" value={h["Remark"]} flex={2} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "5px", background: "#ffffffff", minHeight: "100vh" }}>
      <div style={{ width: "100%", margin: "0 auto" }}>
        {renderWorkOrderHeader()}

        <div className="ag-theme-alpine custom-grid" style={{ width: "100%", overflow: "hidden" }}>
          {targetStress && (
            <AgGridReact
              rowData={targetStress.rowData}
              columnDefs={columnDefs}
              domLayout="autoHeight"
              getRowId={getRowId}
              headerHeight={24}
              rowHeight={40}
              singleClickEdit={true}
              stopEditingWhenCellsLoseFocus={true}
              defaultColDef={{ resizable: true, sortable: false }}
              onCellValueChanged={(p) => {
                syncUpdate(activeLot.id, targetStress.id, p.data._rid, { [p.column.colId]: p.newValue });
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        .custom-grid { border: 1px solid #000000ff; border-radius: 0px; }
        .ag-theme-alpine { --ag-row-hover-color: #f8fafc; }
        .ag-header { background-color: #d7dbdeff !important; border-bottom: 1px solid #000000ff !important; }
        .ag-header-cell { border-right: 1px solid #000000ff !important; }
        .ag-header-cell-label { color: #040404ff !important; font-size: 10px; justify-content: center; font-weight: bold; }
        .ag-cell { display: flex; align-items: center; border-right: 1px solid #000000ff !important; font-size: 10px; padding: 2px 4px !important; }
        .ag-row { border-bottom: 1px solid #000000ff !important; }
        .op-btn { width: 100%; height: 28px; border: none; border-radius: 4px; font-weight: 800; cursor: pointer; font-size: 9px; }
        .op-btn.start { background: #2563eb; color: #fff; }
        .op-btn.end { background: #059669; color: #fff; }
        .op-btn.disabled { background: #f1f5f9; color: #cbd5e1; cursor: not-allowed; border: 1px dashed #000000ff; }
      `}</style>
    </div>
  );
}
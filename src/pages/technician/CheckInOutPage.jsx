import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useLocation } from "react-router-dom";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = `http://${window.location.hostname}:8000`;

export default function CheckInOutPage() {
  const location = useLocation();
  const [currentProject, setCurrentProject] = useState(null);
  const [activeLot, setActiveLot] = useState(null);
  const [targetStress, setTargetStress] = useState(null);
  const [configMaster, setConfigMaster] = useState(null);
  
  const userRole = sessionStorage.getItem("logged_role"); 
  const isTechnician = userRole === "technician";
  const isAdminOrEngineer = userRole === "admin" || userRole === "engineer";

  const loadDataFromBackend = useCallback(async () => {
    const params = new URLSearchParams(location.search);
    const pIdx = params.get("pIdx");
    const urlStressName = params.get("stress");
    const urlLotId = params.get("lotId");

    try {
      const [pRes, rcRes, tRes, sListRes] = await Promise.all([
        fetch(`${API_BASE}/projects/`),
        fetch(`${API_BASE}/run_cards/`),
        fetch(`${API_BASE}/tasks/`),
        fetch(`${API_BASE}/stress/`)
      ]);

      const allP = await pRes.json();
      const allRC = await rcRes.json();
      const allT = await tRes.json();
      const allS = await sListRes.json();

      const proj = allP.find(p => p.project_id === parseInt(pIdx));
      if (proj) {
        setCurrentProject({
          header: {
            "Product Family": proj.product_family,
            "Product": proj.product,
            "Version": proj.version,
            "Sample Size": proj.sample_size,
            "QR": proj.qr,
            "Owner": proj.owner,
            "Remark": proj.remark
          },
          productFamilyName: proj.product_family
        });
      }

      const stressObj = allS.find(s => s.stress === urlStressName);
      const rc = allRC.find(r => 
        r.project_id === parseInt(pIdx) && 
        r.stress_id === stressObj?.stress_id &&
        (urlLotId ? r.lot_id === urlLotId : true)
      );

      if (rc) {
        setActiveLot({ lotId: rc.lot_id, id: rc.run_card_id });
        const relatedTasks = allT
          .filter(t => t.run_card_id === rc.run_card_id)
          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
          .map(t => ({
            ...t,
            _rid: String(t.task_id), 
            startTime: t.check_in_time,
            endTime: t.check_out_time,
            qty: t.unit_qty,
            programName: t.program_name,
            testProgram: t.test_program,
            testScript: t.test_script,
            status: t.status 
          }));

        setTargetStress({
          id: rc.run_card_id,
          stress: urlStressName,
          rowData: relatedTasks
        });
      }
    } catch (err) {
      console.error("API Load Error:", err);
    }
  }, [location.search]);

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem("config_master") || "null");
    setConfigMaster(config);
    loadDataFromBackend();
  }, [loadDataFromBackend]);

  const getRowId = useCallback((params) => String(params.data._rid), []);

  const syncUpdate = useCallback(async (lotId, stressId, rid, patch) => {
    setTargetStress(prev => {
      if (!prev) return prev;
      const newData = prev.rowData.map(r => r._rid === rid ? { ...r, ...patch } : r);
      return { ...prev, rowData: newData };
    });

    const backendPatch = {};
    backendPatch.updated_by = sessionStorage.getItem("logged_user") || "Unknown User";

    if ("startTime" in patch) backendPatch.check_in_time = patch.startTime;
    if ("endTime" in patch) backendPatch.check_out_time = patch.endTime;
    if ("qty" in patch) backendPatch.unit_qty = Number(patch.qty) || 0;
    if ("hardware" in patch) backendPatch.hardware = patch.hardware;
    if ("note" in patch) backendPatch.note = patch.note;
    if ("type" in patch) backendPatch.type = patch.type;
    if ("operation" in patch) backendPatch.operation = patch.operation;
    if ("condition" in patch) backendPatch.condition = patch.condition;
    if ("programName" in patch) backendPatch.program_name = patch.programName;
    if ("testProgram" in patch) backendPatch.test_program = patch.testProgram;
    if ("testScript" in patch) backendPatch.test_script = patch.testScript;
    if ("status" in patch) backendPatch.status = patch.status;

    try {
      const response = await fetch(`${API_BASE}/tasks/${rid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPatch)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend Error Detail:", errorData);
        throw new Error("Save Failed");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      alert("存檔失敗，請檢查網路連線或後端欄位驗證。");
    }
  }, []);

  const columnDefs = useMemo(() => {
    const getCurrentInfo = () => {
      const user = sessionStorage.getItem("logged_user") || "Unknown";
      const now = new Date();
      const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      return `${timeStr}\n(${user})`;
    };

    const getEditable = (field) => {
        if (isAdminOrEngineer) return true;
        if (isTechnician) return ["qty", "startTime", "endTime", "hardware", "note"].includes(field);
        return false;
    };
    // --- 新增：找出當前應該操作的行索引 ---
    const getActiveRowIndex = (api) => {
      let activeIndex = 0;
      for (let i = 0; i < api.getDisplayedRowCount(); i++) {
        const rowData = api.getDisplayedRowAtIndex(i).data;
        // 如果這一行已經完成 (有 endTime) 或者是被 SKIP 的，就看下一行
        if (rowData.endTime || rowData.status === "SKIPPED") {
          activeIndex = i + 1;
          continue;
        }
        break;
      }
      return activeIndex;
    };

    const baseCols = [
      { 
        headerName: "STATUS", width: 75, pinned: "left",
        valueGetter: p => {
            if (p.data.status === "SKIPPED") return "SKIPPED";
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
        headerName: "CHECK-IN", field: "startTime", width: 115,
        cellRenderer: p => {
          if (p.value) {
            const parts = String(p.value).split('\n');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', width: '100%' }}>
                <span style={{ color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>{parts[0]}</span>
                <span style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 'bold' }}>{parts[1] || ""}</span>
              </div>
            );
          }
          if (p.data.status === "SKIPPED") return null; 
          
          const rowIndex = p.node.rowIndex;
          const prevRow = p.api.getDisplayedRowAtIndex(rowIndex - 1);
          
          // 邏輯：第一行 OR 前一行已完成(endTime) OR 前一行是 SKIPPED
          let canStart = rowIndex === 0 || (prevRow?.data.endTime || prevRow?.data.status === "SKIPPED");
          
          return (
            <button 
              disabled={!canStart}
              className={`op-btn ${canStart ? "start" : "disabled"}`} 
              onClick={() => {
                if (window.confirm("Are you sure you want to START?")) {
                  syncUpdate(activeLot.id, targetStress.id, p.data._rid, { 
                    startTime: getCurrentInfo(),
                    status: "In Progress"
                  });
                }
              }}
            >▶ START</button>
          );
        }
      },
      {
        headerName: "CHECK-OUT", field: "endTime", width: 125,
        cellRenderer: (params) => {
          if (params.value) {
            const parts = String(params.value).split('\n');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2', width: '100%' }}>
                <span style={{ color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>{parts[0]}</span>
                <span style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: 'bold' }}>{parts[1] || ""}</span>
              </div>
            );
          }
          if (params.data.status === "SKIPPED") return null;

          // 只有在已經按了 START (有了 startTime) 且還沒按 FINISH 時才能按
          const canFinish = !!params.data.startTime && !params.data.endTime;
          
          return (
            <button
              disabled={!canFinish}
              className={`op-btn ${canFinish ? "end" : "disabled"}`}
              onClick={() => {
                if (window.confirm("Are you sure you want to FINISH?")) {
                  syncUpdate(activeLot.id, targetStress.id, params.data._rid, { 
                    endTime: getCurrentInfo(),
                    status: "Done"
                  });
                }
              }}
            >■ FINISH</button>
          );
        }
      },
      { headerName: "Hardware", field: "hardware", width: 80, editable: getEditable("hardware"), cellStyle: { background: "#fffbe6" } },
      { headerName: "Note", field: "note", width: 120, editable: getEditable("note"), cellStyle: { background: "#fffbe6" } },
    ];

    if (isAdminOrEngineer) {
      baseCols.push({
        headerName: "SKIP", width: 60,
        cellRenderer: p => {
          const isSkipped = p.data.status === "SKIPPED";
          const hasStarted = !!p.data.startTime && !isSkipped; // 如果已經有開始時間且不是被跳過的，就代表開始做了
          
          // 邏輯：如果已經按了 START，則 SKIP 鈕要禁用
          const disableSkip = hasStarted;

          return (
            <button 
              disabled={disableSkip}
              style={{
                width: "100%", height: "22px", fontSize: "9px", padding: "0",
                background: disableSkip ? "#f1f5f9" : (isSkipped ? "#cbd5e1" : "#fff"),
                border: disableSkip ? "1px dashed #cbd5e1" : "1px solid #000", 
                color: disableSkip ? "#cbd5e1" : (isSkipped ? "#fff" : "#000"),
                cursor: disableSkip ? "not-allowed" : "pointer", 
                fontWeight: "bold"
              }}
              onClick={() => {
                if (isSkipped) {
                  syncUpdate(activeLot.id, targetStress.id, p.data._rid, { startTime: "", endTime: "", status: "Init" });
                } else {
                  if (window.confirm("Skip this step?")) {
                    const skipInfo = getCurrentInfo();
                    syncUpdate(activeLot.id, targetStress.id, p.data._rid, { 
                      startTime: skipInfo, 
                      endTime: skipInfo, 
                      status: "SKIPPED" 
                    });
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
    }
    const stressName = targetStress?.stress || "-";
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
          <InfoBox label="STRESS" value={stressName}   />         
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
                const fieldName = p.column.colId;
                syncUpdate(activeLot.id, targetStress.id, p.data._rid, { [fieldName]: p.newValue });
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
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../../assets/RunCardCreatePage.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = "http://localhost:5001";

export default function RunCardFormPage({ handleFinalSubmit }) {
  // ===============================
  // 1. 狀態與初始值
  const initialHeader = {
    "Product Family": "",
    "Product": "",
    "Product ID": "",
    "Version": "",
    "QR": "",
    "Sample Size": "",
    "Owner": "",
    "Remark": "",
  };

  const [header, setHeader] = useState(initialHeader);
  const [configMaster, setConfigMaster] = useState({ productFamilies: [], products: [] });
  const [stressMeta, setStressMeta] = useState({});
  const [templates, setTemplates] = useState([]); 
  const [showTplList, setShowTplList] = useState(null); // 控制哪個 LOT 的選單打開

  const newRow = () => ({
    _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    stress: "", type: "", operation: "", condition: "",
     programName: "", testProgram: "", testScript: "", note: "",
  });

  const createInitialLot = () => ({
    id: "lot_" + Date.now(),
    lotId: "",
    stresses: [{ id: "str_" + Date.now(), rowData: [newRow()] }],
  });

  const [lots, setLots] = useState([createInitialLot()]);
  const [activeLotId, setActiveLotId] = useState(lots[0].id);

  // ===============================
  // 2. 讀取資料
  // ===============================
  useEffect(() => {
    fetch(`${API_BASE}/api/meta`)
      .then((r) => r.json())
      .then(async (data) => {
        const map = {};
        for (const s of data.stresses || []) {
          const res = await fetch(`${API_BASE}/api/stress/${encodeURIComponent(s)}`);
          const json = await res.json();
          map[s] = json.sheet1_rows || [];
        }
        setStressMeta(map);
      });

    const savedConfig = localStorage.getItem("config_master");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfigMaster({ productFamilies: parsed.productFamilies || [], products: parsed.products || [] });
      } catch (e) { console.error(e); }
    }
    const savedTemplates = JSON.parse(localStorage.getItem("runcard_templates") || "[]");
    setTemplates(savedTemplates);
  }, []);

  // ==================== 3. 操作邏輯 ===============================
  const addLot = () => { const newLot = createInitialLot(); setLots((p) => [...p, newLot]); setActiveLotId(newLot.id); };
  const deleteLot = (lotId) => { if (lots.length === 1) return alert("至少需保留一個 LOT"); const remain = lots.filter((l) => l.id !== lotId); setLots(remain); setActiveLotId(remain[0].id); };
  
  const duplicateLot = (lot) => {
    const id = "lot_" + Date.now();
    const cloned = JSON.parse(JSON.stringify(lot));
    cloned.stresses = cloned.stresses.map((s) => ({
      ...s, id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      rowData: s.rowData.map((r) => ({ ...r, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) })),
    }));
    setLots((p) => [...p, { ...cloned, id, lotId: (lot.lotId || "NewLOT") + "_Copy" }]); setActiveLotId(id);
  };

  const addRow = (lotId, stressId) => { setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: [...s.rowData, newRow()] } : s) } : l)); };
  const deleteRow = (lotId, stressId, rid) => { setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: s.rowData.length > 1 ? s.rowData.filter((r) => r._rid !== rid) : [newRow()] } : s) } : l)); };
  const duplicateRow = (lotId, stressId, row) => {
    const clonedRow = { ...row, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) };
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: [...s.rowData, clonedRow] } : s) } : l));
  };
  const updateRowFields = useCallback((lotId, stressId, rid, patch) => { setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: s.rowData.map((r) => r._rid === rid ? { ...r, ...patch } : r) } : s) } : l)); }, []);

  const onRowDragEnd = (event, lotId, stressId) => {
    const newOrder = [];
    event.api.forEachNode((node) => newOrder.push(node.data));
    setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: newOrder } : s) } : l));
  };

  // --- Template 相關邏輯 ---
  const saveAsTemplate = (lot) => {
    const name = window.prompt("Please enter the template name:"); if (!name) return;
    const newT = { name, stresses: lot.stresses.map(s => ({ rowData: s.rowData.map(({ _rid, ...p }) => p) })) };
    const updated = [...templates, newT]; setTemplates(updated); localStorage.setItem("runcard_templates", JSON.stringify(updated)); alert("✅ Template saved!");
  };
  const applyTemplate = (lotId, template) => {
    setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: template.stresses.map(s => ({ id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2), rowData: s.rowData.map(r => ({ ...r, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) })) })) } : l));
    setShowTplList(null);
  };
  const deleteTemplateAction = (idx) => {
    if (window.confirm(`Are you sure you want to delete "${templates[idx].name}"?`)) {
        const updated = templates.filter((_, i) => i !== idx);
        setTemplates(updated);
        localStorage.setItem("runcard_templates", JSON.stringify(updated));
    }
  };

  // 4. =================== 防呆儲存 ==============================
  const handleSave = () => {
    const requiredFields = ["Product Family", "Product", "Product ID", "Version", "QR", "Sample Size", "Owner"];
    for (let field of requiredFields) {
      if (!header[field]) return alert(`⚠️ Please fill in ${field}`);
    }
    const isConfirmed = window.confirm(`Are you sure you want to create project: ${header["Product ID"]}?`);
    if (!isConfirmed) return;
    const newProject = { id: "proj_" + Date.now(), header, lots, createdAt: new Date().toLocaleString(), status: "Init" };
    const existing = JSON.parse(localStorage.getItem("all_projects") || "[]");
    localStorage.setItem("all_projects", JSON.stringify([...existing, newProject]));
    if (handleFinalSubmit) handleFinalSubmit(newProject);
    alert(`✅ Project: ${header["Product ID"]} saved!`);
    setHeader(initialHeader);
    const resetLot = createInitialLot();
    setLots([resetLot]); setActiveLotId(resetLot.id);
  };

  // 5. AG Grid Columns (加入 Hover 效果按鈕與拖曳圖示)
  const columnDefs = useMemo(() => [
    { 
      headerName: "Stress", field: "stress", width: 140, rowDrag: true, 
      cellRenderer: (p) => (
        <select className="grid-select" value={p.value || ""} onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { stress: e.target.value, type: "", operation: "", condition: "" })}>
          <option value="">-- Stress --</option>
          {Object.keys(stressMeta).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { headerName: "Type", field: "type", width: 120, cellRenderer: (p) => { const rows = stressMeta[p.data.stress] || []; const types = [...new Set(rows.map((r) => r.Type).filter(Boolean))]; return ( <select className="grid-select" value={p.value || ""} disabled={!p.data.stress} onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { type: e.target.value, operation: "", condition: "" })}> <option value="">-- Type --</option> {types.map((t) => <option key={t} value={t}>{t}</option>)} </select> ); }, },
    { headerName: "Operation", field: "operation", width: 140, cellRenderer: (p) => { const rows = stressMeta[p.data.stress] || []; const ops = rows.filter((r) => r.Type === p.data.type).map((r) => r.Operation).filter(Boolean); return ( <select className="grid-select" value={p.value || ""} disabled={!p.data.type} onChange={(e) => { const match = rows.find((r) => r.Type === p.data.type && r.Operation === e.target.value); updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { operation: e.target.value, condition: match?.Condition || "" }); }}> <option value="">-- Operation --</option> {ops.map((o) => <option key={o} value={o}>{o}</option>)} </select> ); }, },
    { headerName: "Condition", field: "condition", editable: true, width: 120 },
    { headerName: "Program Name", field: "programName", editable: true, width: 130 },
    { headerName: "Test Program", field: "testProgram", editable: true, width: 120 },
    { headerName: "Test Script", field: "testScript", editable: true, width: 110 },
    { headerName: "Note", field: "note", editable: true, width: 150 },
    { headerName: "", width: 80, pinned: "right", cellRenderer: (p) => ( 
      <div className="d-flex gap-2 justify-content-center align-items-center h-100"> 
        <button className="grid-icon-btn copy-btn" title="Copy" onClick={() => duplicateRow(p.context.lotId, p.context.stressId, p.data)}>📋</button> 
        <button className="grid-icon-btn delete-btn" title="Delete" onClick={() => deleteRow(p.context.lotId, p.context.stressId, p.data._rid)}>🗑️</button> 
      </div> 
    ), },
  ], [stressMeta, updateRowFields]);

  return (
    <div className="form-page-container" style={{ padding: "0px", width: "100%" }}>
      {/* 頂部資料區 */}
      <div className="prof-card" style={{ padding: "8px 12px", marginBottom: "2px", borderRadius: "0", marginTop: "0", boxShadow: "none", border: "1px solid #e0e0e0" }}>
        <div className="header-grid" style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px" }}>
          {Object.keys(header).map((k) => (
            <div className="header-item" key={k} style={{ display: "flex", flexDirection: "column" }}>
              <label className="bold-label" style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>{k.toUpperCase()}</label>
              {k === "Product Family" ? (
                <select className="form-select-custom" value={header[k]} onChange={(e) => setHeader({ ...header, [k]: e.target.value, Product: "", Version: "" })}>
                  <option value="">-- Select --</option>
                  {configMaster.productFamilies.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              ) : k === "Product" ? (
                <select className="form-select-custom" value={header[k]} disabled={!header["Product Family"]} onChange={(e) => {
                  const selectedProd = configMaster.products.find(p => p.productName === e.target.value);
                  setHeader({ ...header, Product: e.target.value, Version: selectedProd?.version || "" });
                }}>
                  <option value="">-- Select --</option>
                  {configMaster.products.filter((p) => p.familyId === header["Product Family"]).map((p) => <option key={p.id} value={p.productName}>{p.productName}</option>)}
                </select>
              ) : (
                <input className="form-input-custom" value={header[k]} onChange={(e) => setHeader({ ...header, [k]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* LOT Tabs */}
      <div className="lot-tabs-container" style={{ margin: "0", padding: "0", gap: "2px", display: "flex", alignItems: "flex-end" }}>
        {lots.map((lot) => (
          <div key={lot.id} className={`lot-tab-wrapper ${activeLotId === lot.id ? "active" : ""}`} onClick={() => setActiveLotId(lot.id)} style={{ padding: "4px 15px", borderBottom: activeLotId === lot.id ? "2px solid #007bff" : "none" }}>
            <span style={{ fontSize: "12px", fontWeight: activeLotId === lot.id ? "bold" : "normal" }}>{lot.lotId || "New LOT"}</span>
            <button className="lot-tab-close" onClick={(e) => { e.stopPropagation(); deleteLot(lot.id); }}>×</button>
          </div>
        ))}
        <button onClick={addLot} style={{ border: "none", background: "none", color: "#007bff", fontSize: "18px", padding: "0 10px", cursor: "pointer" }}>+</button>
      </div>

      {/* LOT Content */}
      {lots.map((lot) => activeLotId === lot.id && (
        <div key={lot.id} className="prof-card" style={{ padding: "8px", borderRadius: "0", border: "1px solid #e0e0e0", borderLeft: "none", borderRight: "none", marginTop: "-1px" }}>
          <div className="lot-header d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>LOT ID:</span>
              <input className="lot-id-input" style={{ width: "160px", height: "26px" }} value={lot.lotId} onChange={(e) => setLots((p) => p.map((l) => l.id === lot.id ? { ...l, lotId: e.target.value } : l))} />
              <button className="btn-copy-outline" style={{ padding: "1px 8px", fontSize: "11px" }} onClick={() => duplicateLot(lot)}>❐ Copy LOT</button>
            </div>
            
            {/* 改良版的模板選擇器 (帶有選項刪除按鈕) */}
            <div className="d-flex align-items-center gap-2" style={{ position: "relative" }}>
              <div className="custom-tpl-dropdown">
                <button className="tpl-dropdown-trigger" onClick={() => setShowTplList(showTplList === lot.id ? null : lot.id)}>
                  📋 Apply Template... <span style={{ fontSize: "10px", marginLeft: "5px" }}>▼</span>
                </button>
                {showTplList === lot.id && (
                  <div className="tpl-dropdown-menu">
                    {templates.length === 0 && <div className="tpl-no-data">No templates saved</div>}
                    {templates.map((t, idx) => (
                      <div key={idx} className="tpl-option-item">
                        <span className="tpl-name" onClick={() => applyTemplate(lot.id, t)}>{t.name}</span>
                        <button className="tpl-del-btn" onClick={(e) => { e.stopPropagation(); deleteTemplateAction(idx); }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => saveAsTemplate(lot)} style={{ padding: "2px 10px", border: "1px solid #ffc107", background: "#fff9e6", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>⭐ Save Template</button>
            </div>
          </div>

          {lot.stresses.map((s) => (
            <div key={s.id} className="stress-box" style={{ padding: "0px", marginBottom: "4px" }}>
              <div className="ag-theme-alpine custom-excel-grid">
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  headerHeight={26}  
                  rowHeight={26}
                  domLayout="autoHeight"
                  rowDragManaged={true}
                  animateRows={true}
                  context={{ lotId: lot.id, stressId: s.id }}
                  onRowDragEnd={(e) => onRowDragEnd(e, lot.id, s.id)}
                  getRowId={(p) => p.data?._rid}
                  defaultColDef={{ resizable: true, sortable: true, singleClickEdit: true }}
                />
              </div>
              <button className="btn-add-step" style={{ marginTop: "4px", fontSize: "11px" }} onClick={() => addRow(lot.id, s.id)}>+ Add Step</button>
            </div>
          ))}
        </div>
      ))}

      <div className="form-actions-bar text-end" style={{ padding: "10px", borderTop: "1px solid #eee" }}>
        <button className="btn-success-lg" style={{ padding: "5px 30px" }} onClick={handleSave}>Save Project</button>
      </div>

      <style>{`
        .form-select-custom, .form-input-custom { width: 100%; height: 28px; padding: 0 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
        .grid-select { width: 100%; height: 100%; border: none; background: transparent; cursor: pointer; }
        .ag-theme-alpine .ag-row:hover { background-color: #f0f7ff !important; }
        
        /* 1. 表格內按鈕 📋 與 🗑️ 放大效果 */
        .grid-icon-btn { 
          background: none; border: none; cursor: pointer; font-size: 16px; 
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.1s; 
          display: flex; align-items: center; justify-content: center;
        }
        .grid-icon-btn:hover { 
          transform: scale(1.3) translateY(-1px); 
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .delete-btn:hover { color: #dc3545; }
        .copy-btn:hover { color: #007bff; }

        /* 2. 自定義模板下拉選單與刪除按鈕 */
        .custom-tpl-dropdown { position: relative; width: 141px; }
        .tpl-dropdown-trigger { 
          width: 100%; height: 20px; border: 1px solid #ccc; background: #fff; 
          text-align: left; padding: 0 8px; font-size: 11px; border-radius: 4px; cursor: pointer;
        }
        .tpl-dropdown-menu { 
          position: absolute; top: 28px; left: 0; width: 141px; background: #fff; 
          border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 4px; z-index: 1000;
        }
        .tpl-option-item { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 6px 10px; border-bottom: 1px solid #f0f0f0; 
        }
        .tpl-option-item:hover { background: #f8f9fa; }
        .tpl-name { flex-grow: 1; cursor: pointer; font-size: 12px; color: #333; }
        .tpl-del-btn { 
          background: none; border: none; color: #bbb; cursor: pointer; font-size: 13px; 
          padding: 2px 5px; transition: all 0.2s;
        }
        .tpl-del-btn:hover { color: #dc3545; transform: scale(1.2); }
        .tpl-no-data { padding: 10px; font-size: 11px; color: #999; text-align: center; }

        /* 3. 拖曳圖示修正 */
        .ag-theme-alpine .ag-row-drag { margin-right: 8px; color: #999; }
        .ag-theme-alpine { --ag-grid-size: 3px; --ag-font-size: 12px; }
        
      `}</style>
    </div>
  );
}
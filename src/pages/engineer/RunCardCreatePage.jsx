import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  // 1. 初始值與基本資料狀態
  // ===============================
  const initialHeader = {
    "Project Family": "",
    "Product": "",
    "Product ID": "",
    "Version": "",
    "QR": "",
    "Owner": "",
    "Remark": "",
  };

  const [header, setHeader] = useState(initialHeader);

  const [configMaster, setConfigMaster] = useState({
    productFamilies: [],
    products: [],
  });

  const [stressMeta, setStressMeta] = useState({});
  const [templates, setTemplates] = useState([]); // 存放常用範本

  const newRow = () => ({
    _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    stress: "",
    type: "",
    operation: "",
    condition: "",
    sampleSize: "",
    programName: "",
    testProgram: "",
    testScript: "",
    note: "",
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
        setConfigMaster({
          productFamilies: parsed.productFamilies || [],
          products: parsed.products || [],
        });
      } catch (e) { console.error(e); }
    }

    // 讀取本地快取範本
    const savedTemplates = JSON.parse(localStorage.getItem("runcard_templates") || "[]");
    setTemplates(savedTemplates);
  }, []);

  // ===============================
  // 3. 操作邏輯
  // ===============================
  const addLot = () => {
    const newLot = createInitialLot();
    setLots((p) => [...p, newLot]);
    setActiveLotId(newLot.id);
  };

  const deleteLot = (lotId) => {
    if (lots.length === 1) return alert("至少需保留一個 LOT");
    const remain = lots.filter((l) => l.id !== lotId);
    setLots(remain);
    setActiveLotId(remain[0].id);
  };

  const duplicateLot = (lot) => {
    const id = "lot_" + Date.now();
    const cloned = JSON.parse(JSON.stringify(lot));
    cloned.stresses = cloned.stresses.map((s) => ({
      ...s,
      id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      rowData: s.rowData.map((r) => ({ ...r, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) })),
    }));
    setLots((p) => [...p, { ...cloned, id, lotId: (lot.lotId || "NewLOT") + "_Copy" }]);
    setActiveLotId(id);
  };

  const addRow = (lotId, stressId) => {
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: [...s.rowData, newRow()] } : s) } : l));
  };

  const deleteRow = (lotId, stressId, rid) => {
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: s.rowData.length > 1 ? s.rowData.filter((r) => r._rid !== rid) : [newRow()] } : s) } : l));
  };

  const duplicateRow = (lotId, stressId, row) => {
    const clonedRow = { ...row, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) };
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: [...s.rowData, clonedRow] } : s) } : l));
  };

  const updateRowFields = useCallback((lotId, stressId, rid, patch) => {
    setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: s.rowData.map((r) => r._rid === rid ? { ...r, ...patch } : r) } : s) } : l));
  }, []);

  // --- 範本相關功能 ---
  const saveAsTemplate = (lot) => {
    const templateName = window.prompt("請輸入常用範本名稱 (例如: HTOL標準流程):");
    if (!templateName) return;

    const newTemplate = {
      name: templateName,
      stresses: lot.stresses.map(s => ({
        rowData: s.rowData.map(r => {
          const { _rid, ...pureData } = r; // 移除內部ID以利重新生成
          return pureData;
        })
      }))
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem("runcard_templates", JSON.stringify(updated));
    alert(`範本 "${templateName}" 已儲存！`);
  };

  const applyTemplate = (lotId, templateIndex) => {
    if (templateIndex === "") return;
    const template = templates[templateIndex];
    if (!template) return;

    setLots((prev) => prev.map((l) => {
      if (l.id === lotId) {
        return {
          ...l,
          stresses: template.stresses.map(s => ({
            id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2),
            rowData: s.rowData.map(r => ({ ...r, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) }))
          }))
        };
      }
      return l;
    }));
  };

  const handleSave = () => {
    if (!header["Product ID"]) return alert("Please fill in Product ID");

    const isConfirmed = window.confirm(`Are you sure you want to create the project？`);
    if (!isConfirmed) return;

    const newProject = { 
      id: "proj_" + Date.now(), 
      header, 
      lots, 
      createdAt: new Date().toLocaleString(), 
      status: "Init" 
    };

    const existingProjects = JSON.parse(localStorage.getItem("all_projects") || "[]");
    localStorage.setItem("all_projects", JSON.stringify([...existingProjects, newProject]));

    if (handleFinalSubmit) {
      handleFinalSubmit(newProject);
    }

    alert(`Project: ${header["Product ID"]} has been saved successfully！`);

    setHeader(initialHeader);
    const resetLot = createInitialLot();
    setLots([resetLot]);
    setActiveLotId(resetLot.id);
  };

  // ===============================
  // 4. AG Grid Columns
  // ===============================
  const columnDefs = useMemo(() => [
    {
      headerName: "Stress",
      field: "stress",
      width: 140,
      rowDrag: true,
      cellRenderer: (p) => (
        <select className="grid-select" value={p.value || ""} onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { stress: e.target.value, type: "", operation: "", condition: "" })}>
          <option value="">-- Stress --</option>
          {Object.keys(stressMeta).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      headerName: "Type",
      field: "type",
      width: 120,
      cellRenderer: (p) => {
        const rows = stressMeta[p.data.stress] || [];
        const types = [...new Set(rows.map((r) => r.Type).filter(Boolean))];
        return (
          <select className="grid-select" value={p.value || ""} disabled={!p.data.stress} onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { type: e.target.value, operation: "", condition: "" })}>
            <option value="">-- Type --</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        );
      },
    },
    {
      headerName: "Operation",
      field: "operation",
      width: 140,
      cellRenderer: (p) => {
        const rows = stressMeta[p.data.stress] || [];
        const ops = rows.filter((r) => r.Type === p.data.type).map((r) => r.Operation).filter(Boolean);
        return (
          <select className="grid-select" value={p.value || ""} disabled={!p.data.type} onChange={(e) => {
            const match = rows.find((r) => r.Type === p.data.type && r.Operation === e.target.value);
            updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { operation: e.target.value, condition: match?.Condition || "" });
          }}>
            <option value="">-- Operation --</option>
            {ops.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      },
    },
    { headerName: "Condition", field: "condition", editable: true, width: 120 },
    { headerName: "Sample Size", field: "sampleSize", editable: true, width: 100 },
    { headerName: "Program Name", field: "programName", editable: true, width: 120 },
    { headerName: "Test Program.", field: "testProgram", editable: true, width: 120 },
    { headerName: "Test Script.", field: "testScript", editable: true, width: 120 },
    { headerName: "Note", field: "note", editable: true, width: 150 },
    {
      headerName: "",
      width: 75,
      pinned: "right",
      cellRenderer: (p) => (
        <div className="d-flex gap-3 justify-content-center align-items-center h-100">
          <button 
            className="btn-icon-only text-primary" 
            title="Copy" 
            onClick={() => duplicateRow(p.context.lotId, p.context.stressId, p.data)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '16px' }}
          >
            📋
          </button>
          <button 
            className="btn-icon-only text-danger" 
            title="Delete" 
            onClick={() => deleteRow(p.context.lotId, p.context.stressId, p.data._rid)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '16px' }}
          >
            🗑️
          </button>
        </div>
      ),
    },
  ], [stressMeta, updateRowFields]);

  // ===============================
  // 5. Render
  // ===============================
  return (
    <div className="form-page-container">
      <div className="prof-card">
        <div className="header-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px" }}>
          {Object.keys(header).map((k) => (
            <div className="header-item" key={k} style={{ display: "flex", flexDirection: "column" }}>
              <label className="bold-label" style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>{k.toUpperCase()}</label>
              {k === "Project Family" ? (
                <select className="form-select-custom" value={header[k]} onChange={(e) => setHeader({ ...header, "Project Family": e.target.value, Product: "", Version: "" })}>
                  <option value="">-- Select --</option>
                  {configMaster.productFamilies.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              ) : k === "Product" ? (
                <select className="form-select-custom" value={header[k]} disabled={!header["Project Family"]} onChange={(e) => {
                  const selectedProd = configMaster.products.find(p => p.productName === e.target.value);
                  setHeader({ ...header, Product: e.target.value, Version: selectedProd?.version || "" });
                }}>
                  <option value="">-- Select --</option>
                  {configMaster.products.filter((p) => p.familyId === header["Project Family"]).map((p) => <option key={p.id} value={p.productName}>{p.productName}</option>)}
                </select>
              ) : (
                <input className="form-input-custom" value={header[k]} onChange={(e) => setHeader({ ...header, [k]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lot-tabs-container">
        {lots.map((lot) => (
          <div key={lot.id} className={`lot-tab-wrapper ${activeLotId === lot.id ? "active" : ""}`} onClick={() => setActiveLotId(lot.id)}>
            <span className="lot-tab-title">{lot.lotId || "New LOT"}</span>
            <button className="lot-tab-close" onClick={(e) => { e.stopPropagation(); deleteLot(lot.id); }}>×</button>
          </div>
        ))}
        <button className="lot-tab-add" onClick={addLot}>+ LOT</button>
      </div>

      {lots.map((lot) => activeLotId === lot.id && (
        <div key={lot.id} className="prof-card">
          <div className="lot-header d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <span className="bold-label">LOT ID :</span>
              <input className="lot-id-input" style={{ width: "200px" }} value={lot.lotId} onChange={(e) => setLots((p) => p.map((l) => l.id === lot.id ? { ...l, lotId: e.target.value } : l))} />
              <button className="btn-copy-outline" onClick={() => duplicateLot(lot)}>❐ Copy LOT</button>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <select className="form-select-custom" style={{ width: "180px", height: "32px", fontSize: "12px" }} onChange={(e) => applyTemplate(lot.id, e.target.value)} defaultValue="">
                <option value="" disabled>📋 Apply Template...</option>
                {templates.map((t, idx) => <option key={idx} value={idx}>{t.name}</option>)}
              </select>
              <button className="btn-save-template" onClick={() => saveAsTemplate(lot)} style={{ padding: "4px 12px", borderRadius: "6px", border: "1px solid #ffc107", background: "#fff9e6", color: "#856404", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
                ⭐ Save as Template
              </button>
            </div>
          </div>

          {lot.stresses.map((s) => (
            <div key={s.id} className="stress-box">
              <div className="ag-theme-alpine custom-excel-grid">
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  defaultColDef={{ resizable: true, sortable: true, singleClickEdit: true }}
                  getRowId={(p) => p.data?._rid}
                  domLayout="autoHeight"
                  rowDragManaged={true}
                  animateRows={true}
                  context={{ lotId: lot.id, stressId: s.id }}
                  stopEditingWhenCellsLoseFocus={true}
                  onCellValueChanged={(params) => {
                    updateRowFields(params.context.lotId, params.context.stressId, params.data._rid, params.data);
                  }}
                />
              </div>
              <button className="btn-add-step mt-2" onClick={() => addRow(lot.id, s.id)}>+ Add Step</button>
            </div>
          ))}
        </div>
      ))}

      <div className="form-actions-bar text-end">
        <button className="btn-success-lg px-5 shadow" onClick={handleSave}>Save Project</button>
      </div>

      <style>{`
        .form-select-custom, .form-input-custom {padding: 6px 10px;border: 1px solid #ddd;border-radius: 6px;font-size: 14px;outline: none;transition: border 0.2s;height: 38px;}
        .form-select-custom:focus, .form-input-custom:focus {border-color: #007bff;box-shadow: 0 0 0 2px rgba(0,123,255,0.1);}
        
        .btn-icon-only {opacity: 0.7;transition: transform 0.1s, opacity 0.2s;}
        .btn-icon-only:hover {opacity: 1;transform: scale(1.2);}
        .btn-save-template:hover {background: #ffc107 !important;color: white !important;}
      `}</style>
    </div>
  );
}
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../../assets/RunCardCreatePage.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = "http://localhost:5001";

export default function RunCardFormPage() {
  // 1. 基本資料狀態
  const [header, setHeader] = useState({
    "Product": "",
    "Project Family": "",
    "Product ID": "",
    "Version": "",
    "QR": "",
    "Owner": "",
    "Remark": "",
  });

  const [stressMeta, setStressMeta] = useState({});

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

  const [lots, setLots] = useState([
    {
      id: "lot_" + Date.now(),
      lotId: "",
      stresses: [{ id: "str_" + Date.now(), rowData: [newRow()] }],
    },
  ]);

  const [activeLotId, setActiveLotId] = useState(lots[0].id);

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
  }, []);

  // --- 邏輯處理函式 ---
  const addLot = () => {
    const id = "lot_" + Date.now();
    setLots((p) => [...p, { id, lotId: "", stresses: [{ id: "str_" + Date.now(), rowData: [newRow()] }] }]);
    setActiveLotId(id);
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
    cloned.stresses = (cloned.stresses || []).map((s) => ({
      ...s,
      id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      rowData: (s.rowData || []).map((r) => ({
        ...r,
        _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      })),
    }));
    setLots((p) => [...p, { ...cloned, id, lotId: (lot.lotId || "NewLOT") + "_Copy" }]);
    setActiveLotId(id);
  };

  const addRow = (lotId, stressId) => {
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: [...(s.rowData || []), newRow()] } : s) } : l));
  };

  const deleteRow = (lotId, stressId, rid) => {
    setLots((p) => p.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: (s.rowData || []).length > 1 ? (s.rowData || []).filter((r) => r._rid !== rid) : [newRow()] } : s) } : l));
  };

  const duplicateRow = (lotId, stressId, row) => {
    const clonedRow = {
      ...row,
      _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    };
    setLots((p) => p.map((l) => l.id === lotId ? { 
      ...l, 
      stresses: l.stresses.map((s) => s.id === stressId ? { 
        ...s, 
        rowData: [...s.rowData, clonedRow] 
      } : s) 
    } : l));
  };

  const updateRowFields = useCallback((lotId, stressId, rid, patch) => {
    setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: l.stresses.map((s) => s.id === stressId ? { ...s, rowData: (s.rowData || []).map((r) => r._rid === rid ? { ...r, ...patch } : r) } : s) } : l));
  }, []);

  const handleSave = () => {
    if (!header["Product ID"]) return alert("請填寫 Product ID");
    const newProject = {
      id: "proj_" + Date.now(),
      header: header,
      lots: lots,
      createdAt: new Date().toLocaleString(),
      status: "Init"
    };
    const existingProjects = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const updatedProjects = [...existingProjects, newProject];
    localStorage.setItem("all_projects", JSON.stringify(updatedProjects));
    alert(`專案 ${header["Product ID"]} 已儲存至本地！`);
  };

  const handleCellValueChanged = useCallback((params) => {
    const { lotId, stressId } = params.context || {};
    const rid = params.data?._rid;
    if (lotId && stressId && rid && params.colDef?.field) {
      updateRowFields(lotId, stressId, rid, { [params.colDef.field]: params.newValue });
    }
  }, [updateRowFields]);

  const columnDefs = useMemo(() => [
    {
      headerName: "Stress",
      field: "stress",
      width: 140,
      rowDrag: true, // 保留第一個欄位觸發拖拽
      cellRenderer: (p) => (
        <select 
          className="grid-select" 
          value={p.value || ""} 
          onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { stress: e.target.value, type: "", operation: "", condition: "" })}
        >
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
          <select 
            className="grid-select" 
            value={p.value || ""} 
            disabled={!p.data.stress} 
            onChange={(e) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { type: e.target.value, operation: "", condition: "" })}
          >
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
          <select 
            className="grid-select" 
            value={p.value || ""} 
            disabled={!p.data.type} 
            onChange={(e) => {
              const match = rows.find(r => r.Type === p.data.type && r.Operation === e.target.value);
              updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { operation: e.target.value, condition: match?.Condition || "" });
            }}
          >
            <option value="">-- Operation --</option>
            {ops.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      },
    },
    { headerName: "Condition", field: "condition", editable: true, width: 120 },
    { headerName: "Sample Size", field: "sampleSize", editable: true, width: 100 },
    { headerName: "Program", field: "programName", editable: true, width: 120 },
    { headerName: "Test Pro.", field: "testProgram", editable: true, width: 120 },
    { headerName: "Test Scp.", field: "testScript", editable: true, width: 120 },
    { headerName: "Note", field: "note", editable: true, width: 150 },
    {
      headerName: "",
      width: 65,
      pinned: "right",
      cellStyle: { textAlign: "center" },
      cellRenderer: (p) => (
        <div style={{ display: "flex", gap: "5px", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <button 
            title="複製此行"
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "16px" }}
            onClick={() => duplicateRow(p.context.lotId, p.context.stressId, p.data)}
          >
            📋
          </button>
          <button 
            title="刪除此行"
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: "#ef4444" }}
            onClick={() => deleteRow(p.context.lotId, p.context.stressId, p.data?._rid)}
          >
            🗑️
          </button>
        </div>
      ),
    },
  ], [stressMeta, updateRowFields]);

  return (
    <div className="form-page-container">
      <div className="prof-card">
        <div className="header-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px" }}>
          {Object.keys(header).map((k) => (
            <div className="header-item" key={k}>
              <label className="bold-label">{k}</label>
              <input value={header[k]} onChange={(e) => setHeader({ ...header, [k]: e.target.value })} />
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
          <div className="lot-header">
            <span className="bold-label">LOT ID :</span>
            <input className="lot-id-input" value={lot.lotId} onChange={(e) => setLots((p) => p.map((l) => l.id === lot.id ? { ...l, lotId: e.target.value } : l))} />
            <button className="btn-copy-outline" onClick={() => duplicateLot(lot)}>☐ Copy LOT</button>
          </div>
          {lot.stresses.map((s) => (
            <div key={s.id} className="stress-box">
              <div className="ag-theme-alpine custom-excel-grid">
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  defaultColDef={{ resizable: true, sortable: true, singleClickEdit: true }}
                  onCellValueChanged={handleCellValueChanged}
                  getRowId={(p) => p.data?._rid}
                  domLayout="autoHeight"
                  rowDragManaged={true}
                  rowDragEntireRow={true} // 允許整列拖拽
                  animateRows={true}
                  context={{ lotId: lot.id, stressId: s.id }}
                  stopEditingWhenCellsLoseFocus={true}
                />
              </div>
              <button className="btn-add-step" onClick={() => addRow(lot.id, s.id)}>+ Add Step</button>
            </div>
          ))}
        </div>
      ))}

      <div className="form-actions-bar">
        <button className="btn-success-lg" onClick={handleSave}>Save Project</button>
      </div>
    </div>
  );
}
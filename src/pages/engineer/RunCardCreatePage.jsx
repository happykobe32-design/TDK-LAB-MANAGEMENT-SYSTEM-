import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom"; // 加入這行
import ReactDOM from "react-dom";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../../pages/engineer/RunCardCreatePage.css";
// 在檔案頂部引入
import { Copy, Trash2, FastForward, RotateCcw, Bookmark, Star} from "lucide-react";
ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = "http://localhost:5001";

// --- REMARK 彈窗編輯組件 ---
const RemarkModal = ({ isOpen, value, onSave, onClose }) => {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (isOpen) setTempValue(value);
  }, [isOpen, value]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10001
    }}>
      <div style={{
        background: "#fff", padding: "20px", borderRadius: "8px", width: "500px", boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
      }}>
        <h4 style={{ marginBottom: "15px", fontSize: "16px", fontWeight: "bold" }}>Edit Remark</h4>
        <textarea
          style={{ width: "100%", height: "200px", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px", outline: "none", resize: "none", lineHeight: "1.5" }}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          placeholder="Enter detailed remarks here..."
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
          <button onClick={onClose} style={{ padding: "6px 15px", border: "1px solid #ccc", background: "#eee", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(tempValue)} style={{ padding: "6px 15px", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 使用 React Portal 解決選單遮擋問題 ---
const EditableDropdown = ({ value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);

  // 1. 核心邏輯：計算並更新位置
  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        // 使用 getBoundingClientRect 配合 window.scrollY 確保絕對定位精準
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160)
      });
    }
  }, []);

  // 2. 監聽滾動與點擊
  useEffect(() => {
    const handleScrollAndResize = () => {
      if (isOpen) {
        updatePosition(); // 滾動時實時更新選單位置
      }
    };

    const handleClickOutside = (e) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target) && 
        !e.target.closest(".portal-dropdown-panel")
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // 監聽全域滾動，使用 capture: true 捕捉 AG Grid 內部的滾動
      window.addEventListener("scroll", handleScrollAndResize, true);
      window.addEventListener("resize", handleScrollAndResize);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("scroll", handleScrollAndResize, true);
      window.removeEventListener("resize", handleScrollAndResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="editable-dropdown-container" style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", position: "relative" }}>
      <textarea
        className="grid-cell-input"
        style={{ flexGrow: 1, border: "none", background: "transparent", width: "calc(100% - 20px)", padding: "4px 8px", fontSize: "12px", outline: "none", resize: "none", overflow: "hidden", minHeight: "26px" }}
        value={value || ""}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
      />
      
      {!disabled && (
        <div 
          className="dropdown-trigger-btn" 
          onClick={toggleDropdown}
          style={{ width: "20px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderLeft: "1px solid #eee", color: "#888", fontSize: "10px" }}
        >
          ▼
        </div>
      )}

      {isOpen && ReactDOM.createPortal(
        <div 
          className="portal-dropdown-panel"
          style={{ 
            position: "absolute", 
            top: coords.top, 
            left: coords.left, 
            width: coords.width,
            background: "#fff", 
            border: "1px solid #ccc", 
            zIndex: 100000, 
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
            borderRadius: "2px",
            maxHeight: "200px",
            overflowY: "auto",
            pointerEvents: "auto" // 確保可以點擊
          }}
        >
          {options.map((opt) => (
            <div 
              key={opt} 
              className="dropdown-opt-item" 
              onClick={() => { 
                onChange(opt); 
                setIsOpen(false); 
              }}
              style={{ padding: "8px 10px", cursor: "pointer", fontSize: "12px", borderBottom: "1px solid #f9f9f9" }}
            >
              {opt}
            </div>
          ))}
          {options.length === 0 && <div style={{ padding: "8px", fontSize: "11px", color: "#999" }}>No option</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

export default function RunCardFormPage({ handleFinalSubmit }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const pIdx = queryParams.get("pIdx"); // 獲取網址上的索引

  // 全域欄位寬度記憶
  const colStateRef = useRef(null);

  // 1. 狀態與初始值
  const initialHeader = {
    "Product Family": "", "Product": "", "Product ID": "", "Version": "",
    "QR": "", "Sample Size": "", "Owner": "", "Remark": "",
  };

  const [header, setHeader] = useState(initialHeader);
  const [configMaster, setConfigMaster] = useState({ productFamilies: [], products: [] });
  const [stressMeta, setStressMeta] = useState({});
  const [templates, setTemplates] = useState([]); 
  const [showTplList, setShowTplList] = useState(null);
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);

  const newRow = () => ({
    _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    stress: "", type: "", operation: "", condition: "",
    programName: "", testProgram: "", testScript: "",
  });

  const createInitialLot = () => ({
    id: "lot_" + Date.now(),
    lotId: "",
    stresses: [{ id: "str_" + Date.now(), rowData: [newRow()] }],
  });

  const [lots, setLots] = useState([createInitialLot()]);
  const [activeLotId, setActiveLotId] = useState(lots[0].id);

  // 2. 讀取資料
  useEffect(() => {
    // 獲取 Meta 資料
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

    // --- 新增：編輯模式載入舊資料 ---
    if (pIdx !== null) {
      const allProjects = JSON.parse(localStorage.getItem("all_projects") || "[]");
      const target = allProjects[parseInt(pIdx)];
      if (target) {
        setHeader(target.header);
        setLots(target.lots);
        if (target.lots && target.lots.length > 0) {
          setActiveLotId(target.lots[0].id);
        }
      }
    }
  }, [pIdx]); // 監聽 pIdx 確保重載

  // 3. 操作邏輯
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

  const saveAsTemplate = (lot) => {
    const name = window.prompt("Please enter the template name:"); if (!name) return;
    const newT = { name, stresses: lot.stresses.map(s => ({ rowData: s.rowData.map(({ _rid, ...p }) => p) })) };
    const updated = [...templates, newT]; setTemplates(updated); localStorage.setItem("runcard_templates", JSON.stringify(updated)); alert("✅ Template saved!");
  };

  const applyTemplate = (lotId, template) => {
    setLots((prev) => prev.map((l) => l.id === lotId ? { ...l, stresses: template.stresses.map(s => ({ 
      id: "str_" + Date.now() + "_" + Math.random().toString(16).slice(2), 
      rowData: s.rowData.map(r => ({ ...r, _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2) })) 
    })) } : l));
    setShowTplList(null);
  };

  const deleteTemplateAction = (idx) => {
    if (window.confirm(`Are you sure you want to delete "${templates[idx].name}"?`)) {
        const updated = templates.filter((_, i) => i !== idx);
        setTemplates(updated);
        localStorage.setItem("runcard_templates", JSON.stringify(updated));
    }
  };

  // 寬度記憶邏輯
  const onColumnResized = (params) => {
    if (params.source === 'uiColumnDragged' && params.finished) {
      colStateRef.current = params.api.getColumnState();
    }
  };

  const onGridReady = (params) => {
    if (colStateRef.current) {
      params.api.applyColumnState({ state: colStateRef.current, applyOrder: true });
    }
  };

  // 4. 修改後的儲存邏輯 (直接覆蓋你原本的 handleSave)
  const handleSave = () => {
    const requiredFields = ["Product Family", "Product", "Product ID", "Version", "QR", "Sample Size", "Owner"];
    for (let field of requiredFields) {
      if (!header[field]) return alert(`⚠️ Please fill in ${field}`);
    }

    const isEditMode = pIdx !== null;
    const confirmMsg = isEditMode 
      ? `Are you sure you want to update your Project: ${header["Product ID"]}?` 
      : `Are you sure you want to CREATE project: ${header["Product ID"]}?`;

    if (!window.confirm(confirmMsg)) return;

    const allProjects = JSON.parse(localStorage.getItem("all_projects") || "[]");
    
    // 準備要存入的物件
    const projectData = { 
      header, 
      lots, 
      status: isEditMode ? "Updated" : "Init" 
    };

    if (isEditMode) {
      // 編輯模式：更新陣列中的特定位置
      const idx = parseInt(pIdx);
      allProjects[idx] = { 
        ...allProjects[idx], // 保留原本的 ID 和 createdAt
        ...projectData,
        updatedAt: new Date().toLocaleString()
      };
    } else {
      // 新增模式
      const newProject = { 
        id: "proj_" + Date.now(), 
        createdAt: new Date().toLocaleString(),
        ...projectData 
      };
      allProjects.push(newProject);
    }

    localStorage.setItem("all_projects", JSON.stringify(allProjects));
    alert(isEditMode ? "✅ Project Updated!" : `✅ Project: ${header["Product ID"]} Saved!`);

    // 儲存後的收尾工作
    if (handleFinalSubmit) {
      handleFinalSubmit(); 
    } else {
      // 如果沒有傳入 handleFinalSubmit，手動跳轉回清單頁
      window.location.href = "#/list"; // 根據你的路由調整路徑
    }
  };

  // 5. AG Grid Columns
  const columnDefs = useMemo(() => [
    { 
      headerName: "Stress", field: "stress", width: 160, rowDrag: true, 
      cellRenderer: (p) => (
        <EditableDropdown 
          value={p.value} 
          options={Object.keys(stressMeta)} 
          placeholder="-- Stress --"
          onChange={(val) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { stress: val, type: "", operation: "", condition: "" })} 
        />
      ),
    },
    { 
      headerName: "Type", field: "type", width: 140, 
      cellRenderer: (p) => {
        const types = [...new Set((stressMeta[p.data.stress] || []).map(r => r.Type).filter(Boolean))];
        return <EditableDropdown value={p.value} options={types} placeholder="-- Type --" disabled={!p.data.stress} onChange={(val) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { type: val, operation: "", condition: "" })} />;
      }
    },
    { 
      headerName: "Operation", field: "operation", width: 140, 
      cellRenderer: (p) => {
        const rows = stressMeta[p.data.stress] || [];
        const ops = rows.filter(r => r.Type === p.data.type).map(r => r.Operation).filter(Boolean);
        return <EditableDropdown value={p.value} options={ops} placeholder="-- Operation --" disabled={!p.data.type} onChange={(val) => {
          const match = rows.find(r => r.Type === p.data.type && r.Operation === val);
          updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { operation: val, condition: match?.Condition || "" });
        }} />;
      }
    },
    { headerName: "Condition", field: "condition", editable: true, width: 170,wrapText: true, autoHeight: true,cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Program Name", field: "programName", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Test Program", field: "testProgram", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Test Script", field: "testScript", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { 
      headerName: "", 
      width: 85, 
      pinned: "right", 
      cellRenderer: (p) => {
        // 判斷是否已經被 Skip
        const isSkipped = p.data.startTime === "SKIPPED";
        
        return (
          <div className="d-flex gap-2 justify-content-center align-items-center h-100"> 
          {/* copy 按鈕 */}
            <button 
              className="grid-icon-btn copy-btn" 
              title="Copy" 
              onClick={() => duplicateRow(p.context.lotId, p.context.stressId, p.data)}
              style={{ color: "#64748b" }} // 設定顏色
            >
              <Copy size={16} />
            </button>       

            {/* Delete 按鈕 */}
            <button 
              className="grid-icon-btn" 
              title="Delete" 
              onClick={() => deleteRow(p.context.lotId, p.context.stressId, p.data._rid)}
              style={{ color: "#ef4444" }}
            >
              <Trash2 size={16} />
            </button>
            
            {/* Skip 按鈕 */}
            <button 
              className={`grid-icon-btn ${isSkipped ? 'skip-active-btn' : ''}`} 
              title={isSkipped ? "Unskip Step" : "Skip Step"} 
              onClick={() => {
                const action = isSkipped ? "UNSKIP" : "SKIP";
                if (window.confirm(`Are you sure you want to ${action} this step?`)) {
                  const patch = isSkipped 
                    ? { startTime: "", endTime: "" } 
                    : { startTime: "SKIPPED", endTime: "SKIPPED" };
                  updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, patch);
                }
              }}
              style={{ color: isSkipped ? "#3b82f6" : "#64748b" }}
            >
              {isSkipped ? <RotateCcw size={16} /> : <FastForward size={16} />}
            </button>
          </div> 
        );
      }, 
    },
  ], [stressMeta, updateRowFields]);

  return (
    <div className="form-page-container" style={{ padding: "0px", width: "100%" }}>
      {/* 頂部 Header */}
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
              ) : k === "Remark" ? (
                <div style={{ position: "relative" }}>
                  <input 
                    className="form-input-custom" 
                    readOnly
                    placeholder="Click to edit..."
                    style={{ cursor: "pointer", backgroundColor: "#fff" }}
                    value={header[k]} 
                    onClick={() => setIsRemarkOpen(true)}
                  />
                  <RemarkModal 
                    isOpen={isRemarkOpen}
                    value={header[k]}
                    onClose={() => setIsRemarkOpen(false)}
                    onSave={(val) => { setHeader({ ...header, Remark: val }); setIsRemarkOpen(false); }}
                  />
                </div>
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
        <button className="custom-btn-effect" onClick={addLot} style={{ border: "none", background: "none", color: "#007bff", fontSize: "18px", padding: "0 10px", cursor: "pointer" }}>+</button>
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
            
            <div className="d-flex align-items-center gap-2" style={{ position: "relative" }}>
              <div className="custom-tpl-dropdown">
                <button className="tpl-dropdown-trigger" onClick={() => setShowTplList(showTplList === lot.id ? null : lot.id)} style={{ padding: "2px 8px", border: "1px solid #fac250ff", background: "#fff6a9ff", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                  <Star size={15} /> Apply Template <span style={{ padding: "2px 2px", fontSize: "10px",  }}>▼</span>
                </button>
                {showTplList === lot.id && (
                  <div className="tpl-dropdown-menu">
                    {templates.length === 0 && <div className="tpl-no-data">No templates saved</div>}
                    {templates.map((t, idx) => (
                      <div key={idx} className="tpl-option-item" onClick={() => applyTemplate(lot.id, t)}>
                        <span className="tpl-name">{t.name}</span>
                        <button className="tpl-del-btn" onClick={(e) => { e.stopPropagation(); deleteTemplateAction(idx); }} style={{ color: "#ef4444" }}>
                          <Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="custom-btn-effect" onClick={() => saveAsTemplate(lot)} style={{ padding: "2px 5px", border: "1px solid #c2c1bfff", background: "#ffffffff", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}> <Bookmark size={16} /> Save Template</button>
            </div>
          </div>

          {lot.stresses.map((s) => (
            <div key={s.id} className="stress-box" style={{ padding: "0px", marginBottom: "4px" }}>
              <div className="ag-theme-alpine custom-excel-grid">
                <AgGridReact
                  rowData={s.rowData}
                  columnDefs={columnDefs}
                  headerHeight={30}
                  domLayout="autoHeight"
                  rowDragManaged={true} animateRows={true}
                  context={{ lotId: lot.id, stressId: s.id }}
                  onRowDragEnd={(e) => onRowDragEnd(e, lot.id, s.id)}
                  onGridReady={onGridReady}
                  onColumnResized={onColumnResized}
                  getRowStyle={(params) => {
                    if (params.data.startTime === "SKIPPED") {
                      return { backgroundColor: "#e3e5e8ff", color: "#94a3b8", fontStyle: "italic" };
                    }
                  }}
                  getRowId={(p) => p.data?._rid}
                  defaultColDef={{ resizable: true, sortable: true, singleClickEdit: true, wrapText: true, autoHeight: true }}
                />
              </div>
              <button className="btn-add-step custom-btn-effect" style={{ marginTop: "4px", fontSize: "11px" }} onClick={() => addRow(lot.id, s.id)}>+ Add Step</button>
            </div>
          ))}
        </div>
      ))}

      <div className="form-actions-bar text-end" style={{ padding: "10px", borderTop: "1px solid #eee" }}>
        <button className="btn-success-lg custom-btn-effect" style={{ padding: "5px 30px" }} onClick={handleSave}>Save Project</button>
      </div>

      <style>{`
        .form-select-custom, .form-input-custom { width: 100%; height: 28px; padding: 0 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
        .ag-theme-alpine .ag-row:hover { background-color: #f0f7ff !important; }
        
        /* 關鍵修正：讓內容換行且不凸出 */
        .ag-theme-alpine .ag-cell { 
          padding: 0 !important; 
          overflow: visible !important; 
          display: block !important; /* 從 flex 改回 block 以利自動換行 */
          border-right: 1px solid #ebebeb !important;
          word-break: break-word !important; 
          white-space: normal !important;
        }

        .custom-btn-effect, .btn-add-step, .btn-success-lg, .tpl-del-btn, .tpl-dropdown-trigger {
          transition: all 0.2s ease !important; cursor: pointer !important; outline: none !important; border: none;
        }
        .custom-btn-effect:hover, .btn-add-step:hover, .tpl-del-btn:hover, .tpl-dropdown-trigger:hover {
          background-color: rgba(0, 0, 0, 0.08) !important; filter: brightness(0.9);
        }
        .btn-success-lg:hover {
          background-color: #218838 !important; filter: brightness(0.9); box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-1px);
        }
        .grid-icon-btn { background: none; border: none; font-size: 16px; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; outline: none !important; }
        .grid-icon-btn:hover { transform: scale(1.3) translateY(-1px); }
        
        .dropdown-opt-item:hover { background-color: #007bff !important; color: white !important; }
        .custom-tpl-dropdown { position: relative; width: 141px; }
        .tpl-dropdown-trigger { width: 100%; height: 24px; border: 1px solid #ccc; background: #fff; text-align: left; padding: 0 8px; font-size: 11px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; }
        .tpl-dropdown-menu { position: absolute; top: 28px; left: 0; width: 160px; background: #fff; border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 4px; z-index: 10000; overflow: hidden; }
        .tpl-option-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
        .tpl-option-item:hover { background-color: #f0f7ff !important; }
        .tpl-name { flex: 1; font-size: 12px; color: #333; }
        .tpl-del-btn { background: transparent !important; color: #bbb; font-size: 14px; padding: 4px; display: flex; align-items: center; justify-content: center; }
        .tpl-del-btn:hover { color: #dc3545 !important; transform: scale(1.2); }
      `}</style>
    </div>
  );
}
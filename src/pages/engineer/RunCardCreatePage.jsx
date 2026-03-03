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
import { Copy, Trash2, Bookmark, Star} from "lucide-react";
ModuleRegistry.registerModules([AllCommunityModule]);

// 使用 window.location.hostname 會自動抓取「你現在網址列顯示的那個 IP」
const API_BASE = `http://${window.location.hostname}:8000`;

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
        style={{ flexGrow: 1, border: "none", background: "transparent", width: "calc(100% - 20px)", padding: "4px 8px", fontSize: "12px", outline: "none", resize: "none", overflow: "hidden", minHeight: "26px", display: "flex", alignItems: "center" }}
        value={value || ""}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)} // <--- 加上這行，滑鼠點外面就會自動存
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
  const [editingStressId, setEditingStressId] = useState(null); // 追蹤哪一個 Stress 正在被編輯
  const [configMaster, setConfigMaster] = useState({ productFamilies: [], products: [] });
  const [stressMeta, setStressMeta] = useState({});
  const [templates, setTemplates] = useState([]); 
  const [showTplList, setShowTplList] = useState(null);
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);

  const newRow = () => ({
    _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    stress: "", type: "", operation: "", condition: "", time: "",
    programName: "", testProgram: "", testScript: "",
  });

  const createInitialLot = () => {
  const firstStressId = "str_" + Date.now(); // 先建立第一個 Stress 的 ID
  return {
    id: "lot_" + Date.now(),
    lotId: "",
    // 初始化時就給它一個預設 Stress 分頁
    stresses: [{ id: firstStressId, stressName: "New Stress", rowData: [newRow()] }],
    activeStressId: firstStressId, // <--- 新增這行：追蹤目前選中的 Stress
  };
};

  const [lots, setLots] = useState([createInitialLot()]);
  const [activeLotId, setActiveLotId] = useState(lots[0].id);

// 2. 讀取資料 同步讀取資料庫 stress_test_settings 配置
  useEffect(() => {
    fetch(`${API_BASE}/stress-test-settings/`)
      .then(res => res.json())
      .then(dbStresses => {
        const map = {};
        // 注意：dbStresses 是一個平坦的清單，我們需要根據 'stress' 欄位進行分組
        dbStresses.forEach(item => {
          const stressName = item.stress; // 後端欄位名稱是 stress
          
          if (!map[stressName]) {
            map[stressName] = [];
          }         
          // 將資料庫的小寫欄位轉換為你前端表格預期的大寫 Key (Type, Operation, Condition)
          map[stressName].push({
            Type: item.type || "",
            Operation: item.operation || "",
            Condition: item.condition || ""
          });
        });
        // 確保步驟是按照 sequence_order 排序（如果有需要的話）
        // 如果後端沒排好，這裡可以補一個 sort
        setStressMeta(map);
      })
      .catch(err => console.error("Stress DB sync failed:", err));

    // ---  products 讀取邏輯 ---
    fetch(`${API_BASE}/products/`)
      .then(res => res.json())
      .then(dbData => {
        const uniqueFamilies = [...new Set(dbData.map(p => p.product_family))].filter(Boolean).map(f => ({
          id: f, 
          name: f
        }));
        const products = dbData.map(p => ({
          id: p.id,
          familyId: p.product_family,
          productName: p.product_name,
        }));
        setConfigMaster({ productFamilies: uniqueFamilies, products: products });
      })
      .catch(err => console.error("Database sync failed:", err));

    const savedTemplates = JSON.parse(localStorage.getItem("runcard_templates") || "[]");
    setTemplates(savedTemplates);

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
  }, [pIdx]);

  // 3. 操作邏輯
  const addLot = () => { const newLot = createInitialLot(); setLots((p) => [...p, newLot]); setActiveLotId(newLot.id); };
  // 新增：切換特定 Lot 下的 Stress 分頁
  const switchStress = (lotId, stressId) => {
    setLots(prev => prev.map(l => 
      l.id === lotId ? { ...l, activeStressId: stressId } : l
    ));
  };
  // 新增：在特定 Lot 下新增一個 Stress 分頁
  const addStressToLot = (lotId) => {
    const newStress = { 
      id: "str_" + Date.now() + Math.random(), 
      stressName: "New Stress", 
      rowData: [newRow()] 
    };
    setLots(prev => prev.map(l => 
      l.id === lotId 
        ? { ...l, stresses: [...l.stresses, newStress], activeStressId: newStress.id } 
        : l
    ));
  };
  const deleteLot = (lotId) => { if (lots.length === 1) return alert("At least one LOT must be retained"); const remain = lots.filter((l) => l.id !== lotId); setLots(remain); setActiveLotId(remain[0].id); };
  
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

  // 1. 儲存模板：確保傳入的是當前選中的 Stress 物件
  const saveAsTemplate = (stress) => {
    if (!stress || !stress.rowData) {
      alert("No data to save!");
      return;
    }

    const name = window.prompt("Enter template name for this Stress:", stress.stressName || "");
    if (!name) return;

    // 格式標準化：只存 rowData (步驟)，不存 ID
    const newTemplate = { 
      name: name, 
      id: "tpl_" + Date.now(),
      isSingleStress: true, // 標記這是單一 Stress 的模板
      steps: stress.rowData.map(({ _rid, ...p }) => p) 
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem("runcard_templates", JSON.stringify(updated));
    alert(`✅ Template "${name}" saved!`);
  };

  const applyTemplate = (lotId, template) => {
  setLots((prev) => prev.map((l) => {
    if (l.id !== lotId) return l;

    // 找到當前選中的那個 Stress 並更新它的 rowData
    const updatedStresses = l.stresses.map((s) => {
      if (s.id === l.activeStressId) {
        return {
          ...s,
          // 如果模板是新的單一格式就用 .steps，舊格式就相容處理
          rowData: (template.steps || template.stresses[0].rowData).map(r => ({
            ...r,
            _rid: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2)
          }))
        };
      }
      return s;
    });

    return { ...l, stresses: updatedStresses };
  }));
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
//handleSave//
const handleSave = async () => {
  // 0. ✨ 獲取當前登入使用者資訊 (從 localStorage 抓取，若無則用 Owner 欄位)
  const currentUser = localStorage.getItem("username") || header["Owner"] || "Unknown";
  const token = localStorage.getItem("token"); // 如果你有實作 Token 驗證
  
  const commonHeaders = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }) // 若有 token 則帶入
  };

  // 1. 必填檢查
  const requiredFields = ["Product Family", "Product", "Product ID", "Version", "QR", "Sample Size", "Owner"];
  for (let field of requiredFields) {
    if (!header[field]) return alert(`⚠️ 請填寫 ${field}`);
  }

  if (!window.confirm("確定要儲存專案與所有 Run Cards 嗎？")) return;

  try {
    // --- STEP 1: 建立 Project ---
    const projectPayload = {
      product_family: String(header["Product Family"]),
      product: String(header["Product"]),
      product_id: String(header["Product ID"]), 
      version: String(header["Version"]),
      qr: String(header["QR"]),
      sample_size: String(header["Sample Size"]),
      owner: String(header["Owner"]),
      remark: String(header["Remark"] || ""),
      status: "Active",
      created_by: currentUser
    };

    const projRes = await fetch(`${API_BASE}/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectPayload),
    });

    if (!projRes.ok) {
      const errData = await projRes.json();
      throw new Error(`專案建立失敗: ${errData.detail || "未知錯誤"}`);
    }

    const savedProj = await projRes.json();
    const projectId = savedProj.project_id;

    // --- STEP 2 & 3: 建立 Run Cards 與 Tasks ---
    let runCardCount = 0;
    let taskCount = 0;

    for (const lot of lots) {
      const stresses = lot.stresses || []; 
      
      for (const stressGroup of stresses) {
        // 🚀 關鍵修改 1：從表格第一列抓取真正的 Stress 名稱
        const rawValue = stressGroup.rowData?.[0]?.stress;
        const isValidStress = rawValue && rawValue !== "-- Stress --" && rawValue !== "" && rawValue !== "New Stress";

        // 🚀 關鍵修改 2：防呆機制
        if (!isValidStress) {
          alert(`❌ 儲存失敗！\nLOT: ${lot.lotId} 中有個 Stress 尚未選取有效名稱。\n請確保表格第一列的 Stress 欄位已正確填寫。`);
          return; // 中斷整個存檔程序
        }

        const currentStressName = String(rawValue);

        // 建立 Run Card Payload
        const runCardPayload = {
          project_id: projectId,
          lot_id: String(lot.lotId || "New LOT"),
          stress: currentStressName, // 這裡現在會傳送正確的名稱 (例如: ALT)
          status: "Init",
          created_by: currentUser
        };

        const rcRes = await fetch(`${API_BASE}/run_cards/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(runCardPayload),
        });

        if (!rcRes.ok) {
          const errData = await rcRes.json();
          throw new Error(`RunCard 建立失敗 (${currentStressName}): ${errData.detail || "資料庫驗證失敗"}`);
        }

        const savedRC = await rcRes.json();
        const runCardId = savedRC.run_card_id;
        runCardCount++;

        // --- STEP 3: 建立 Tasks ---
        const rows = stressGroup.rowData || [];
        for (const [idx, row] of rows.entries()) {
          const taskPayload = {
            run_card_id: parseInt(runCardId),
            sequence_order: idx + 1,
            type: String(row.type || ""),
            operation: String(row.operation || ""),
            condition: String(row.condition || ""),
            time: String(row.time || ""), // ✨ 新增這行：將前端的 row.time 傳給後端的 time 欄位
            unit_qty: row.qty ? parseInt(row.qty) : 0, // 強制轉數字
            hardware: String(row.hardware || ""),
            test_program: String(row.testProgram || ""),
            program_name: String(row.programName || ""),
            test_script: String(row.testScript || ""),
            status: "Wait",
            created_by: currentUser
          };

          const tRes = await fetch(`${API_BASE}/tasks/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskPayload),
          });

          if (!tRes.ok) {
            const errData = await tRes.json();
            console.error("Task failed:", errData);
            // Task 失敗可以選擇記錄但不中斷，或直接 throw
          } else {
            taskCount++;
          }
        }
      }
    }

    alert(`✅ 儲存成功！\nProject ID: ${projectId}\nRun Cards: ${runCardCount}\nTasks: ${taskCount}`);
    window.location.hash = "/list";

  } catch (error) {
    console.error("Save failed:", error);
    alert(`❌ 發生錯誤: ${error.message}`);
  }
};
  // 5. AG Grid Columns
  const columnDefs = useMemo(() => [
    { 
      headerName: "Stress", field: "stress", width: 160, 
      cellRenderer: (p) => (
        <EditableDropdown 
          value={p.value} 
          options={Object.keys(stressMeta)} // 這裡會自動抓到資料庫所有的 Stress 名稱
          placeholder="-- Stress --"
          onChange={(val) => {
            // 當選中 ALT 時，自動帶入該 Stress 的第一個步驟（或保持空白讓使用者選）
            updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { 
              stress: val, 
              type: "", 
              operation: "", 
              condition: "" 
            });
          }} 
        />
      ),
    },
    { headerName: "Type", field: "type", width: 140, 
      cellRenderer: (p) => {
        const types = [...new Set((stressMeta[p.data.stress] || []).map(r => r.Type).filter(Boolean))];
        return <EditableDropdown value={p.value} options={types} placeholder="-- Type --" disabled={!p.data.stress} onChange={(val) => updateRowFields(p.context.lotId, p.context.stressId, p.data._rid, { type: val, operation: "", condition: "" })} />;
      }
    },
    { headerName: "Operation", field: "operation", width: 140, 
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
    { headerName: "TIME", field: "time", editable: true, width: 170,wrapText: true, autoHeight: true,cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Program Name", field: "programName", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Test Program", field: "testProgram", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "Test Script", field: "testScript", editable: true, width: 150, wrapText: true, autoHeight: true, cellStyle: { fontSize: "12px", fontWeight: "normal", lineHeight: "1.5", display: "block", padding: "4px 8px" } },
    { headerName: "", 
      width: 60, 
      pinned: "right", 
      cellRenderer: (p) => {       
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
          </div> 
        );
      }, 
    },
  ], [stressMeta, updateRowFields]);

  return (
    <div className="form-page-container" style={{ padding: "0px", width: "100%" }}>
      {/* 頂部 Header */}
      <div className="prof-card" style={{ padding: "8px 8px", marginBottom: "-4px", borderRadius: "0", marginTop: "0", boxShadow: "none", border: "1px solid #e0e0e0" }}>
        <div className="header-grid" style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px" }}>
          {Object.keys(header).map((k) => (
            <div className="header-item" key={k} style={{ display: "flex", flexDirection: "column" }}>
              <label className="bold-label" style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>{k.toUpperCase()}</label>
              {k === "Product Family" ? (
                <select className="form-select-custom" value={header[k]} onChange={(e) => setHeader({ ...header, [k]: e.target.value, Product: "", Version: "" })}>
                  <option value="">-- Select --</option>
                  {configMaster.productFamilies.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
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
      <div className="lot-tabs-container" style={{ margin: "0", padding: "0", gap: "0px", display: "flex", alignItems: "flex-end" }}>
        {lots.map((lot) => (
          <div key={lot.id}
          className={`lot-tab-wrapper ${activeLotId === lot.id ? "active" : ""}`} 
          onClick={() => setActiveLotId(lot.id)} 
          style={{ 
              padding: "4px 10px", 
              borderBottom: activeLotId === lot.id ? "2px solid #007bff" : "none",
              display: "flex",
              alignItems: "center",
              maxWidth: "150px", // 限制分頁最大寬度
              minWidth: "80px",
              cursor: "pointer"
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: activeLotId === lot.id ? "bold" : "normal",whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1}}>
              {lot.lotId || "New LOT"}</span>
            <button className="lot-tab-close" onClick={(e) => { e.stopPropagation(); deleteLot(lot.id); }}>×</button>
          </div>
        ))}
        <button className="custom-btn-effect" onClick={addLot} style={{ border: "none", background: "none", color: "#007bff", fontSize: "18px", padding: "0 10px", cursor: "pointer" }}>+</button>
      </div>

      {/* LOT Content */}
      {lots.map((lot) => activeLotId === lot.id && (
        <div key={lot.id} className="prof-card" style={{ padding: "5px", borderRadius: "0", border: "0px solid #e0e0e0", borderLeft: "none", borderRight: "none", marginTop: "-1px" }}>
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
              <button 
                className="custom-btn-effect" 
                onClick={() => {
                  // 核心邏輯：在點擊時，手動從目前這個 lot 裡找出「左邊側邊欄選中」的那個 stress 物件
                  const currentS = lot.stresses.find(s => s.id === (lot.activeStressId || lot.stresses[0]?.id));
                  saveAsTemplate(currentS); 
                }} 
                style={{ padding: "2px 5px", border: "1px solid #c2c1bfff", background: "#ffffffff", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
              > 
                <Bookmark size={16} /> Save Template
              </button>
            </div>
          </div>

          {/* --- STRESS LIST：左側邊欄佈局 --- */}
          <div style={{ display: "flex", border: "1px solid #e0e0e0", minHeight: "500px", background: "#fff", borderRadius: "4px", overflow: "hidden" }}>
            {/* 精緻側邊欄 */}
            <div style={{ 
              width: isSidebarCollapsed ? "40px" : "150px", 
              borderRight: "1px solid #e0e0e0", 
              background: "#fdfdfd", 
              display: "flex", 
              flexDirection: "column",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative"
            }}>
              {/* 🚀 精緻收合按鈕 */}
              <div 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{ 
                  cursor: "pointer", background: "#f1f3f5", textAlign: "center", 
                  padding: "3px 0", color: "#868e96", fontSize: "10px", fontWeight: "800",
                  borderBottom: "1px solid #e0e0e0", letterSpacing: "1px"
                }}
              >
                {isSidebarCollapsed ? "▶" : "◀ Stress List"}
              </div>

              {!isSidebarCollapsed ? (
                /* 🚀 展開狀態 */
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                  <div>
                    {lot.stresses.map((s) => {
                      // 🚀 修改點：定義 autoName 抓取表格第一列的 Stress 內容
                      const autoName = s.rowData?.[0]?.stress || "New Stress";

                      return (
                        <div 
                          key={s.id} 
                          onClick={() => switchStress(lot.id, s.id)}
                          onDoubleClick={() => setEditingStressId(s.id)}
                          style={{ 
                            padding: "3px 5px", 
                            cursor: "pointer", 
                            borderBottom: "1px solid #c9cbccff", 
                            background: lot.activeStressId === s.id ? "#e7f1ff" : "transparent",
                            borderLeft: lot.activeStressId === s.id ? "2px solid #007bff" : "0px solid transparent",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "background 0.2s"
                          }}
                        >
                          {editingStressId === s.id ? (
                            <input 
                              autoFocus
                              style={{ width: "100%", border: "1px solid #007bff", fontSize: "12px", outline: "none" }}
                              value={s.stressName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLots(prev => prev.map(l => l.id === lot.id ? {
                                  ...l, stresses: l.stresses.map(st => st.id === s.id ? { ...st, stressName: val } : st)
                                } : l));
                              }}
                              onKeyDown={(e) => e.key === "Enter" && setEditingStressId(null)}
                              onBlur={() => setEditingStressId(null)}
                            />
                          ) : (
                            <>
                              <span style={{ 
                                fontSize: "12px", 
                                fontWeight: lot.activeStressId === s.id ? "600" : "400",
                                color: lot.activeStressId === s.id ? "#0056b3" : "#495057",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                              }}>
                                {/* 🚀 顯示表格抓到的名稱 */}
                                {autoName}
                              </span>
                              
                              {/* 刪除叉叉 */}
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLots(prev => prev.map(l => {
                                    if (l.id !== lot.id) return l;
                                    const deleteIndex = l.stresses.findIndex(st => st.id === s.id);
                                    const newStresses = l.stresses.filter(item => item.id !== s.id);
                                    let nextActiveId = l.activeStressId;
                                    if (l.activeStressId === s.id) {
                                      const prevStress = l.stresses[deleteIndex - 1];
                                      nextActiveId = prevStress ? prevStress.id : (newStresses[0]?.id || null);
                                    }
                                    return { ...l, stresses: newStresses, activeStressId: nextActiveId };
                                  }));
                                }}
                                style={{ 
                                  fontSize: "16px", color: "#adb5bd", padding: "0 5px", 
                                  transition: "color 0.2s", fontWeight: "bold" 
                                }}
                                onMouseOver={(e) => e.target.style.color = "#ff4d4f"}
                                onMouseOut={(e) => e.target.style.color = "#adb5bd"}
                              >
                                ×
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* 🚀 Add Stress 按鈕 */}
                  <div 
                    onClick={() => addStressToLot(lot.id)}
                    style={{ padding: "8px 33px", fontSize: "12px", color: "#007bff", cursor: "pointer",display: "flex",alignItems: "center",gap: "6px",background: "transparent",borderBottom: "1px solid #f1f3f5",transition: "all 0.2s"}}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#f8f9fa"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "bold" }}>+</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold" }}>Add Stress</span>
                </div>
                </div>
              ) : (
                /* 🚀 收合狀態 */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "10px", gap: "8px" }}>
                  {lot.stresses.map(s => {
                    // 🚀 修改點：收合時同樣抓取表格內容的第一個字
                    const autoName = s.rowData?.[0]?.stress || "S";
                    return (
                      <div 
                        key={s.id}
                        onClick={() => switchStress(lot.id, s.id)}
                        style={{ width: "24px", height: "24px", borderRadius: "4px",background: lot.activeStressId === s.id ? "#007bff" : "transparent",display: "flex", alignItems: "center", justifyContent: "center",fontSize: "10px", color: lot.activeStressId === s.id ? "#fff" : "#adb5bd",cursor: "pointer", fontWeight: "bold",border: lot.activeStressId === s.id ? "none" : "1px solid #eee"}}
                        title={autoName}
                      >
                        {autoName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })}
                  <div 
                    onClick={() => addStressToLot(lot.id)}
                    style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff", cursor: "pointer", fontSize: "18px" }}
                    title="Add Stress"
                  >
                    +
                  </div>
                </div>
              )}
            </div>

            {/* 右側表格內容 */}
            <div style={{ flex: 1, padding: "0px" }}>
              {lot.stresses.filter(s => s.id === (lot.activeStressId || lot.stresses[0]?.id)).map((s) => (
                <div key={s.id} className="stress-box">
                  <div className="ag-theme-alpine custom-excel-grid">
                    <AgGridReact
                      rowData={s.rowData}
                      columnDefs={columnDefs}
                      context={{ lotId: lot.id, stressId: s.id }} 
                      onColumnResized={onColumnResized}
                      onGridReady={onGridReady}
                      onRowDragEnd={(e) => onRowDragEnd(e, lot.id, s.id)}
                      headerHeight={25}
                      domLayout="autoHeight"
                      rowDragManaged={true} 
                      animateRows={true}
                      // 🚀 加入這行，點擊滑鼠別處會自動儲存正在編輯的儲存格
                      stopEditingWhenCellsLoseFocus={true}
                      getRowStyle={(params) => {
                        if (params.data.startTime === "SKIPPED") {
                          return { backgroundColor: "#e3e5e8ff", color: "#94a3b8", fontStyle: "italic" };
                        }
                      }}
                      getRowId={(p) => p.data?._rid}
                      defaultColDef={{ resizable: true, sortable: true, singleClickEdit: true, wrapText: true, autoHeight: true }}
                    />
                  </div>
                  <button className="btn-add-step custom-btn-effect" style={{ marginTop: "0px", fontSize: "11px" }} onClick={() => addRow(lot.id, s.id)}>+ Add Step</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="form-actions-bar text-end" style={{ padding: "10px", borderTop: "1px solid #eee" }}>
        <button className="btn-success-lg custom-btn-effect" style={{ padding: "5px 30px" }} onClick={handleSave}>Save</button>
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
        
        .sidebar-item:hover {background-color: #f0f7ff !important;}
        .sidebar-item.active {box-shadow: 2px 0 5px rgba(0,0,0,0.05);z-index: 1;}
        .add-stress-btn-sidebar:hover {border-color: #007bff !important;color: #007bff !important;background-color: #fff !important;}
        .sidebar-edit-input {animation: fadeIn 0.2s ease;}

        @keyframes fadeIn {from { opacity: 0; }to { opacity: 1; }}
      `}</style>
    </div>
  );
}
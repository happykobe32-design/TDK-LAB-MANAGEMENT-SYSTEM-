import React, { useState, useEffect, useMemo, useCallback } from "react";

export default function RunCardListPage() {
  const [allData, setAllData] = useState([]);
  
  // --- 篩選狀態 ---
  const [searchText, setSearchText] = useState(""); 
  const [quickDateRange, setQuickDateRange] = useState("3m"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [colFilters, setColFilters] = useState({});
  const [colMenuSearch, setColMenuSearch] = useState({}); 

  // --- 編輯狀態 ---
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // --- 勾選與刪除狀態 ---
  const [selectedIds, setSelectedIds] = useState([]);

  // --- 分頁狀態 ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const columnConfig = [
    { key: "status", label: "Status" },
    { key: "createdDate", label: "CREATEDDATE" },
    { key: "productFamily", label: "Product Family" },
    { key: "product", label: "Product" },
    { key: "productId", label: "Product ID" },
    { key: "version", label: "VERSION" },
    { key: "qr", label: "QR" },  
    { key: "sampleSize", label: "SAMPLE SIZE" }, 
    { key: "owner", label: "OWNER" },
    { key: "remark", label: "REMARK" },
    { key: "lotId", label: "LotID" },
    { key: "stress", label: "Stress" },
    { key: "type", label: "Type" },
    { key: "operation", label: "Operation" },
    { key: "condition", label: "Condition" },
    { key: "programName", label: "Program Name" },
    { key: "testProgram", label: "Test Program" },
    { key: "testScript", label: "Test Script" },
    { key: "checkIn", label: "Check_in_Time" },
    { key: "checkOut", label: "Check_Out_Time" },
    { key: "qty", label: "Unit/Q'ty" },
    { key: "hardware", label: "Hardware" },
    { key: "note", label: "Note" }
  ];

  const DEFAULT_VISIBLE_COLUMNS = [
    "status",
    "lotId",
    "stress",
    "qr",
    "owner",
  ];

  const [visibleCols, setVisibleCols] = useState(
    columnConfig.reduce((acc, col) => {
      acc[col.key] = DEFAULT_VISIBLE_COLUMNS.includes(col.key);
      return acc;
    }, {})
  );

  // 初始化日期
  useEffect(() => {
    handleQuickDateChange("3m");
  }, []);

  const handleQuickDateChange = (range) => {
    setQuickDateRange(range);
    if (range === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    if (range === "1m") start.setMonth(end.getMonth() - 1);
    else if (range === "3m") start.setMonth(end.getMonth() - 3);
    else if (range === "6m") start.setMonth(end.getMonth() - 6);
    else if (range === "1y") start.setFullYear(end.getFullYear() - 1);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const loadData = useCallback(() => {
    const config = JSON.parse(localStorage.getItem("config_master") || "{}");
    const familyMap = (config.productFamilies || []).reduce((acc, f) => {
      acc[f.id] = f.name;
      return acc;
    }, {});
    
    const raw = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const flattened = [];

    raw.forEach((proj, pIdx) => {
      const header = proj.header || {};
      const projCreatedDate = header["Created Date"] || proj.createdAt || "";

      (proj.lots || []).forEach((lot, lIdx) => {
        (lot.stresses || []).forEach((stressObj, sIdx) => {
          (stressObj.rowData || []).forEach((row, rIdx) => {
            let stepStatus = "Init";
            if (row.endTime) stepStatus = "Completed";
            else if (row.startTime) stepStatus = "In-Process";

            flattened.push({
              id: `${pIdx}-${lIdx}-${sIdx}-${rIdx}`, 
              pIdx, lIdx, sIdx, rIdx,
              status: stepStatus,
              createdDate: projCreatedDate.split(' ')[0], 
              productFamily: familyMap[header["Product Family"]] || header["Product Family"] || "",
              product: header["Product"] || "",
              productId: header["Product ID"] || "",
              version: header["Version"] || "",
              qr: header["QR"] || "",  
              sampleSize: header["Sample Size"] || "",            
              owner: header["Owner"] || "",
              remark: header["Remark"] || "",
              stress: row.stress || stressObj.stress || "",
              lotId: lot.lotId || "",
              type: row.type || "",
              operation: row.operation || "",
              condition: row.condition || "",
              programName: row.programName || "",
              testProgram: row.testProgram || "",
              testScript: row.testScript || "",
              checkIn: row.startTime || "",
              checkOut: row.endTime || "",
              qty: row.qty || "",
              hardware: row.hardware || "",
              note: row.note || ""
            });
          });
        });
      });
    });
    setAllData(flattened);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- 勾選邏輯 ---
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredRows.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

// --- 真正從前端刪除並同步 (修正空殼問題版本) ---
  const handleDeleteSelected = () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} records? This cannot be undone.`)) return;

    // 1. 取得原始資料
    let raw = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const targetSet = new Set(selectedIds);

    // 2. 深度清理資料結構 (由下而上)
    raw.forEach((proj, pIdx) => {
      if (!proj.lots) return;

      proj.lots.forEach((lot, lIdx) => {
        if (!lot.stresses) return;

        lot.stresses.forEach((stress, sIdx) => {
          // 只保留「不在勾選名單中」的 rowData
          if (stress.rowData) {
            stress.rowData = stress.rowData.filter((row, rIdx) => {
              const currentId = `${pIdx}-${lIdx}-${sIdx}-${rIdx}`;
              return !targetSet.has(currentId);
            });
          }
        });

        // 如果該 stress 裡的 rowData 被刪光了，就把這個 stress 移除
        lot.stresses = lot.stresses.filter(s => s.rowData && s.rowData.length > 0);
      });

      // 如果該 lot 裡的 stresses 被刪光了，就把這個 lot 移除
      proj.lots = proj.lots.filter(l => l.stresses && l.stresses.length > 0);
    });

    // 3. 關鍵：徹底移除沒有任何 Lot 的 Project 物件
    // 這一步會讓 Check In/Out 頁面的左側選單完全清空該專案名稱
    const cleanedRaw = raw.filter(p => p.lots && p.lots.length > 0);

    // 4. 儲存並同步
    localStorage.setItem("all_projects", JSON.stringify(cleanedRaw));
    
    // 強制觸發 storage 事件，讓其他視窗(Check-In/Out)立即知道資料變了
    window.dispatchEvent(new Event('storage'));

    setSelectedIds([]);
    loadData(); // 重新整理列表
  };

  // --- 編輯邏輯 ---
  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const handleSaveEdit = () => {
    const raw = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const t = editForm;
    
    try {
      const rowRef = raw[t.pIdx].lots[t.lIdx].stresses[t.sIdx].rowData[t.rIdx];
      // 同步所有可編輯欄位回原始資料結構
      rowRef.condition = t.condition;
      rowRef.programName = t.programName;
      rowRef.testProgram = t.testProgram;
      rowRef.testScript = t.testScript;
      rowRef.startTime = t.checkIn;
      rowRef.endTime = t.checkOut;
      rowRef.qty = t.qty;
      rowRef.hardware = t.hardware;
      rowRef.note = t.note;
      rowRef.type = t.type;
      rowRef.operation = t.operation;

      localStorage.setItem("all_projects", JSON.stringify(raw));
      setEditingId(null);
      loadData();
    } catch (e) {
      alert("Save failed. The data structure might have changed.");
    }
  };

  const stats = useMemo(() => ({
    total: allData.length,
    active: allData.filter(x => x.status === "In-Process").length,
    done: allData.filter(x => x.status === "Completed").length,
    init: allData.filter(x => x.status === "Init").length
  }), [allData]);

  const filteredRows = useMemo(() => {
    let result = allData.filter(d => {
      const s = searchText.toLowerCase();
      const matchGlobal = s === "" || Object.values(d).some(v => String(v).toLowerCase().includes(s));
      
      let matchDate = true;
      if (startDate || endDate) {
        const rowDate = new Date(d.createdDate).setHours(0,0,0,0);
        if (startDate && rowDate < new Date(startDate).setHours(0,0,0,0)) matchDate = false;
        if (endDate && rowDate > new Date(endDate).setHours(0,0,0,0)) matchDate = false;
      }

      const matchCols = Object.keys(colFilters).every(key => {
        if (!colFilters[key] || colFilters[key].length === 0) return true;
        return colFilters[key].includes(String(d[key]));
      });

      return matchGlobal && matchDate && matchCols;
    });

    Object.keys(colFilters).forEach(key => {
      if (colFilters[key] && colFilters[key].length > 0) {
        const filterOrder = colFilters[key];
        result.sort((a, b) => {
          const idxA = filterOrder.indexOf(String(a[key]));
          const idxB = filterOrder.indexOf(String(b[key]));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return 0;
        });
      }
    });

    return result;
  }, [allData, searchText, startDate, endDate, colFilters]);

  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  const currentTableData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const getUniqueValues = (key) => {
    return [...new Set(allData.map(item => String(item[key] || "")))].sort();
  };

  const handleReset = () => {
    setSearchText("");
    handleQuickDateChange("3m");
    setColFilters({});
    setSelectedIds([]);
    setCurrentPage(1);
  };

  const toggleColFilter = (key, val) => {
    setColFilters(prev => {
      const current = prev[key] || [];
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...prev, [key]: next };
    });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    return (
      <div className="custom-pagination">
        <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>{"<<"}</button>
        <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>{"<"}</button>
        {Array.from({ length: Math.max(0, end - start + 1) }).map((_, i) => (
          <button key={start + i} className={`page-btn ${currentPage === (start + i) ? 'active' : ''}`} onClick={() => setCurrentPage(start + i)}>
            {start + i}
          </button>
        ))}
        <button className="page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>{">"}</button>
        <button className="page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)}>{">>"}</button>
      </div>
    );
  };

  return (
    <div className="main-page bg-white">
      <div className="container-fluid py-4">
        
        {/* 統計數字 */}
        <div className="row g-2 mb-1">
          {[
            { label: "Total", val: stats.total, color: "#000" },
            { label: "Completed", val: stats.done, color: "#16a34a" },
            { label: "In-Process", val: stats.active, color: "#f59e0b" },
            { label: "Init", val: stats.init, color: "#64748b"}
          ].map((item, i) => (
            <div key={i} className="col-md-3">
              <div className="stats-box border-start border-4 shadow-sm" style={{ borderColor: item.color }}>
                <div className="stats-title" style={{ color: item.color }}>{item.label}</div>
                <div className="stats-num" style={{ color: item.color }}>{item.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 控制列 */}
        <div className="row g-2 mb-1 align-items-center">
          <div className="col-md-3">
            <div className="search-wrap">
              <span className="search-icon-fixed">🔍</span>
              <input 
                type="text" className="search-bar-custom" 
                placeholder="Search anything..." 
                value={searchText} onChange={e => {setSearchText(e.target.value); setCurrentPage(1);}} 
              />
            </div>
          </div>
          <div className="col-md-5 d-flex align-items-center gap-2">
            <span className="fw-bold small">Date:</span>
            <select className="date-input-custom" value={quickDateRange} onChange={(e) => handleQuickDateChange(e.target.value)}>
              <option value="1m">Last 1 Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last 1 Year</option>
              <option value="all">All Time</option>
            </select>
            <input type="date" className="date-input-custom" value={startDate} onChange={e => {setStartDate(e.target.value); setCurrentPage(1);}} />
            <span>~</span>
            <input type="date" className="date-input-custom" value={endDate} onChange={e => {setEndDate(e.target.value); setCurrentPage(1);}} />
          </div>
          <div className="col-md-4 d-flex justify-content-end">
             {renderPagination()}
          </div>
        </div>

        {/* 功能列 */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex gap-2 align-items-center">
            <div className="dropdown">
              <button className="action-button-custom" data-bs-toggle="dropdown" data-bs-auto-close="outside">⚙️ Columns</button>
              <ul className="dropdown-menu shadow p-2" style={{ maxHeight: '400px', overflowY: 'auto', minWidth: '160px' }}>
                {/* 全選與不選按鈕：使用 d-flex 讓它們並排，縮小字體 */}
                <li className="d-flex justify-content-between border-bottom mb-1 pb-1 px-1">
                  <button className="btn btn-link p-0 text-decoration-none fw-bold" style={{ fontSize: '11px' }} 
                    onClick={() => {
                      const next = {}; columnConfig.forEach(c => next[c.key] = true); setVisibleCols(next);
                    }}>全選</button>
                  <button className="btn btn-link p-0 text-decoration-none text-muted" style={{ fontSize: '11px' }} 
                    onClick={() => {
                      const next = {}; columnConfig.forEach(c => next[c.key] = false); setVisibleCols(next);
                    }}>清空</button>
                </li>
                {/* 修改項目的間距：移除原本的 padding (py-0)，讓清單更擠 */}
                {columnConfig.map(col => (
                  <li key={col.key} className="dropdown-item py-0 px-2 d-flex align-items-center" style={{ height: '15px' }}>
                    <label className="d-flex align-items-center w-100 m-0" style={{ cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="me-1"
                        style={{ transform: 'scale(0.8)' }} // 縮小勾選框
                        checked={visibleCols[col.key]} 
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))} 
                      /> 
                      <span style={{ fontSize: '12px' }}>{col.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <button className="action-button-custom btn-reset-red" onClick={handleReset}>⟳ Reset All</button>
            
            {/* 勾選後跳出的刪除按鈕 */}
            {selectedIds.length > 0 && (
              <button className="btn btn-danger btn-sm shadow-sm animate-fade-in" onClick={handleDeleteSelected}>
                🗑️ Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
          <div className="small text-muted">Found <b className="text-dark">{totalItems}</b> items</div>
        </div>

        {/* 表格區 */}
        <div className="table-container-fixed shadow-sm">
          <div className="table-responsive custom-scrollbar">
            <table className="table-fixed-layout">
              <thead>
                <tr>
                  <th className="text-center" style={{width:'40px'}}>
                    <input type="checkbox" className="form-check-input" 
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRows.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)} />
                  </th>
                  <th className="text-center" style={{width:'50px'}}>NO.</th>
                  {columnConfig.map(col => {
                    if (!visibleCols[col.key]) return null;
                    const isFiltered = colFilters[col.key] && colFilters[col.key].length > 0;
                    return (
                      <th key={col.key}>
                        <div className="d-flex align-items-center gap-1 justify-content-between">
                          <span className={isFiltered ? "text-warning" : ""}>{col.label}</span>
                          <span className="dropdown">
                            <span className={`filter-btn-excel ${isFiltered ? 'active' : ''}`} data-bs-toggle="dropdown" data-bs-auto-close="outside">▼</span>
                            <div className="dropdown-menu shadow-lg p-2 excel-dropdown-custom">
                              <input 
                                type="text" className="form-control form-control-sm mb-2" 
                                placeholder="Filter..." 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setColMenuSearch(prev => ({...prev, [col.key]: e.target.value}))}
                              />
                              <div className="list-wrapper">
                                {getUniqueValues(col.key)
                                  .filter(v => v.toLowerCase().includes((colMenuSearch[col.key] || "").toLowerCase()))
                                  .map(val => (
                                  <div className="form-check py-1" key={val}>
                                    <input 
                                      className="form-check-input" type="checkbox" 
                                      checked={colFilters[col.key]?.includes(val) || false}
                                      onChange={() => toggleColFilter(col.key, val)}
                                      id={`filter-${col.key}-${val}`}
                                    />
                                    <label className="form-check-label small w-100" htmlFor={`filter-${col.key}-${val}`}>{val || "(Blanks)"}</label>
                                  </div>
                                ))}
                              </div>
                              <div className="dropdown-divider"></div>
                              <button className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => setColFilters(prev => ({...prev, [col.key]: []}))}>Clear</button>
                            </div>
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center" style={{width:'100px'}}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((r, i) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className={`row-hover-effect ${isEditing ? 'editing-active' : ''}`}>
                      <td className="text-center">
                        <input type="checkbox" className="form-check-input" 
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelectRow(r.id)} />
                      </td>
                      <td className="text-center no-cell">{(currentPage - 1) * pageSize + i + 1}</td>
                      {columnConfig.map(col => {
                        if (!visibleCols[col.key]) return null;
                        
                        // 狀態欄不開放直接編輯，透過時間自動判定
                        if (col.key === "status") {
                           return <td key={col.key} className="text-center"><span className={`status-tag ${r.status.toLowerCase()}`}>{r.status}</span></td>;
                        }

                        return (
                          <td key={col.key}>
                            {isEditing ? (
                              <input 
                                className="form-control form-control-xs" 
                                value={editForm[col.key] || ""} 
                                onChange={(e) => setEditForm({...editForm, [col.key]: e.target.value})}
                              />
                            ) : (
                              <span className={col.key.includes('check') ? 'check-time-text' : ''}>
                                {r[col.key]}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          {isEditing ? (
                            <>
                              <button className="btn-icon-action save" onClick={handleSaveEdit}>💾</button>
                              <button className="btn-icon-action cancel" onClick={() => setEditingId(null)}>✖️</button>
                            </>
                          ) : (
                            <button className="btn-icon-action edit" onClick={() => handleStartEdit(r)}>✏️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {Array.from({ length: Math.max(0, 10 - currentTableData.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="row-empty">
                    <td colSpan="100"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <style>{`
          .main-page { width: 100%; min-height: 100vh; font-family: sans-serif; }
          .container-fluid { padding-top: 0px !important; padding-bottom: 0px; }

          .stats-box { background: #f8fafc; padding: 2px 5px; border-radius: 4px; }
          .stats-title { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
          .stats-num { font-size: 18px; font-weight: 700; }

          .search-wrap { position: relative; }
          .search-icon-fixed { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; }
          .search-bar-custom { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; }
          .date-input-custom { border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; padding: 5px 8px; color: #475569; outline: none; background: #fff; }

          .action-button-custom { border: 1px solid #e2e8f0; background: #fff; padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: 0.2s; }
          .action-button-custom:hover { background: #f1f5f9; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .btn-reset-red { color: #dc2626; border-color: #fee2e2; }

          .custom-pagination { display: flex; gap: 4px; }
          .page-btn { border: 1px solid #e2e8f0; background: #fff; min-width: 32px; height: 32px; font-size: 12px; font-weight: 600; border-radius: 4px; transition: 0.2s; cursor: pointer; }
          .page-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

          .table-container-fixed { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
          .table-responsive { height: 75vh; overflow: auto; }
          
          .table-fixed-layout { width: auto; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; border-top: 1px solid #e2e8f0; }
          .table-fixed-layout thead th { 
            position: sticky; top: 0; z-index: 10; background: #fff !important; 
            color: #000; font-weight: 900; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #e2e8f0; 
            padding: 10px 15px; font-size: 11px; white-space: nowrap; 
          }
          .table-fixed-layout tbody td { 
            background: #d1d6db77; color: #000; font-size: 12px; padding: 6px 15px; 
            border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; white-space: nowrap;
          }
          .row-hover-effect:hover td { background-color: #e2e8f0 !important; }
          .editing-active td { background-color: #fff9db !important; }

          .form-control-xs { padding: 2px 5px; font-size: 12px; height: 24px; border-radius: 3px; }

          .btn-icon-action { border: none; background: transparent; cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 4px; transition: 0.2s; }
          .btn-icon-action:hover { background: rgba(0,0,0,0.1); }
          .btn-icon-action.save { color: #16a34a; }
          .btn-icon-action.cancel { color: #dc2626; }

          .check-time-text { color: #3a2cf2ff !important; font-family: monospace; }
          .status-tag { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .status-tag.completed { background: #dcfce7; color: #166534; }
          .status-tag.in-process { background: #fef9c3; color: #854d0e; }
          .status-tag.init { background: #f1f5f9; color: #475569; }

          .animate-fade-in { animation: fadeIn 0.3s ease-in; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          .excel-dropdown-custom { min-width: 180px; }
          .list-wrapper { max-height: 200px; overflow-y: auto; }
        `}</style>
      </div>
    </div>
  );
}
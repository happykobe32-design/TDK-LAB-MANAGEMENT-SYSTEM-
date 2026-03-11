import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // 跳轉
 
const API_BASE = `http://${window.location.hostname}:8000`;
 
export default function RunCardListPage({ userRole, handleEdit, handleDelete }) {
  const navigate = useNavigate(); // 初始化 navigate
  const [projects, setProjects] = useState([]);
  const [runCardsData, setRunCardsData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [stressList, setStressList] = useState([]); // 新增：存放 Stress 名稱對照表
 
  // --- 修改重點：Advanced Edit 跳轉邏輯 ---
  const handleAdvancedEdit = (row) => {
    // 帶入所有識別資訊，以便 Create 頁面讀取舊資料進行修改
    const lot = encodeURIComponent(row.lotId);
    const stress = encodeURIComponent(row.stress);
    navigate(`/create?pIdx=${row.pIdx}&runCardId=${row.id}&lotId=${lot}&stress=${stress}`);
  };
 
  // --- 篩選狀態 ---
  const [searchText, setSearchText] = useState("");
  const [quickDateRange, setQuickDateRange] = useState("3m");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [colFilters, setColFilters] = useState({});
  const [colMenuSearch, setColMenuSearch] = useState({});
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
  ];
  const DEFAULT_VISIBLE_COLUMNS = ["status","lotId","stress","qr","owner",];
 
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
 
  const loadData = useCallback(async () => {
    try {
      const [pRes, rRes, tRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/projects/`),
        fetch(`${API_BASE}/run_cards/`),
        fetch(`${API_BASE}/tasks/`),
        fetch(`${API_BASE}/stress/`)
      ]);
 
      const pData = await pRes.json();
      const rData = await rRes.json();
      const tData = await tRes.json();
      const sData = await sRes.json();
     
      setProjects(Array.isArray(pData) ? pData : []);
      setRunCardsData(Array.isArray(rData) ? rData : []);
      setTasksData(Array.isArray(tData) ? tData : []);
      setStressList(Array.isArray(sData) ? sData : []);
    } catch (err) {
      console.error("API Error:", err);
    }
  }, []);
 
  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData();
    }, 30000); 
    return () => clearInterval(timer);
  }, [loadData]);
 
  const allData = useMemo(() => {
    return runCardsData.map(rc => {
      const proj = projects.find(p => p.project_id === rc.project_id) || {};
      const relatedTasks = tasksData.filter(t => t.run_card_id === rc.run_card_id);
      const sortedTasks = [...relatedTasks].sort((a, b) => a.sequence_order - b.sequence_order);

      let dynamicStatus = "Init";
      if (sortedTasks.length > 0) {
        const isAllFinished = sortedTasks.every(t => t.check_out_time || t.status === "SKIPPED");
        const isAnyStarted = sortedTasks.some(t => t.check_in_time || t.status === "SKIPPED");
        if (isAllFinished) dynamicStatus = "Completed";
        else if (isAnyStarted) dynamicStatus = "In-Process";
        else dynamicStatus = "Init";
      }

      const foundStress = stressList.find(s => s.stress_id === rc.stress_id);
      const displayStressName = foundStress ? foundStress.stress : (rc.stress_id || "N/A");
 
      return {
        id: rc.run_card_id,
        pIdx: proj.project_id || "",
        status: dynamicStatus,
        createdDate: rc.created_at ? rc.created_at.split('T')[0] : (proj.created_at ? proj.created_at.split('T')[0] : ""),
        productFamily: proj.product_family || "",
        product: proj.product || "",
        productId: proj.product_id || "",
        version: proj.version || "",
        qr: proj.qr || "",
        sampleSize: proj.sample_size || "",
        owner: proj.owner || "",
        remark: proj.remark || "",
        lotId: rc.lot_id || "",
        stress: displayStressName,
      };
    });
  }, [projects, runCardsData, tasksData, stressList]);
 
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
    return result;
  }, [allData, searchText, startDate, endDate, colFilters]);
 
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
 
  const currentTableData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);
 
  const getUniqueValues = (key) => [...new Set(allData.map(item => String(item[key] || "")))].sort();
 
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
          <button key={start + i} className={`page-btn ${currentPage === (start + i) ? 'active' : ''}`} onClick={() => setCurrentPage(start + i)}>{start + i}</button>
        ))}
        <button className="page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>{">"}</button>
        <button className="page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)}>{">>"}</button>
      </div>
    );
  };
 
  return (
    <div className="main-page bg-white">
      <div className="container-fluid py-4">
 
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
                <li className="dropdown-item py-1 px-2 border-bottom mb-1">
                  <label className="d-flex align-items-center w-100 m-0 fw-bold" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="me-2"
                      style={{ transform: 'scale(0.9)' }}
                      // 判斷是否全部欄位都已勾選
                      checked={Object.values(visibleCols).every(v => v === true)}
                      // 處理全選或全不選邏輯
                      onChange={(e) => {
                        const isAllChecked = e.target.checked;
                        const next = {};
                        columnConfig.forEach(c => next[c.key] = isAllChecked);
                        setVisibleCols(next);
                      }}
                    />
                    <span style={{ fontSize: '12px' }}>Select All</span>
                  </label>
                </li>
                {columnConfig.map(col => (
                  <li key={col.key} className="dropdown-item py-0 px-2 d-flex align-items-center" style={{ height: '15px' }}>
                    <label className="d-flex align-items-center w-100 m-0" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="me-2"
                        style={{ transform: 'scale(1)' }}
                        checked={visibleCols[col.key]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                      />
                      <span style={{ fontSize: '13px' }}>{col.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <button className="action-button-custom btn-reset" onClick={handleReset}>⟳ Reset All</button>
          </div>
          <div className="small text-muted">Found <b className="text-dark">{totalItems}</b> items</div>
        </div>
 
        {/* 表格區 */}
        <div className="table-container-fixed">
          <div className="table-responsive custom-scrollbar">
            <table className="table-fixed-layout">
              <thead>
                <tr>             
                  <th className="text-center" style={{width:'50px'}}>NO.</th>
                  {columnConfig.map(col => {
                    if (!visibleCols[col.key]) return null;
                    const isFiltered = colFilters[col.key] && colFilters[col.key].length > 0;
                    // 修改點 2: 在這裡手動控制每個欄位的寬度
                    let colWidth = '150px'; // 預設寬度
                    if (col.key === 'status') colWidth = '100px';
                    if (col.key === 'createdDate') colWidth = '120px';
                    if (col.key === 'remark') colWidth = '200px';
                   
                    return (
                      <th key={col.key}>
                        <div className="d-flex align-items-center gap-1 justify-content-between">
                          <span className={isFiltered ? "text-warning" : ""}>{col.label}</span>
                          <div className="dropdown" style={{ position: 'static' }}>
                            {/* 修改點 3: 加上 dropdown-menu-end 確保下拉選單不超出右側邊界 */}
                            <span className={`filter-btn-excel ${isFiltered ? 'active' : ''}`} data-bs-toggle="dropdown" data-bs-auto-close="outside">▼</span>
                            <div className="dropdown-menu shadow-lg p-2 excel-dropdown-custom dropdown-menu-end">
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
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  {userRole !== 'technician' &&<th className="text-center" style={{ width: '60px' }}>Edit</th>}
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((r, i) => {
                  return (
                    <tr key={r.id} className="row-hover-effect">
                      <td className="text-center no-cell">{(currentPage - 1) * pageSize + i + 1}</td>
                      {columnConfig.map(col => {
                        if (!visibleCols[col.key]) return null;
                       
                        if (col.key === "status") {
                          return <td key={col.key} className="text-center"><span className={`status-tag ${r.status.toLowerCase()}`}>{r.status}</span></td>;
                        }
                       
                        // 2. 新增的 QR 跳轉邏輯 (含防呆)
                        if (col.key === "qr") {
                          return (
                            <td key={col.key} className="text-center">
                              <span
                                style={{
                                  color: '#3b82f6',
                                  textDecoration: 'underline',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                    // 跳轉時務必帶上 stress 參數，CheckInOutPage 才能接收到
                                    navigate(`/checkinout?pIdx=${r.pIdx}&lotId=${encodeURIComponent(r.lotId)}&stress=${encodeURIComponent(r.stress)}`);
                                }}
                              >
                                {r[col.key] || "(Empty QR)"}
                              </span>
                            </td>
                          );
                        }
 
                        return (
                          <td key={col.key}>
                            <span className={col.key.includes('check') ? 'check-time-text' : ''}>
                              {r[col.key]}
                            </span>
                          </td>
                        );
                      })}
                      {/* 修改點：單列的編輯按鈕根據權限隱藏 */}
                      {userRole !== 'technician' && (
                        <td className="text-center">
                          <div className="d-flex gap-2 justify-content-center">
                            <button
                              className="btn-icon-action advanced-edit"
                              title="Advanced Edit (Add/Delete Steps)"
                              style={{ color: '#3b82f6', fontSize: '11px' }}
                              onClick={() => handleAdvancedEdit(r)}
                            >
                              📝
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {Array.from({ length: Math.max(0, 10 - currentTableData.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="row-empty">
                    <td colSpan="100" style={{ height: '37px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> 
        <style>{`
          /* 頁面整體與容器佈局 */
          .main-page { width: 100%; min-height: 100vh; font-family: sans-serif; }
          .container-fluid { padding-top: 15px !important; padding-bottom: 0px; }

          /* 搜尋列與日期選擇器外觀 */
          .search-wrap { position: relative; }
          .search-icon-fixed { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; }
          .search-bar-custom { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; }
          .date-input-custom { border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; padding: 5px 8px; color: #475569; outline: none; background: #fff; }
 
          /* 欄位選擇與重設按鈕樣式 */
          .action-button-custom { border: 1px solid #f0e7e2ff; background: #fff; padding: 3px 5px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: 0.2s; }
          .action-button-custom:hover { background: #f1f5f9; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .btn-reset-red { color: #dc2626; border-color: #fee2e2; }
 
          /* 分頁按鈕樣式 (數字與左右箭頭) */
          .custom-pagination { display: flex; gap: 0px; }
          .page-btn { border: 1px solid #e2e8f0; background: #fff; min-width: 25px; height: 25px; font-size: 12px; font-weight: 600; border-radius: 4px; transition: 0.2s; cursor: pointer; }
          .page-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
 
          /* 表格外部容器 (控制陰影與表格高度) */
          /* 若下拉選單被切掉，可將此處 overflow 改為 visible */
          .table-container-fixed { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
          .table-responsive { max-height: 70vh; overflow: auto; }
         
          /* 表格本體結構 */
          .table-fixed-layout { width: auto; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; border-top: 0px solid #e2e8f0; }
         
          /* 表格標頭 (可在此調整標頭字體與線條顏色) */
          .table-fixed-layout thead th {
            position: sticky; top: 0; z-index: 10; background: #ffffffff !important;
            color: #000; font-weight: 900;
            border-bottom: 2px solid #fafcffff; /* 標頭橫線 */
            border-right: 1px solid #e2e8f0;  /* 標頭垂直線 */
            padding: 3px 15px; font-size: 11px; white-space: nowrap;
          }
         
          /* 表格資料列 (可在此調整內容字體與線條顏色) */
          .table-fixed-layout tbody td {
            background: #dbd4d177; color: #000; font-size: 10px; padding: 3px 0px;
            border-bottom: 0px solid #e2e8f0; /* 內容橫線 */
            border-right: 0px solid #e2e8f0;  /* 內容垂直線 */
            white-space: nowrap;
          }
         
          /* 滑鼠滑過資料列時的變色效果 */
          .row-hover-effect:hover td { background-color: #e2e8f0 !important; }
 
          /* 操作圖示按鈕 (Edit 鉛筆等) */
          .btn-icon-action { border: none; background: transparent; cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 4px; transition: 0.2s; }
          .btn-icon-action:hover { background: rgba(0,0,0,0.1); }
 
          /* 時間文字顏色與狀態標籤 (Status Tag) 樣式 */
          .check-time-text { color: #3a2cf2ff !important; font-family: monospace; }
          .status-tag { padding: 1px 5px; border-radius: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
          .status-tag.completed { background: #dcfce7; color: #166534; }
          .status-tag.in-process { background: #faf4b1ff; color: #854d0e; }
          .status-tag.init { background: #a2a9b1ff; color: #475569; }
          .status-tag.skipped { background: #ffffffff; /* 灰色背景 */color: #000000ff;}
 
          /* 動態淡入效果 */
          .animate-fade-in { animation: fadeIn 0.3s ease-in; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
 
          /* 捲軸美化 (控制粗細與顏色) */
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
         
          /* Excel 篩選下拉選單寬度與內部捲軸 */
          .excel-dropdown-custom { min-width: 0px; }
          .list-wrapper { max-height: 100px; overflow-y: auto; }
        `}</style>
      </div>
    </div>
  );
}
 
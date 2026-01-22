import React, { useState, useEffect, useMemo, useCallback } from "react";

export default function RunCardListPage() {
  const [allData, setAllData] = useState([]);
  
  // --- 篩選狀態 ---
  const [searchText, setSearchText] = useState(""); 
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
    { key: "stress", label: "Stress" },
    { key: "lotId", label: "LotID" },
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

  const [visibleCols, setVisibleCols] = useState(
    columnConfig.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const loadData = useCallback(() => {
    const config = JSON.parse(localStorage.getItem("config_master") || "{}");
    const familyMap = (config.productFamilies || []).reduce((acc, f) => {
      acc[f.id] = f.name;
      return acc;
    }, {});
    
    const raw = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const flattened = [];

    raw.forEach(proj => {
      const header = proj.header || {};
      const projCreatedDate = header["Created Date"] || proj.createdAt || "";

      (proj.lots || []).forEach(lot => {
        (lot.stresses || []).forEach(stressObj => {
          (stressObj.rowData || []).forEach(row => {
            let stepStatus = "Init";
            if (row.endTime) stepStatus = "Completed";
            else if (row.startTime) stepStatus = "In-Process";

            flattened.push({
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

  const stats = useMemo(() => ({
    total: allData.length,
    active: allData.filter(x => x.status === "In-Process").length,
    done: allData.filter(x => x.status === "Completed").length,
    init: allData.filter(x => x.status === "Init").length
  }), [allData]);

  const filteredRows = useMemo(() => {
    return allData.filter(d => {
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
    setStartDate("");
    setEndDate("");
    setColFilters({});
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
          <div className="d-flex gap-2">
            <div className="dropdown">
              <button className="action-button-custom" data-bs-toggle="dropdown">⚙️ Columns</button>
              <ul className="dropdown-menu shadow-lg p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {columnConfig.map(col => (
                  <li key={col.key} className="dropdown-item py-1">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={visibleCols[col.key]} onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))} id={'vis'+col.key} />
                      <label className="form-check-label w-100 small" htmlFor={'vis'+col.key}>{col.label}</label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <button className="action-button-custom btn-reset-red" onClick={handleReset}>⟳ Reset All</button>
          </div>
          <div className="small text-muted">Found <b className="text-dark">{totalItems}</b> items</div>
        </div>

        {/* 表格區 */}
        <div className="table-container-fixed shadow-sm">
          <div className="table-responsive custom-scrollbar">
            <table className="table-fixed-layout">
              <thead>
                <tr>
                  <th className="text-center" style={{width:'50px'}}>NO.</th>
                  {columnConfig.map(col => {
                    if (!visibleCols[col.key]) return null;
                    const isFiltered = colFilters[col.key] && colFilters[col.key].length > 0;
                    return (
                      <th key={col.key}>
                        <span className={isFiltered ? "text-warning" : ""}>{col.label}</span>
                        <span className="dropdown">
                          <span className={`filter-btn-icon ${isFiltered ? 'active' : ''}`} data-bs-toggle="dropdown" data-bs-auto-close="outside">▼</span>
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
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((r, i) => (
                  <tr key={i} className="row-hover-effect">
                    <td className="text-center no-cell">{(currentPage - 1) * pageSize + i + 1}</td>
                    {visibleCols.status && <td className="text-center"><span className={`status-tag ${r.status.toLowerCase()}`}>{r.status}</span></td>}
                    {visibleCols.createdDate && <td>{r.createdDate}</td>}
                    {visibleCols.productFamily && <td>{r.productFamily}</td>}
                    {visibleCols.product && <td>{r.product}</td>}
                    {visibleCols.productId && <td>{r.productId}</td>}
                    {visibleCols.version && <td>{r.version}</td>}
                    {visibleCols.qr && <td>{r.qr}</td>}
                    {visibleCols.sampleSize && <td>{r.sampleSize}</td>}
                    {visibleCols.owner && <td>{r.owner}</td>}
                    {visibleCols.remark && <td className="text-truncate" style={{maxWidth: '120px'}}>{r.remark}</td>}
                    {visibleCols.stress && <td>{r.stress}</td>}
                    {visibleCols.lotId && <td>{r.lotId}</td>}
                    {visibleCols.type && <td>{r.type}</td>}
                    {visibleCols.operation && <td>{r.operation}</td>}
                    {visibleCols.condition && <td>{r.condition}</td>}
                    {visibleCols.programName && <td>{r.programName}</td>}
                    {visibleCols.testProgram && <td>{r.testProgram}</td>}
                    {visibleCols.testScript && <td>{r.testScript}</td>}
                    {visibleCols.checkIn && <td className="check-time-text">{r.checkIn}</td>}
                    {visibleCols.checkOut && <td className="check-time-text">{r.checkOut}</td>}
                    {visibleCols.qty && <td>{r.qty}</td>}
                    {visibleCols.hardware && <td>{r.hardware}</td>}
                    {visibleCols.note && <td className="text-truncate" style={{maxWidth: '120px'}} title={r.note}>{r.note}</td>}
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 20 - currentTableData.length) }).map((_, idx) => (
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
          .container-fluid {
            padding-top: 0px !important; /* 數值越小越靠上 */
            padding-bottom: 0px;
          }

          /* 統計框 - 縮小高度 */
          .stats-box { background: #f8fafc; padding: 2px 5px; border-radius: 4px; }
          .stats-title { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
          .stats-num { font-size: 18px; font-weight: 700; }

          /* 搜尋 bar */
          .search-wrap { position: relative; }
          .search-icon-fixed { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; }
          .search-bar-custom { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; }
          .date-input-custom { border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; padding: 5px 8px; color: #475569; outline: none; }

          /* 按鈕與 Hover */
          .action-button-custom { border: 1px solid #e2e8f0; background: #fff; padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: 0.2s; }
          .action-button-custom:hover { background: #f1f5f9; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .btn-reset-red { color: #dc2626; border-color: #fee2e2; }
          .btn-reset-red:hover { background: #fef2f2; }

          /* 分頁 */
          .custom-pagination { display: flex; gap: 4px; }
          .page-btn { border: 1px solid #e2e8f0; background: #fff; min-width: 32px; height: 32px; font-size: 12px; font-weight: 600; border-radius: 4px; transition: 0.2s; cursor: pointer; }
          .page-btn:hover:not(:disabled) { background: #f1f5f9; }
          .page-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

          /* 表格區 - 統一使用 #e2e8f0 灰色邊框 */
          .table-container-fixed { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; overflow: hidden; }
          .table-responsive { height: 78vh; overflow: auto; }
          
          /* 備註：width: auto 與 table-layout: auto 讓欄位根據內容撐開 */
          .table-fixed-layout { 
            width: auto; 
            min-width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            table-layout: auto; 
            border-top: 1px solid #e2e8f0;
          }

          /* 表頭灰線與不換行 */
          .table-fixed-layout thead th { 
            position: sticky; top: 0; z-index: 10; background: #fff !important; 
            color: #000; font-weight: 900; 
            border-bottom: 1px solid #e2e8f0; 
            border-right: 1px solid #e2e8f0; 
            padding: 10px 15px; font-size: 11px;
            white-space: nowrap; 
          }

          /* 資料列灰線與內容撐開 */
          .table-fixed-layout tbody td { 
            background: #d1d6db77; color: #000; font-size: 12px; 
            padding: 6px 15px; 
            border-bottom: 1px solid #e2e8f0; 
            border-right: 1px solid #e2e8f0;
            white-space: nowrap;
          }
          .row-hover-effect:hover td { background-color: #e2e8f0 !important; }


          .check-time-text { color: #3a2cf2ff !important; font-family: monospace; }

          .status-tag { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .status-tag.completed { background: #dcfce7; color: #166534; }
          .status-tag.in-process { background: #fef9c3; color: #854d0e; }
          .status-tag.init { background: #f1f5f9; color: #475569; }

          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        `}</style>
      </div>
    </div>
  );
}
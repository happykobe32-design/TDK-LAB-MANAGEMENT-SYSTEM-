import React, { useState, useEffect, useMemo, useCallback } from "react";

export default function RunCardListPage() {
  const [allData, setAllData] = useState([]);
  
  // --- 篩選狀態 ---
  const [searchText, setSearchText] = useState(""); // 全域搜尋
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Excel 風格勾選篩選
  const [colFilters, setColFilters] = useState({});
  const [colMenuSearch, setColMenuSearch] = useState({}); 

  // --- 分頁狀態 ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // --- 欄位顯示控制 (依要求順序) ---
  const columnConfig = [
    { key: "status", label: "Status" },
    { key: "createdDate", label: "CREATEDDATE" },
    { key: "family", label: "Product Family" },
    { key: "product", label: "Product" },
    { key: "pid", label: "Product ID" },
    { key: "ver", label: "VERSION" },
    { key: "qrSize", label: "QR SAMPLE SIZE" },
    { key: "owner", label: "OWNER" },
    { key: "remark", label: "REMARK" },
    { key: "stress", label: "Stress" },
    { key: "lotId", label: "LotID" },
    { key: "type", label: "Type" },
    { key: "op", label: "Operation" },
    { key: "cond", label: "Condition" },
    { key: "progName", label: "Program Name" },
    { key: "testProg", label: "Test Program" },
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
              family: header["Product Family"] || "",
              product: header["Product"] || "",
              pid: header["Product ID"] || "",
              ver: header["VERSION"] || "",
              qrSize: header["QR SAMPLE SIZE"] || "",
              owner: header["Owner"] || "",
              remark: header["REMARK"] || "",
              stress: stressObj.stress || "",
              lotId: lot.lotId || "",
              type: row.type || "",
              op: row.operation || "",
              cond: row.condition || "",
              progName: row.programName || "",
              testProg: row.testProgram || "",
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
      const matchDate = (!startDate || d.createdDate >= startDate) && (!endDate || d.createdDate <= endDate);
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
    const vals = [...new Set(allData.map(item => String(item[key] || "")))].sort();
    return vals;
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

  return (
    <div className="container-fluid py-2 bg-light min-vh-100">
      
      {/* 1. 最上方圖表字卡 (統計數字) */}
      <div className="row g-2 mb-2">
        {[
          { label: "Total", val: stats.total, color: "primary" },
          { label: "Completed", val: stats.done, color: "success" },
          { label: "In-Process", val: stats.active, color: "warning" },
          { label: "Init", val: stats.init, color: "secondary"}
        ].map((item, i) => (
          <div key={i} className="col-3">
            <div className={`card shadow-sm border-0 border-start border-3 border-${item.color}`}>
              <div className="card-body py-1 px-3">
                <div className="text-muted small fw-bold" style={{fontSize:'10px'}}>{item.label}</div>
                <div className="h6 mb-0 fw-bold">{item.val}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. 控制列：搜尋與日期 */}
      <div className="card shadow-sm border-0 mb-2">
        <div className="card-body p-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <input 
                type="text" className="form-control form-control-sm" 
                placeholder="🔍 Search all fields..." 
                value={searchText} onChange={e => {setSearchText(e.target.value); setCurrentPage(1);}} 
              />
            </div>
            <div className="col-md-5 d-flex align-items-center gap-1">
              <span className="small text-muted text-nowrap">CREATEDDATE:</span>
              <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-muted">~</span>
              <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col-md-3 text-end">
              <div className="dropdown d-inline-block me-2">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">⚙️ Columns</button>
                <ul className="dropdown-menu dropdown-menu-end shadow p-2" style={{ maxHeight: '400px', overflowY: 'auto', zIndex: 1100 }}>
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
              <button className="btn btn-sm btn-outline-danger" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 分頁 */}
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
        <div className="small text-muted">Showing <b>{currentTableData.length}</b> records</div>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-white border" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
          <button className="btn btn-primary px-3" disabled>{currentPage} / {totalPages || 1}</button>
          <button className="btn btn-white border" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {/* 4. 表格 (固定長度且選單同步滾動) */}
      <div className="card shadow-sm border-0 main-table-container">
        <div className="table-responsive custom-scrollbar">
          <table className="table table-sm table-hover table-bordered mb-0 align-middle">
            <thead className="table-dark sticky-top">
              <tr className="text-nowrap" style={{ fontSize: '11px' }}>
                <th className="text-center" style={{width:'40px'}}>#</th>
                {columnConfig.map(col => {
                  if (!visibleCols[col.key]) return null;
                  const isFiltered = colFilters[col.key] && colFilters[col.key].length > 0;
                  return (
                    <th key={col.key} className="position-relative">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className={isFiltered ? "text-warning" : ""}>{col.label}</span>
                        <div className="dropdown ms-1">
                          <span className={`filter-icon ${isFiltered ? 'active' : ''}`} data-bs-toggle="dropdown" data-bs-auto-close="outside">▼</span>
                          <div className="dropdown-menu shadow p-2 excel-dropdown">
                            <input 
                              type="text" className="form-control form-control-sm mb-2" 
                              placeholder="Search..." 
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setColMenuSearch(prev => ({...prev, [col.key]: e.target.value}))}
                            />
                            <div className="list-container">
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
                            <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => setColFilters(prev => ({...prev, [col.key]: []}))}>Clear All</button>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody style={{ fontSize: '11.5px' }}>
              {currentTableData.map((r, i) => (
                <tr key={i} className="text-nowrap">
                  <td className="text-center text-muted bg-light">{(currentPage - 1) * pageSize + i + 1}</td>
                  {visibleCols.status && <td className="text-center"><span className={`badge rounded-pill bg-${r.status==='Completed'?'success':(r.status==='In-Process'?'warning':'secondary')} text-dark`} style={{fontSize:'10px'}}>{r.status}</span></td>}
                  {visibleCols.createdDate && <td>{r.createdDate}</td>}
                  {visibleCols.family && <td>{r.family}</td>}
                  {visibleCols.product && <td>{r.product}</td>}
                  {visibleCols.pid && <td className="fw-bold text-primary">{r.pid}</td>}
                  {visibleCols.ver && <td>{r.ver}</td>}
                  {visibleCols.qrSize && <td>{r.qrSize}</td>}
                  {visibleCols.owner && <td>{r.owner}</td>}
                  {visibleCols.remark && <td className="small text-muted">{r.remark}</td>}
                  {visibleCols.stress && <td>{r.stress}</td>}
                  {visibleCols.lotId && <td className="fw-bold">{r.lotId}</td>}
                  {visibleCols.type && <td>{r.type}</td>}
                  {visibleCols.op && <td>{r.op}</td>}
                  {visibleCols.cond && <td className="text-muted">{r.cond}</td>}
                  {visibleCols.progName && <td>{r.progName}</td>}
                  {visibleCols.testProg && <td>{r.testProg}</td>}
                  {visibleCols.testScript && <td>{r.testScript}</td>}
                  {visibleCols.checkIn && <td className="text-primary">{r.checkIn}</td>}
                  {visibleCols.checkOut && <td className="text-success">{r.checkOut}</td>}
                  {visibleCols.qty && <td>{r.qty}</td>}
                  {visibleCols.hardware && <td>{r.hardware}</td>}
                  {visibleCols.note && <td className="text-truncate" style={{ maxWidth: '120px' }} title={r.note}>{r.note}</td>}
                </tr>
              ))}
              {/* 填充空白行以維持高度，確保表格長度固定 */}
              {Array.from({ length: Math.max(0, 15 - currentTableData.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`} style={{ height: '33px' }}>
                  <td colSpan="100" className="bg-light border-0"></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div className="text-center p-5 text-muted">No records found.</div>}
        </div>
      </div>

      <style>{`
        .main-table-container { 
          min-height: 70vh; 
          background: #fff;
        }
        .table-responsive { 
          height: 70vh; 
          overflow: visible !important; /* 關鍵：讓選單可以顯示出來 */
          overflow-x: auto !important;
          overflow-y: auto !important;
        }
        
        /* 解決選單隨滾輪移動問題：改用 absolute 定位並確保父層有 position-relative */
        .excel-dropdown { 
          position: absolute !important; 
          top: 100%;
          right: 0;
          min-width: 220px; 
          z-index: 1050; 
          margin-top: 5px;
          display: none;
        }
        .dropdown.show .excel-dropdown {
          display: block;
        }

        .list-container { max-height: 250px; overflow-y: auto; overflow-x: hidden; }
        .filter-icon { font-size: 9px; cursor: pointer; color: #888; padding: 2px 4px; border-radius: 3px; }
        .filter-icon:hover { background: rgba(255,255,255,0.2); }
        .filter-icon.active { color: #ffc107; font-weight: bold; }
        
        .table-dark th { border-bottom: none !important; position: sticky; top: 0; z-index: 10; }
        .sticky-top { top: 0; z-index: 100; }
        .btn-white { background: white; }
        
        /* 確保表格容器在資料少時仍維持高度 */
        .table { min-width: 100%; }
      `}</style>
    </div>
  );
}
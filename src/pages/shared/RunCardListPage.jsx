import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ViewSearchPage({ userRole, handleEdit, handleDelete }) {
  const [allProjects, setAllProjects] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLot, setSelectedLot] = useState(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const masterRows = [];
    data.forEach(proj => {
      const createdDate = proj.header["Created Date"] || proj.createdAt || "";
      proj.lots.forEach(lot => {
        const allRows = lot.stresses.flatMap(s => s.rowData);
        const isAllDone = allRows.length > 0 && allRows.every(r => r.endTime && r.endTime !== "");
        const isAnyStarted = allRows.some(r => r.startTime && r.startTime !== "");
        
        let lotStatus = "Init";
        if (isAllDone && allRows.length > 0) lotStatus = "completed";
        else if (isAnyStarted) lotStatus = "in-process";

        masterRows.push({
          projectId: proj.header["Product ID"],
          product: proj.header["Product"],
          owner: proj.header["Owner"],
          createdDate: createdDate,
          lotId: lot.lotId,
          status: lotStatus,
          stresses: lot.stresses,
          totalSteps: allRows.length,
          completedSteps: allRows.filter(r => r.endTime).length,
          passRate: allRows.length > 0 ? Math.round((allRows.filter(r => r.endTime).length / allRows.length) * 100) : 0
        });
      });
    });
    setAllProjects(masterRows);
  }, []);

  const columnDefs = useMemo(() => {
    const cols = [
      { 
        headerName: "Status", 
        field: "status", 
        width: 120,
        cellRenderer: (p) => {
          const colors = {
            'completed': { bg: '#d1fae5', text: '#065f46', label: '✓ COMPLETED' },
            'in-process': { bg: '#ffedd5', text: '#9a3412', label: '⟳ IN-PROCESS' },
            'Init': { bg: '#f1f5f9', text: '#64748b', label: '○ INIT' }
          };
          const config = colors[p.value] || colors['Init'];
          return (
            <span style={{ backgroundColor: config.bg, color: config.text, padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
              {config.label}
            </span>
          );
        }
      },
      { headerName: "Product ID", field: "projectId", width: 130 },
      { headerName: "Lot ID", field: "lotId", width: 130 },
      { headerName: "Product", field: "product", width: 120 },
      { headerName: "Owner", field: "owner", width: 110 },
      {
        headerName: "Progress",
        width: 130,
        cellRenderer: (params) => {
          const { totalSteps, completedSteps } = params.data;
          const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: percent === 100 ? '#10b981' : '#f59e0b', transition: 'width 0.3s' }}></div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', minWidth: '35px' }}>{percent}%</span>
            </div>
          );
        }
      },
      { 
        headerName: "Created Date", 
        field: "createdDate", 
        width: 150 
      },
      { 
        headerName: "Action", 
        width: 100,
        cellRenderer: (params) => (
          <button
            className="detail-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLot(params.data);
            }}
          >
            Details ➜
          </button>
        )
      }
    ];

    // Admin 用户添加编辑和删除按钮
    if (userRole === "admin") {
      cols.push({
        headerName: "Manage",
        width: 160,
        cellRenderer: (params) => (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(params.data.projectId);
              }}
              title="Edit project"
            >
              ✏️ Edit
            </button>
            <button
              className="btn-delete"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`确认删除项目 ${params.data.projectId}?`)) {
                  handleDelete(params.data.projectId);
                  const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
                  const updatedData = data.filter(proj => proj.header["Product ID"] !== params.data.projectId);
                  localStorage.setItem("all_projects", JSON.stringify(updatedData));
                  window.location.reload();
                }
              }}
              title="Delete project"
            >
              🗑️ Delete
            </button>
          </div>
        )
      });
    }

    return cols;
  }, [userRole, handleEdit, handleDelete]);

  // 获取过滤后的数据
  const filteredData = useMemo(() => {
    return allProjects.filter(item => {
      const matchesSearch = 
        item.projectId.toLowerCase().includes(searchText.toLowerCase()) ||
        item.lotId.toLowerCase().includes(searchText.toLowerCase()) ||
        item.product.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesOwner = ownerFilter === "all" || item.owner === ownerFilter;
      const matchesProduct = productFilter === "all" || item.product === productFilter;
      
      // 日期过滤
      let matchesDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(item.createdDate).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (itemDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end.getTime()) matchesDate = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesOwner && matchesProduct && matchesDate;
    });
  }, [allProjects, searchText, statusFilter, ownerFilter, productFilter, startDate, endDate]);

  // 获取统计数据
  const statistics = useMemo(() => {
    const total = filteredData.length;
    const completed = filteredData.filter(p => p.status === 'completed').length;
    const inProcess = filteredData.filter(p => p.status === 'in-process').length;
    const init = filteredData.filter(p => p.status === 'Init').length;
    const totalSteps = filteredData.reduce((sum, p) => sum + p.totalSteps, 0);
    const completedSteps = filteredData.reduce((sum, p) => sum + p.completedSteps, 0);
    const passRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return { total, completed, inProcess, init, passRate, totalSteps, completedSteps };
  }, [filteredData]);

  // 全局卡片统计数据（不受过滤影响）
  const cardStatistics = useMemo(() => {
    const total = allProjects.length;
    const completed = allProjects.filter(p => p.status === 'completed').length;
    const inProcess = allProjects.filter(p => p.status === 'in-process').length;
    const init = allProjects.filter(p => p.status === 'Init').length;
    
    return { total, completed, inProcess, init };
  }, [allProjects]);

  // 全局统计数据（不受过滤影响）
  const globalStatistics = useMemo(() => {
    const totalSteps = allProjects.reduce((sum, p) => sum + p.totalSteps, 0);
    const completedSteps = allProjects.reduce((sum, p) => sum + p.completedSteps, 0);
    const passRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return { passRate, totalSteps, completedSteps };
  }, [allProjects]);

  // 获取下拉选项
  const owners = useMemo(() => {
    const unique = [...new Set(allProjects.map(p => p.owner))];
    return unique.sort();
  }, [allProjects]);

  const products = useMemo(() => {
    const unique = [...new Set(allProjects.map(p => p.product))];
    return unique.sort();
  }, [allProjects]);

  // 导出为 CSV
  const handleExportCSV = () => {
    const headers = ['Product ID', 'Lot ID', 'Product', 'Owner', 'Status', 'Progress', 'Created Date'];
    const rows = filteredData.map(p => [
      p.projectId,
      p.lotId,
      p.product,
      p.owner,
      p.status.toUpperCase(),
      `${p.completedSteps}/${p.totalSteps}`,
      p.createdDate
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // 重置过滤器
  const handleResetFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setOwnerFilter("all");
    setProductFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const onRowClicked = (event) => {
    // 移除此功能，仅通过 Details 按钮打开
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f0f4f8', overflow: 'hidden', flexDirection: 'column' }}>
      
      {/* ============ 頂部統計摘要區 ============ */}
      <div style={{ background: 'white', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '0px' }}>
          <div 
            className="kpi-card"
            onClick={() => setStatusFilter("all")}
            style={{ cursor: 'pointer', opacity: statusFilter === "all" ? 1 : 0.6, borderColor: statusFilter === "all" ? '#3b82f6' : '#e2e8f0', borderWidth: statusFilter === "all" ? '2px' : '1px' }}
          >
            <div className="kpi-label">Total Tests</div>
            <div className="kpi-value">{cardStatistics.total}</div>
          </div>
          <div 
            className="kpi-card"
            onClick={() => setStatusFilter("completed")}
            style={{ cursor: 'pointer', opacity: statusFilter === "completed" ? 1 : 0.6, borderColor: statusFilter === "completed" ? '#10b981' : '#e2e8f0', borderWidth: statusFilter === "completed" ? '2px' : '1px' }}
          >
            <div className="kpi-label">Completed</div>
            <div className="kpi-value" style={{ color: '#10b981' }}>{cardStatistics.completed}</div>
          </div>
          <div 
            className="kpi-card"
            onClick={() => setStatusFilter("in-process")}
            style={{ cursor: 'pointer', opacity: statusFilter === "in-process" ? 1 : 0.6, borderColor: statusFilter === "in-process" ? '#f59e0b' : '#e2e8f0', borderWidth: statusFilter === "in-process" ? '2px' : '1px' }}
          >
            <div className="kpi-label">In-Process</div>
            <div className="kpi-value" style={{ color: '#f59e0b' }}>{cardStatistics.inProcess}</div>
          </div>
          <div 
            className="kpi-card"
            onClick={() => setStatusFilter("Init")}
            style={{ cursor: 'pointer', opacity: statusFilter === "Init" ? 1 : 0.6, borderColor: statusFilter === "Init" ? '#64748b' : '#e2e8f0', borderWidth: statusFilter === "Init" ? '2px' : '1px' }}
          >
            <div className="kpi-label">Init</div>
            <div className="kpi-value" style={{ color: '#94a3b8' }}>{cardStatistics.init}</div>
          </div>
          <div 
            className="kpi-card"
            style={{ cursor: 'default' }}
          >
            <div className="kpi-label">Pass Rate</div>
            <div className="kpi-value" style={{ color: '#3b82f6' }}>{globalStatistics.passRate}%</div>
          </div>
          <div 
            className="kpi-card"
            style={{ cursor: 'default' }}
          >
            <div className="kpi-label">Total Steps</div>
            <div className="kpi-value">{globalStatistics.completedSteps}/{globalStatistics.totalSteps}</div>
          </div>
        </div>
      </div>

      {/* ============ 搜索與篩選區域 ============ */}
      <div style={{ background: 'white', padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* 搜尋欄 */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
              🔍 Search (ID / Product / Owner)
            </label>
            <input
              type="text"
              placeholder="Search Project, Lot, or Product..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          {/* 進階篩選按鈕 */}
          <button 
            className="filter-toggle-btn"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            style={{ background: showAdvancedFilter ? '#3b82f6' : '#f1f5f9', color: showAdvancedFilter ? 'white' : '#475569' }}
          >
            ⚙️ Advanced
          </button>

          {/* 重置按鈕 */}
          <button 
            className="reset-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            ⟲ Reset
          </button>
        </div>

        {/* 進階篩選面板 */}
        {showAdvancedFilter && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Owner</label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="all">All Owners</option>
                {owners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Product</label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="all">All Products</option>
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ============ 主要表格區域 ============ */}
      <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
        {/* 左側表格 */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>
            📊 Showing {filteredData.length} of {allProjects.length} tests
          </div>
          <div className="ag-theme-alpine compact-grid" style={{ flex: 1, width: '100%' }}>
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, resizable: true, filter: false, flex: 1 }}
              pagination={true}
              paginationPageSize={40}
              rowHeight={44}
              headerHeight={40}
              rowClass="grid-row"
              onRowClicked={onRowClicked}
            />
          </div>
        </div>

        {/* 右側詳細側邊欄 */}
        {selectedLot && (
          <div className="detail-sidebar">
            <div className="sidebar-header">
              <div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>📋 LOT DETAILS</div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedLot.lotId}</h3>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '6px' }}>Product: <strong>{selectedLot.projectId}</strong></div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>Owner: <strong>{selectedLot.owner}</strong></div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>Created: <strong>{selectedLot.createdDate}</strong></div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                  Progress: <strong>{selectedLot.completedSteps}/{selectedLot.totalSteps}</strong>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedLot(null)}>×</button>
            </div>
            
            <div className="sidebar-content">
              {selectedLot.stresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>No stress data</div>
                  <div style={{ fontSize: '12px' }}>This lot has no stress tests yet.</div>
                </div>
              ) : (
                selectedLot.stresses.map((s, idx) => (
                  <div key={idx} className="stress-card">
                    <div className="stress-title">
                      🔬 Stress: {s.stress}
                    </div>
                    {s.rowData && s.rowData.length > 0 ? (
                      s.rowData.map((row, rIdx) => (
                        <div key={rIdx} className="step-item">
                          <div className="step-row">
                            <span className="op-text">{row.operation}</span>
                            <span className={row.endTime ? 'status-tag finished' : 'status-tag pending'}>
                              {row.endTime ? '✓ Finished' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="cond-text">Condition: {row.condition}</div>
                          <div className="time-row">
                            <span>📍 In: {row.startTime || '-'}</span>
                            <span>📍 Out: {row.endTime || '-'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px 15px', color: '#94a3b8', fontSize: '12px' }}>No steps recorded</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* KPI 卡片 */
        .kpi-card {
          background: linear-gradient(135deg, #f8fafc 0%, #eef2f5 100%);
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: all 0.3s;
        }
        .kpi-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }
        .kpi-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-value {
          font-size: 20px;
          font-weight: bold;
          color: #1e293b;
        }

        /* 篩選按鈕 */
        .filter-btn, .filter-toggle-btn, .export-btn, .reset-btn {
          padding: 8px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-btn:hover, .filter-toggle-btn:hover, .export-btn:hover, .reset-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .filter-toggle-btn {
          border: none;
        }
        .export-btn {
          background: #10b981;
          color: white;
          border: none;
        }
        .reset-btn {
          background: #94a3b8;
          color: white;
          border: none;
        }

        /* 表格格線優化 */
        .compact-grid .ag-cell {
          border-right: 1px solid #e2e8f0 !important;
          display: flex;
          align-items: center;
        }
        .compact-grid .ag-header-cell {
          border-right: 1px solid #cbd5e1 !important;
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          font-weight: 700;
          color: #334155;
        }
        .compact-grid .ag-row {
          border-bottom: 1px solid #e2e8f0 !important;
          transition: background-color 0.2s;
        }
        .compact-grid .ag-row:hover {
          background-color: #f8fafc !important;
        }
        .grid-row:hover {
          background-color: #f0f4f8 !important;
        }

        /* 詳細按鈕 */
        .detail-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .detail-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        /* 管理按鈕 */
        .btn-edit, .btn-delete {
          padding: 6px 10px;
          border: none;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-edit {
          background: #3b82f6;
          color: white;
        }
        .btn-edit:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .btn-delete {
          background: #ef4444;
          color: white;
        }
        .btn-delete:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        /* 側邊欄樣式 */
        .detail-sidebar {
          width: 330px;
          background: white;
          box-shadow: -5px 0 25px rgba(0,0,0,0.12);
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .sidebar-header {
          padding: 18px 20px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
        }
        .close-btn {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 24px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.25);
          transform: rotate(90deg);
        }
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f8fafc;
        }
        .stress-card {
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          transition: all 0.2s;
        }
        .stress-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }
        .stress-title {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 12px 15px;
          font-weight: 700;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 2px solid #cbd5e1;
        }
        .step-item {
          padding: 12px 15px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }
        .step-item:last-child {
          border-bottom: none;
        }
        .step-item:hover {
          background: #f8fafc;
        }
        .step-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .op-text { 
          font-weight: 600; 
          color: #1e293b; 
          font-size: 12px; 
        }
        .status-tag { 
          font-size: 11px; 
          padding: 3px 8px; 
          border-radius: 12px; 
          font-weight: 700;
        }
        .status-tag.finished { 
          background: #d1fae5; 
          color: #065f46; 
        }
        .status-tag.pending { 
          background: #ffedd5; 
          color: #9a3412; 
        }
        .cond-text { 
          color: #64748b; 
          font-size: 11px; 
          margin-bottom: 6px; 
          font-weight: 500;
        }
        .time-row { 
          display: flex; 
          gap: 16px; 
          font-size: 10px; 
          color: #94a3b8;
          margin-top: 6px;
        }

        /* 滾動條美化 */
        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-content::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .sidebar-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
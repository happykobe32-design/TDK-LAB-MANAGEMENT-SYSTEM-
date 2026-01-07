import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ViewSearchPage({ userRole, handleEdit, handleDelete }) {
  const [allProjects, setAllProjects] = useState([]);
  const [searchText, setSearchText] = useState("");
  // 控制側邊欄的狀態，初始值為 null，保證一開始不會渲染右側元件
  const [selectedLot, setSelectedLot] = useState(null);

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
          completedSteps: allRows.filter(r => r.endTime).length
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
        width: 95,
        cellRenderer: (p) => {
          const colors = {
            'completed': { bg: '#d1fae5', text: '#065f46', label: 'COMPLETED' },
            'in-process': { bg: '#ffedd5', text: '#9a3412', label: 'IN-PROCESS' },
            'Init': { bg: '#f1f5f9', text: '#64748b', label: 'INIT' }
          };
          const config = colors[p.value] || colors['Init'];
          return (
            <span style={{ backgroundColor: config.bg, color: config.text, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
              {config.label}
            </span>
          );
        }
      },
      { headerName: "Product ID", field: "projectId", width: 100 },
      { headerName: "Lot ID", field: "lotId", width: 100 },
      { headerName: "Owner", field: "owner", width: 80 },
      { 
        headerName: "Created Date", 
        field: "createdDate", 
        width: 130 
      },
      { 
        headerName: "Action", 
        width: 90,
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
        width: 120,
        cellRenderer: (params) => (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              className="btn btn-sm btn-info"
              style={{ padding: '2px 8px', fontSize: '11px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(params.data.projectId);
              }}
              title="Edit project"
            >
              ✏️ Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              style={{ padding: '2px 8px', fontSize: '11px' }}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`确认删除项目 ${params.data.projectId}?`)) {
                  handleDelete(params.data.projectId);
                  // 重新加载列表
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
  }, [userRole, handleEdit, handleDelete, setSelectedLot]);

  const onRowClicked = (event) => {
    // 移除此功能，仅通过 Details 按钮打开
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* 左側表格區：當 selectedLot 為 null 時，flex 為 1 會佔滿全寬 */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="ag-theme-alpine compact-grid" style={{ flex: 1, width: '100%' }}>
          <AgGridReact
            rowData={allProjects}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 1 }}
            quickFilterText={searchText}
            pagination={true}
            paginationPageSize={25}
            rowHeight={32}
            headerHeight={36}
          />
        </div>
      </div>

      {/* 右側側邊欄：只有選取資料時才會「出現在 DOM 中」並擠開空間 */}
      {selectedLot && (
        <div className="detail-sidebar">
          <div className="sidebar-header">
            <div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>LOT DETAILS</div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedLot.lotId}</h3>
              <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>Product: {selectedLot.projectId}</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>Owner: {selectedLot.owner}</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>Created: {selectedLot.createdDate}</div>
            </div>
            <button className="close-btn" onClick={() => setSelectedLot(null)}>×</button>
          </div>
          
          <div className="sidebar-content">
            {selectedLot.stresses.map((s, idx) => (
              <div key={idx} className="stress-card">
                <div className="stress-title">
                  Stress: {s.stress}
                </div>
                {s.rowData.map((row, rIdx) => (
                  <div key={rIdx} className="step-item">
                    <div className="step-row">
                      <span className="op-text">{row.operation}</span>
                      <span className={row.endTime ? 'status-tag finished' : 'status-tag pending'}>
                        {row.endTime ? 'Finished' : 'Pending'}
                      </span>
                    </div>
                    <div className="cond-text">Condition: {row.condition}</div>
                    <div className="time-row">
                      <span>In: {row.startTime || '-'}</span>
                      <span>Out: {row.endTime || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        /* 表格格線優化 */
        .compact-grid .ag-cell {
          border-right: 1px solid #e2e8f0 !important;
          display: flex;
          align-items: center;
        }
        .compact-grid .ag-header-cell {
          border-right: 1px solid #cbd5e1 !important;
          background-color: #f1f5f9;
        }
        .compact-grid .ag-row {
          border-bottom: 1px solid #e2e8f0 !important;
          transition: background-color 0.2s;
        }
        .detail-link {
          color: #3b82f6;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
        }
        .detail-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .detail-btn:hover {
          background: #2563eb;
        }

        /* 側邊欄樣式 */
        .detail-sidebar {
          width: 420px;
          background: white;
          box-shadow: -5px 0 20px rgba(0,0,0,0.1);
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .sidebar-header {
          padding: 15px 20px;
          background: #1e293b;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .close-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
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
          margin-bottom: 15px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .stress-title {
          background: #f1f5f9;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }
        .step-item {
          padding: 12px 15px;
          border-bottom: 1px solid #f1f5f9;
        }
        .step-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .op-text { font-weight: 500; color: #1e293b; font-size: 13px; }
        .status-tag { font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: bold; }
        .status-tag.finished { background: #d1fae5; color: #065f46; }
        .status-tag.pending { background: #ffedd5; color: #9a3412; }
        .cond-text { color: #64748b; font-size: 11px; margin-bottom: 4px; }
        .time-row { display: flex; gap: 15px; font-size: 10px; color: #94a3b8; }
      `}</style>
    </div>
  );
}
import React, { useState } from "react";
import { 
  ShieldCheck, Users, Activity, Clock, 
  UserCheck, AlertTriangle, ExternalLink, Search, Filter 
} from "lucide-react";

export default function PermissionMaintenancePage() {
  /* =====================================================
     Section 1 - 角色權限矩陣 (依據規劃書角色定義)
     ===================================================== */
  const ROLE_MATRIX = [
    { feature: "Create Project (Runcard)", admin: true, engineer: true, technician: false },
    { feature: "Stress Test Setup", admin: true, engineer: "Limited", technician: false },
    { feature: "Standard Check-In / Out", admin: true, engineer: "Backup", technician: true },
    { feature: "Abnormal Data Unlock", admin: true, engineer: true, technician: false },
    { feature: "Permission & Config Edit", admin: true, engineer: false, technician: false },
  ];

  /* =====================================================
     Section 2 - 用戶與責任管理 (加入 Last Known Task)
     ===================================================== */
  const [users, setUsers] = useState([
    { id: "admin_01", name: "System Admin", role: "admin", active: true, lastTask: "System Config" },
    { id: "eng_wang", name: "Wang (Lead)", role: "engineer", active: true, lastTask: "PJT-Stress-001" },
    { id: "tech_john", name: "John Doe", role: "technician", active: true, lastTask: "PJT-Stress-001" },
  ]);

  /* =====================================================
     Section 3 - 高細節原子級稽核日誌 (核心抓錯區)
     ===================================================== */
  const [logs] = useState([
    { 
      time: "2026-01-12 14:05:12.450", 
      project: "PJT-Stress-001", 
      step: "High-Temp Stress", 
      action: "CHECK-OUT", 
      operator: "tech_john", 
      owner: "eng_wang", // 關聯創建專案的工程師
      status: "Success",
      eqID: "EQ-HT-04" 
    },
    { 
      time: "2026-01-12 16:30:05.112", 
      project: "PJT-Stress-001", 
      step: "High-Temp Stress", 
      action: "CHECK-IN", 
      operator: "tech_john", 
      owner: "eng_wang", 
      status: "Error", 
      note: "Temp fluctuation > 5°C", // 紀錄報警原因
      eqID: "EQ-HT-04" 
    },
  ]);

  return (
    <div className="container-xl mt-4 pb-5 font-sans">
      
      {/* 標題區 */}
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="fw-bold d-flex align-items-center gap-2">
            <ShieldCheck className="text-primary" /> Permission & Traceability
          </h2>
          <p className="text-muted mb-0">追蹤每個 Stress 測試步驟的執行者與負責工程師</p>
        </div>
      </div>

      <div className="row">
        {/* 左側：權限矩陣 */}
        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-bold">Role Permission Matrix</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 text-center align-middle">
                <thead className="table-light">
                  <tr className="text-xs">
                    <th className="text-start ps-3">Feature</th>
                    <th>ADM</th><th>ENG</th><th>TEC</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_MATRIX.map((r, i) => (
                    <tr key={i}>
                      <td className="text-start ps-3 text-sm fw-medium">{r.feature}</td>
                      <td>{renderPermission(r.admin)}</td>
                      <td>{renderPermission(r.engineer)}</td>
                      <td>{renderPermission(r.technician)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右側：用戶狀態 (誰目前在做什麼) */}
        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-bold d-flex justify-content-between">
              <span>Active User & Role Control</span>
              <button className="btn btn-xs btn-outline-primary py-0 text-xs">Add User</button>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
                <thead className="table-light">
                  <tr className="text-xs">
                    <th className="ps-3">User ID</th>
                    <th>Role</th>
                    <th>Current/Last Task</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="ps-3 fw-bold text-sm">{u.id}</td>
                      <td><span className={`badge text-xs ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>{u.role}</span></td>
                      <td className="text-sm text-muted">{u.lastTask}</td>
                      <td>
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" checked={u.active} readOnly />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 下方：原子級稽核日誌 (重點改動) */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-2 fw-bold">
            <Activity className="text-warning" size={20} />
            Stress Test Atomic Logs
          </div>
          <div className="d-flex gap-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-0"><Search size={14}/></span>
              <input type="text" className="form-control border-0 bg-light" placeholder="Search Account/PJT..." />
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr className="text-xs text-muted">
                <th className="ps-4">TIMESTAMP (MS)</th>
                <th>PROJECT & STEP</th>
                <th>EQUIPMENT</th>
                <th>OPERATOR (TEC)</th>
                <th>OWNER (ENG)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className={l.status === 'Error' ? 'table-danger-light' : ''}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-1 text-xs">
                      <Clock size={12} className="text-muted" /> {l.time}
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold">{l.project}</div>
                    <div className="text-xs text-primary">{l.step}</div>
                  </td>
                  <td><span className="badge bg-light text-dark border">{l.eqID}</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <UserCheck size={14} className="text-success" /> {l.operator}
                    </div>
                  </td>
                  <td>
                    <div className="text-muted text-sm italic">Created by {l.owner}</div>
                  </td>
                  <td>
                    {l.status === 'Success' ? (
                      <span className="badge bg-success-soft text-success px-2">PASS</span>
                    ) : (
                      <div className="d-flex flex-column">
                        <span className="badge bg-danger-soft text-danger px-2 w-fit">FAIL</span>
                        <small className="text-danger font-bold" style={{fontSize: '10px'}}>{l.note}</small>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-white text-center py-2">
          <button className="btn btn-link btn-sm text-decoration-none text-muted">View Full History Report <ExternalLink size={12}/></button>
        </div>
      </div>
    </div>
  );
}

function renderPermission(val) {
  if (val === true) return <span className="text-success">✔</span>;
  if (val === false) return <span className="text-danger text-opacity-25">✖</span>;
  return <span className="badge bg-warning-soft text-warning text-xs">{val}</span>;
}
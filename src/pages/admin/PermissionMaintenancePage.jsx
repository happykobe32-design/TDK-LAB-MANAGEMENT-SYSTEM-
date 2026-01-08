import React, { useState, useEffect } from "react";
import { Clock, User, ShieldCheck, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import "../../assets/RunCardCreatePage.css";

export default function PermissionMaintenancePage() {
  // 1. 原有的權限狀態
  const [permissions, setPermissions] = useState({
    admin: [
      { feature: "Dashboard", checked: true },
      { feature: "Permission Maintenance", checked: true },
      { feature: "Configuration Maintenance", checked: true },
      { feature: "Project - Create/Edit", checked: true },
      { feature: "Project - View/Search", checked: true },
      { feature: "Run Cards", checked: true },
      { feature: "Check In / Out", checked: true },
    ],
    engineer: [
      { feature: "Dashboard", checked: true },
      { feature: "Permission Maintenance", checked: false },
      { feature: "Configuration Maintenance", checked: false },
      { feature: "Project - Create/Edit", checked: true },
      { feature: "Project - View/Search", checked: true },
      { feature: "Run Cards", checked: true },
      { feature: "Check In / Out", checked: false },
    ],
    technician: [
      { feature: "Dashboard", checked: true },
      { feature: "Permission Maintenance", checked: false },
      { feature: "Configuration Maintenance", checked: false },
      { feature: "Project - Create/Edit", checked: false },
      { feature: "Project - View/Search", checked: false },
      { feature: "Run Cards", checked: false },
      { feature: "Check In / Out", checked: true },
    ],
  });

  // 2. 新增：操作日誌資料 (實際開發時應從 API 獲取)
  const [auditLogs] = useState([
    { id: 101, time: "2024-05-20 10:30:15", task: "Project-A", step: "機台校準", action: "CHECK-OUT", user: "Tech_John", role: "technician", status: "Success" },
    { id: 102, time: "2024-05-20 11:45:22", task: "Project-A", step: "機台校準", action: "CHECK-IN", user: "Tech_John", role: "technician", status: "Success" },
    { id: 103, time: "2024-05-20 13:05:00", task: "Project-B", step: "初步組裝", action: "CHECK-OUT", user: "Tech_Lee", role: "technician", status: "Error", note: "步驟未完成即嘗試簽回" },
    { id: 104, time: "2024-05-20 14:00:10", task: "Project-C", step: "權限調整", action: "UPDATE", user: "Eng_Wang", role: "engineer", status: "Success" },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("permissions");
    if (saved) {
      try { setPermissions(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleSavePermissions = () => {
    localStorage.setItem("permissions", JSON.stringify(permissions));
    alert("✅ 權限設置已保存");
  };

  const handleTogglePermission = (role, index) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: prev[role].map((perm, i) =>
        i === index ? { ...perm, checked: !perm.checked } : perm
      ),
    }));
  };

  return (
    <div className="container-xl mt-4 pb-5">
      {/* --- 第一部分：權限管理標題 --- */}
      <div className="d-flex align-items-center mb-4 gap-2">
        <ShieldCheck className="text-primary" size={32} />
        <h2 className="fw-bold mb-0">Permission Maintenance</h2>
      </div>

      {/* --- 第二部分：角色權限勾選區 --- */}
      <div className="row">
        {Object.entries(permissions).map(([role, perms]) => (
          <div key={role} className="col-lg-4 mb-4">
            <div className={`card shadow-sm h-100 border-0 border-top border-4 ${
              role === "admin" ? "border-danger" : role === "engineer" ? "border-primary" : "border-success"
            }`}>
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold text-uppercase d-flex align-items-center gap-2">
                  {role === "admin" && "👨‍💼 Admin"}
                  {role === "engineer" && "👨‍💻 Engineer"}
                  {role === "technician" && "👷 Technician"}
                </h5>
              </div>
              <div className="card-body">
                {perms.map((perm, idx) => (
                  <div key={idx} className="form-check mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`perm_${role}_${idx}`}
                      checked={perm.checked}
                      onChange={() => handleTogglePermission(role, idx)}
                    />
                    <label className="form-check-label w-100 italic" htmlFor={`perm_${role}_${idx}`} style={{ cursor: "pointer" }}>
                      {perm.feature}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-end mb-5">
        <button className="btn btn-primary btn-lg px-5 shadow" onClick={handleSavePermissions}>
          💾 Save All Permissions
        </button>
      </div>

      <hr className="my-5" />

      {/* --- 第三部分：操作稽核日誌 (Admin 抓錯專用區) --- */}
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-center mb-4 gap-2">
            <Activity className="text-warning" size={32} />
            <h3 className="fw-bold mb-0">System Operation Audit Log</h3>
          </div>
          
          <div className="card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Timestamp</th>
                    <th>Task / Project</th>
                    <th>Step</th>
                    <th>Action</th>
                    <th>Operator</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="ps-4">
                        <small className="text-muted d-flex align-items-center gap-1">
                          <Clock size={14} /> {log.time}
                        </small>
                      </td>
                      <td><span className="fw-bold">{log.task}</span></td>
                      <td><span className="badge bg-light text-dark border">{log.step}</span></td>
                      <td>
                        <span className={`fw-bold ${log.action.includes('OUT') ? 'text-primary' : 'text-success'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-secondary bg-opacity-10 p-1 rounded-circle">
                            <User size={14} />
                          </div>
                          {log.user}
                        </div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill ${
                          log.role === 'engineer' ? 'bg-primary' : 'bg-success'
                        }`}>
                          {log.role}
                        </span>
                      </td>
                      <td>
                        {log.status === "Success" ? (
                          <span className="text-success d-flex align-items-center gap-1"><CheckCircle2 size={16}/> OK</span>
                        ) : (
                          <span className="text-danger d-flex align-items-center gap-1 fw-bold" title={log.note}>
                            <AlertCircle size={16}/> ERROR
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import "../../assets/RunCardCreatePage.css";

export default function PermissionMaintenancePage() {
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

  // Load permissions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("permissions");
    if (saved) {
      try {
        setPermissions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load permissions", e);
      }
    }
  }, []);

  // Save permissions to localStorage
  const handleSavePermissions = () => {
    localStorage.setItem("permissions", JSON.stringify(permissions));
    alert("✅ 權限設置已保存");
  };

  // Toggle permission
  const handleTogglePermission = (role, index) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: prev[role].map((perm, i) =>
        i === index ? { ...perm, checked: !perm.checked } : perm
      ),
    }));
  };

  return (
    <div className="container-xl mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <h3 className="fw-bold mb-3">管理不同角色的功能權限。勾選項目表示該角色擁有該功能的訪問權限</h3>
        </div>
      </div>

      <div className="row">
        {Object.entries(permissions).map(([role, perms]) => (
          <div key={role} className="col-lg-4 mb-4">
            <div
              className="card shadow-sm"
              style={{
                borderTop: `4px solid ${
                  role === "admin"
                    ? "#dc3545"
                    : role === "engineer"
                    ? "#0d6efd"
                    : "#198754"
                }`,
              }}
            >
              <div className="card-header bg-light">
                <h5 className="card-title mb-0 fw-bold text-capitalize">
                  {role === "admin" && "👨‍💼 Admin"}
                  {role === "engineer" && "👨‍💻 Engineer"}
                  {role === "technician" && "👷 Technician"}
                </h5>
              </div>
              <div className="card-body">
                <div className="form-check-group">
                  {perms.map((perm, idx) => (
                    <div key={idx} className="form-check mb-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`perm_${role}_${idx}`}
                        checked={perm.checked}
                        onChange={() => handleTogglePermission(role, idx)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`perm_${role}_${idx}`}
                        style={{ cursor: "pointer" }}
                      >
                        {perm.feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSavePermissions}
          >
            💾 Save Permissions
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="alert alert-info mt-4" role="alert">
        <strong>ℹ️ 說明：</strong>
        <ul className="mb-0 mt-2">
          <li>
            <strong>Admin：</strong>
            系統管理員，擁有全部功能權限
          </li>
          <li>
            <strong>Engineer：</strong>
            工程師，可以創建和查看項目，但無法管理權限和配置
          </li>
          <li>
            <strong>Technician：</strong>
            技術員，主要用於簽入/簽出操作，權限最受限
          </li>
        </ul>
      </div>
    </div>
  );
}

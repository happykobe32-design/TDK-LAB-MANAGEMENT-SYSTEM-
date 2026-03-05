import React, { useState, useEffect } from "react";
import apiClient from "../../api/axios"; 
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const PermissionMaintenancePage = () => {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 從 localStorage 抓取登入者的 ID
  const currentUserId = localStorage.getItem("user_id");
  const currentLoggedInUser = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/users/");
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to retrieve user:", error); 
      alert("⚠️Unable to obtain user data"); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. 處理權限變更
  const handleRoleChange = async (targetUserId, newRoleId, targetUserData) => {
    // 防呆：確保不改到自己
    if (String(targetUserId) === String(currentUserId)) {
      alert("❌ Security Alert: You cannot modify your own role permissions.");
      fetchUsers(); 
      return;
    }

    const roleNames = { 1: "Admin", 2: "Engineer", 3: "Technician" };
    // 修正點：使用正確的 targetUserData
    const confirmMsg = `Are you sure you want to change [ ${targetUserData.user_name} ] role to [ ${roleNames[newRoleId]} ]?`;
    
    if (!window.confirm(confirmMsg)) {
        fetchUsers();
        return;
    }

    try {
      // 修正點：將 userId 改為 targetUserId，currentUserData 改為 targetUserData
      await apiClient.put(`/users/${targetUserId}`, {
        user_name: targetUserData.user_name,
        email: targetUserData.email,
        role_id: newRoleId,
        is_active: targetUserData.is_active
      });
      
      alert(`✅ User: ${targetUserData.user_name} permissions updated`);
      fetchUsers(); 
    } catch (error) {
      console.error("Update failed:", error); 
      alert("❌Update failed: " + (error.response?.data?.detail || "Network error"));
      fetchUsers();
    }
  };

  // 3. 處理「帳號啟用/停用」
  const toggleUserStatus = async (targetUserData) => {
    // 修正點：防呆判斷變數名稱修正
    if (String(targetUserData.user_id) === String(currentUserId)) {
      alert("❌ Security Alert: You cannot disable your own account!");
      return;
    }

    const nextStatus = !targetUserData.is_active;
    const actionText = nextStatus ? "Enable" : "Disable";
    
    const confirmMsg = `Are you sure you want to ${actionText} the account: ${targetUserData.user_name}?`
    if (!window.confirm(confirmMsg)) return;

    try {
      // 修正點：變更為 targetUserData
      await apiClient.put(`/users/${targetUserData.user_id}`, {
        user_name: targetUserData.user_name,
        email: targetUserData.email,
        role_id: targetUserData.role_id,
        is_active: nextStatus
      });
      
      alert(`✅Account ${targetUserData.user_name} has been ${nextStatus ? "Enabled" : "Disabled"}`);
      fetchUsers();
    } catch (error) {
      console.error("Status toggle failed:", error);
      alert("❌Failed to update account status");
    }
  };

  // 定義表格欄位
  const columnDefs = [
    { 
      headerName: "ID", 
      field: "user_id", 
      width: 70, 
      sortable: true, 
      sort: 'asc', 
      // ✨ 修正1：ID 置中靠右感
      cellStyle: { textAlign: 'center', fontWeight: '500' }, 
      headerClass: 'text-center'
    },
    { 
      headerName: "Status", 
      field: "is_active", 
      width: 110,
      cellRenderer: (params) => (
        params.value ? 
        <span className="badge mt-2 shadow-sm" style={{ backgroundColor: '#28a745', color: 'white', padding: '5px 10px', fontSize: '12px' }}>Active</span> : 
        <span className="badge mt-2 shadow-sm" style={{ backgroundColor: '#6c757d', color: 'white', padding: '5px 10px', fontSize: '12px' }}>Disabled</span>
      )
    },
    { headerName: "User_Name", field: "user_name", flex: 1, filter: true },
    { headerName: "Email", field: "email", flex: 1.5 },
    { 
      headerName: "System Role", 
      field: "role_id",
      flex: 1.2,
      cellRenderer: (params) => (
        <select 
          className="form-select form-select-sm mt-1 border-primary-subtle"
          value={params.value || ""}
          disabled={!params.data.is_active} 
          onChange={(e) => handleRoleChange(params.data.user_id, parseInt(e.target.value), params.data)}
        >
          <option value={1}>Admin</option>
          <option value={2}>Engineer</option>
          <option value={3}>Technician</option>
        </select>
      )
    },
    {
      headerName: "Operation",
      width: 140,
      cellRenderer: (params) => (
        <button 
          className={`btn btn-sm mt-1 w-100 fw-bold ${params.data.is_active ? "btn-outline-danger" : "btn-outline-secondary"}`}
          onClick={() => toggleUserStatus(params.data)}
        >
          {params.data.is_active ? "Disable" : "Enable"}
        </button>
      )
    }
  ];

  const defaultColDef = { resizable: true };

  return (
    <div className="container-fluid py-0">
      <div className="card shadow-sm border-0 rounded-0">
        <div className="card-header bg-white py-2">
          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-primary btn-sm px-2" onClick={fetchUsers}>
              ⟳ Refresh
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary text-sm" role="status"></div>
              <div className="mt-2 text-muted">Loading Database...</div>
            </div>
          ) : (
            <div className="ag-theme-alpine shadow-none" style={{ height: 600, width: '100%' }}>
              <AgGridReact
                rowData={userData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={30}
                rowHeight={55}
                animateRows={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionMaintenancePage;
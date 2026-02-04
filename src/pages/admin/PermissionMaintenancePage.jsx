import React, { useState, useEffect } from "react";
// 引入先前建立的 axios 實例
import apiClient from "../../api/axios"; 
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const PermissionMaintenancePage = () => {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 從後端獲取使用者清單
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // 對應 users.py 中的 @router.get("/")
      const response = await apiClient.get("/users/");
      setUserData(response.data);
    } catch (error) {
      console.error("Failed to retrieve user:", error); 
      alert("無法取得使用者資料"); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. 處理權限變更並同步至後端 (已加入防呆機制)
  const handleRoleChange = async (userId, newRoleId, currentUserData) => {
    // 【防呆機制】：二次確認變更
    const roleNames = { 1: "Admin", 2: "Engineer", 3: "Technician" };
    const confirmMsg = `Are you sure you want to change the permissions of user: [ ${currentUserData.user_name} ] role to [ ${roleNames[newRoleId]} ] ？`;
    
    if (!window.confirm(confirmMsg)) {
        fetchUsers(); // 刷回原始數據，避免下拉選單狀態不一致
        return;
    }

    try {
      // 對應 users.py 中的 @router.put("/{user_id}")
      await apiClient.put(`/users/${userId}`, {
        user_name: currentUserData.user_name,
        email: currentUserData.email,
        role_id: newRoleId,
        is_active: currentUserData.is_active
      });
      
      alert(`User: ${currentUserData.user_name} permissions have been updated`);
      fetchUsers(); // 重新整理清單
    } catch (error) {
      console.error("Update failed:", error); 
      alert("Update failed: " + (error.response?.data?.detail || "Network error"));
      fetchUsers(); // 發生錯誤時刷回原始數據
    }
  };

  // 3. 處理移除帳號 (已加入防呆機制)
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove the account ${userName}?`)) return; 
    try {
      // 對應 users.py 中的 @router.delete("/{user_id}")
      await apiClient.delete(`/users/${userId}`);
      alert("Account has been successfully removed");
      fetchUsers();
    } catch (error) {
      alert("Failed to remove account");
    }
  };

  // 定義表格欄位
  const columnDefs = [
    { headerName: "ID", field: "user_id", width: 80, sortable: true },
    { headerName: "User_Name", field: "user_name", flex: 1, filter: true },
    { headerName: "Email", field: "email", flex: 1.5 },
    { 
      headerName: "System Role (Dropdown Edit)", 
      field: "role_id",
      flex: 1.2,
      cellRenderer: (params) => (
        <select 
          className="form-select form-select-sm mt-1 border-primary-subtle"
          value={params.value || ""}
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
      width: 120,
      cellRenderer: (params) => (
        <button 
          className="btn btn-sm btn-outline-danger mt-1"
          onClick={() => handleDeleteUser(params.data.user_id, params.data.user_name)}
        >
          Remove
        </button>
      )
    }
  ];

  return (
    <div className="container-fluid py-0">
      <div className="card shadow-sm border-0 rounded-0">
        {/* 表頭區 */}
        <div className="card-header bg-white py-0">
          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-primary btn-sm px-2" onClick={fetchUsers}>
              ⟳ Refresh
            </button>
          </div>
        </div>

        {/* 表格內容區 */}
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary text-sm" role="status"></div>
              <div className="mt-2 text-muted">Loading Data...</div>
            </div>
          ) : (
            <div className="ag-theme-alpine shadow-none" style={{ height: 600, width: '100%' }}>
              <AgGridReact
                rowData={userData}
                columnDefs={columnDefs}
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
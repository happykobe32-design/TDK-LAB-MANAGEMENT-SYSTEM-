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
      console.error("抓取使用者失敗:", error);
      alert("無法取得使用者資料");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. 處理權限變更並同步至後端
  const handleRoleChange = async (userId, newRoleId, currentUserData) => {
    try {
      // 對應 users.py 中的 @router.put("/{user_id}")
      // 根據 UserUpdate Schema，我們傳送要修改的欄位
      await apiClient.put(`/users/${userId}`, {
        user_name: currentUserData.user_name,
        email: currentUserData.email,
        role_id: newRoleId,
        is_active: currentUserData.is_active
      });
      
      alert(`使用者 ${currentUserData.user_name} 權限已更新`);
      fetchUsers(); // 重新整理清單
    } catch (error) {
      console.error("更新失敗:", error);
      alert("更新失敗：" + (error.response?.data?.detail || "網路連線異常"));
    }
  };

  // 3. 處理移除帳號
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`確定要移除帳號 ${userName} 嗎？`)) return;
    try {
      // 對應 users.py 中的 @router.delete("/{user_id}")
      await apiClient.delete(`/users/${userId}`);
      alert("帳號已成功移除");
      fetchUsers();
    } catch (error) {
      alert("移除失敗");
    }
  };

  // 定義表格欄位
  const columnDefs = [
    { headerName: "ID", field: "user_id", width: 80 },
    { headerName: "帳號名稱", field: "user_name", flex: 1 },
    { headerName: "Email", field: "email", flex: 1.5 },
    { 
      headerName: "系統角色 (下拉修改)", 
      field: "role_id",
      flex: 1.2,
      cellRenderer: (params) => (
        <select 
          className="form-select form-select-sm mt-1"
          value={params.value || ""}
          onChange={(e) => handleRoleChange(params.data.user_id, parseInt(e.target.value), params.data)}
        >
          <option value={1}>Admin (管理員)</option>
          <option value={2}>Engineer (工程師)</option>
          <option value={3}>Technician (技術員)</option>
        </select>
      )
    },
    {
      headerName: "操作",
      width: 100,
      cellRenderer: (params) => (
        <button 
          className="btn btn-sm btn-outline-danger mt-1"
          onClick={() => handleDeleteUser(params.data.user_id, params.data.user_name)}
        >
          移除
        </button>
      )
    }
  ];

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="card-title mb-0">使用者權限維護</h3>
          <button className="btn btn-primary btn-sm" onClick={fetchUsers}>重新整理</button>
        </div>

        {loading ? (
          <div className="text-center py-5">讀取中...</div>
        ) : (
          <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
            <AgGridReact
              rowData={userData}
              columnDefs={columnDefs}
              pagination={true}
              paginationPageSize={10}
              rowHeight={50}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionMaintenancePage;
import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../../api/axios"; 
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const PermissionMaintenancePage = () => {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentUserId = localStorage.getItem("user_id");
  const currentLoggedInUser = JSON.parse(localStorage.getItem("user") || "{}");

  // ==========================================
  // ✨ 新增：心跳機制與數據統計邏輯
  // ==========================================
  
  // 1. 每 30 秒自動向後端發送「我還在」的訊號
  useEffect(() => {
    if (!currentUserId) return;

    const sendHeartbeat = async () => {
      try {
        // 假設後端有一個專門更新活動時間的 API 路徑
        await apiClient.post(`/users/heartbeat/${currentUserId}`);
      } catch (error) {
        console.warn("Heartbeat update failed. This is normal if API is not ready.");
      }
    };

    // 立即執行一次，之後每 30 秒執行一次
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval); // 元件卸載時停止心跳
  }, [currentUserId]);

  // 2. 計算統計數據 (基於真實資料庫欄位)
  const stats = useMemo(() => {
  const total = userData.length;
  const disabled = userData.filter(u => !u.is_active).length;

  // 改用這種方式判斷線上：
  const onlineUsers = userData.filter(u => {
    if (!u.last_seen) return false;

    // 將資料庫時間轉為 Date 物件
    // 加上 "Z" 確保 JavaScript 將其視為 UTC 時間
    const lastSeenDate = new Date(u.last_seen.endsWith('Z') ? u.last_seen : u.last_seen + 'Z');
    const now = new Date();

    // 計算秒數差
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
    
    // 只要 150 秒內有更新過，就算在線 (考慮到 30 秒心跳 + 網路延遲)
    // 增加一個除錯 Log 看看時間差是多少
    // console.log(`User: ${u.user_name}, Diff: ${diffInSeconds}s`); 
    
    return diffInSeconds >= 0 && diffInSeconds < 150;
  });

  return { 
    total, 
    online: onlineUsers.length, 
    disabled 
  };
}, [userData]);

  // ==========================================

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
    // 設定每分鐘自動刷新一次列表，確保線上人數數據保持最新
    const refreshTimer = setInterval(fetchUsers, 60000);
    return () => clearInterval(refreshTimer);
  }, []);

  const handleRoleChange = async (targetUserId, newRoleId, targetUserData) => {
    if (String(targetUserId) === String(currentUserId)) {
      alert("❌ Security Alert: You cannot modify your own role permissions.");
      fetchUsers(); 
      return;
    }
    const roleNames = { 1: "Admin", 2: "Engineer", 3: "Technician" };
    if (!window.confirm(`Change [ ${targetUserData.user_name} ] to [ ${roleNames[newRoleId]} ]?`)) {
        fetchUsers();
        return;
    }
    try {
      await apiClient.put(`/users/${targetUserId}`, {
        user_name: targetUserData.user_name,
        email: targetUserData.email,
        role_id: newRoleId,
        is_active: targetUserData.is_active
      });
      alert(`✅ User updated`);
      fetchUsers(); 
    } catch (error) {
      alert("Update failed");
      fetchUsers();
    }
  };

  const toggleUserStatus = async (targetUserData) => {
    if (String(targetUserData.user_id) === String(currentUserId)) {
      alert("❌ Security Alert: You cannot disable your own account!");
      return;
    }
    const nextStatus = !targetUserData.is_active;
    if (!window.confirm(`Confirm ${nextStatus ? "Enable" : "Disable"} ${targetUserData.user_name}?`)) return;
    try {
      await apiClient.put(`/users/${targetUserData.user_id}`, {
        user_name: targetUserData.user_name,
        email: targetUserData.email,
        role_id: targetUserData.role_id,
        is_active: nextStatus
      });
      fetchUsers();
    } catch (error) {
      alert("Operation failed");
    }
  };

  const columnDefs = [
    { 
      headerName: "ID", 
      field: "user_id", 
      width: 80, 
      sortable: true, 
      sort: 'asc', 
      cellStyle: { textAlign: 'center', fontWeight: 'bold', color: '#666' }
    },
    { 
      headerName: "Status", 
      field: "is_active", 
      width: 120,
      cellRenderer: (params) => (
        params.value ? 
        <div className="d-flex align-items-center mt-2">
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3">● Active</span>
        </div> : 
        <div className="d-flex align-items-center mt-2">
            <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3">○ Disabled</span>
        </div>
      )
    },
    { headerName: "User Name", field: "user_name", flex: 1, filter: true },
    { headerName: "Email Address", field: "email", flex: 1.5 },
    { 
      headerName: "System Role", 
      field: "role_id",
      flex: 1.2,
      cellRenderer: (params) => (
        <select 
          className="form-select form-select-sm mt-1 shadow-sm"
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
          className={`btn btn-sm mt-1 w-100 fw-bold shadow-sm ${params.data.is_active ? "btn-outline-danger" : "btn-primary text-white"}`}
          onClick={() => toggleUserStatus(params.data)}
        >
          {params.data.is_active ? "Disable" : "Enable"}
        </button>
      )
    }
  ];

  return (
    <div className="container-fluid py-3 bg-light-subtle" style={{ minHeight: '100vh' }}>
      {/* 統計面板 Dashboard */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center">
              <div className="rounded-circle bg-primary-subtle p-3 me-3">👥</div>
              <div>
                <div className="text-muted small fw-bold">Total Accounts</div>
                <div className="h4 mb-0 fw-bold">{stats.total}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center">
              <div className="rounded-circle bg-success-subtle p-3 me-3">🟢</div>
              <div>
                <div className="text-muted small fw-bold">Real-time Online</div>
                <div className="h4 mb-0 fw-bold text-success">{stats.online}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center">
              <div className="rounded-circle bg-warning-subtle p-3 me-3">🚫</div>
              <div>
                <div className="text-muted small fw-bold">Account Disabled</div>
                <div className="h4 mb-0 fw-bold text-danger">{stats.disabled}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-primary btn-sm px-1 rounded-pill" onClick={fetchUsers}>⟳ Refresh </button>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="ag-theme-alpine w-100" style={{ height: 600 }}>
              <AgGridReact
                rowData={userData}
                columnDefs={columnDefs}
                pagination={true}
                paginationPageSize={30}
                rowHeight={60}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionMaintenancePage;
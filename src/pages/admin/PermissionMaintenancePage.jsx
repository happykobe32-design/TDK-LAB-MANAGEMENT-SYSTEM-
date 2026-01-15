import React, { useState } from "react";

export default function PermissionMaintenancePage() {
  // 1. 分頁控制：'audit' (看誰做了什麼) | 'access' (設定誰能做什麼)
  const [activeTab, setActiveTab] = useState("audit");

  return (
    <div className="container-fluid py-4 bg-light min-h-screen">
      <div className="container-xl shadow-sm bg-white rounded-4 overflow-hidden p-0">
        
        {/* --- Google Style Header & Tabs --- */}
        <div className="px-4 pt-4 border-bottom bg-white">
          <div className="d-flex align-items-center mb-3">
            <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
              <span className="fs-4">🛡️</span>
            </div>
            <div>
              <h4 className="fw-bold mb-0">系統稽核與權限管理</h4>
              <p className="text-muted small mb-0">管理公司帳號權限並追蹤每一站測試步驟的詳細歷程</p>
            </div>
          </div>
          
          <ul className="nav nav-tabs border-0">
            <li className="nav-item">
              <button
                className={`nav-link px-4 py-2 border-0 ${activeTab === "audit" ? "border-bottom border-primary border-3 text-primary fw-bold" : "text-secondary opacity-75"}`}
                onClick={() => setActiveTab("audit")}
                style={{ background: 'transparent' }}
              >
                操作稽核日誌 (Live Logs)
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link px-4 py-2 border-0 ${activeTab === "access" ? "border-bottom border-primary border-3 text-primary fw-bold" : "text-secondary opacity-75"}`}
                onClick={() => setActiveTab("access")}
                style={{ background: 'transparent' }}
              >
                帳號權限配置 (Account Settings)
              </button>
            </li>
          </ul>
        </div>

        {/* --- 內容區域 --- */}
        <div className="p-4 bg-white">
          {activeTab === "audit" ? <AuditLogSection /> : <AccountAccessSection />}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   分頁一：操作稽核 (查看誰做、什麼步驟、時間)
   ===================================================== */
function AuditLogSection() {
  return (
    <div className="animate-fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div className="d-flex gap-2">
          {/* 未來連接 API：這些參數會傳給後端做過濾 */}
          <input type="text" className="form-control form-control-sm border-gray" style={{ width: '280px' }} placeholder="搜尋 ID、Runcard 或具體動作..." />
          <select className="form-select form-select-sm border-gray" style={{ width: '130px' }}>
            <option>所有角色</option>
            <option>Engineer</option>
            <option>Technician</option>
          </select>
          <input type="date" className="form-control form-control-sm border-gray" />
        </div>
        <button className="btn btn-light btn-sm border text-secondary fw-bold px-3">
          📥 匯出稽核報表
        </button>
      </div>

      <div className="border rounded-3 overflow-hidden">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr className="small text-muted text-uppercase fw-bold">
              <th className="ps-4 py-3">發生時間 (MS)</th>
              <th>執行者 (Account)</th>
              <th>角色</th>
              <th>專案 / Runcard</th>
              <th>測試站點 & 步驟</th>
              <th>動作</th>
              <th>機台 ID</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '13.5px' }}>
            {/* --- 註解：此處為未來串接 API map 顯示資料 --- */}
            {/* 業界標準：每行日誌應顯示「操作者」與「動作」，點擊後可跳轉至該專案詳情 */}
            
            {/* 模擬一筆成功紀錄 */}
            <tr>
              <td className="ps-4 text-muted">2026-01-15 11:30:01.45</td>
              <td><span className="fw-bold">tech_john</span></td>
              <td><span className="badge bg-success bg-opacity-10 text-success px-2 py-1">Technician</span></td>
              <td><span className="text-primary fw-medium">PJT-MAX-001</span></td>
              <td>Step 2: Stress Test</td>
              <td><span className="badge bg-primary px-2 py-1">CHECK-OUT</span></td>
              <td><code>EQ-CH-05</code></td>
              <td><span className="text-success fw-bold">● PASS</span></td>
            </tr>

            {/* 空數據預設狀態 */}
            <tr>
              <td colSpan="8" className="text-center py-5">
                <div className="text-muted mb-2">正在等待實時數據接入...</div>
                <div className="text-xs text-secondary opacity-50 italic">系統將根據登入帳號自動紀錄每一次點擊與參數修改</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =====================================================
   分頁二：帳號權限 (依帳號設定角色與開關)
   ===================================================== */
function AccountAccessSection() {
  return (
    <div className="animate-fade-in">
      <div className="row g-4">
        {/* 左側：帳號列表 */}
        <div className="col-md-4">
          <div className="border rounded-3 h-100 overflow-hidden bg-light bg-opacity-25">
            <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small">全體人員清單</span>
              <button className="btn btn-xs btn-outline-primary py-0">新增帳號</button>
            </div>
            <div className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {/* --- 註解：未來連接 API 獲取人員數據 --- */}
              <div className="list-group-item list-group-item-action p-3 border-start border-primary border-4 bg-primary bg-opacity-10">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold">eng_wang (王大明)</div>
                    <small className="text-muted">Lead Engineer</small>
                  </div>
                  <span className="badge bg-primary text-xs">Active</span>
                </div>
              </div>
              
              {/* 其他帳號示意 */}
              <div className="list-group-item list-group-item-action p-3 opacity-75">
                <div className="fw-bold">tech_lee (李小華)</div>
                <small className="text-muted">Technician</small>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：針對特定帳號的權限面板 */}
        <div className="col-md-8">
          <div className="card border-gray border-1 rounded-3 h-100 shadow-sm">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small">帳號設定模式</span>
                <h5 className="fw-bold mb-0 text-primary">eng_wang</h5>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" checked readOnly />
                <label className="form-check-label small fw-bold">帳號啟用</label>
              </div>
            </div>

            <div className="card-body">
              <div className="row mb-4 g-3 border-bottom pb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">系統角色 (Role Assignment)</label>
                  <select className="form-select border-gray">
                    <option>Admin (管理員)</option>
                    <option selected>Engineer (工程師)</option>
                    <option>Technician (技術員)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">Runcard 負責權限</label>
                  <select className="form-select border-gray">
                    <option>僅限個人負責的 Runcard</option>
                    <option selected>可操作組員的 Runcard (代理)</option>
                    <option>所有 Runcard 讀寫權限</option>
                  </select>
                </div>
              </div>

              {/* 權限模組分組 */}
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <span className="me-2 text-primary">●</span> 功能存取明細 (Module Access)
              </h6>
              
              <div className="row g-2">
                {[
                   { name: "專案創建 / 編輯 (Create Project)", group: "Admin/Eng" },
                   { name: "測試規格設定 (Test Plan Setup)", group: "Admin/Eng" },
                   { name: "標準報工 (Check In/Out)", group: "All" },
                   { name: "數據無效化 (Mark Invalid)", group: "Admin Only", danger: true },
                   { name: "系統配置管理 (Config Admin)", group: "Admin Only", danger: true },
                   { name: "稽核報表匯出 (Export Logs)", group: "All" }
                ].map((item, idx) => (
                  <div key={idx} className="col-md-6">
                    <div className={`p-3 border rounded-3 d-flex justify-content-between align-items-center ${item.danger ? 'border-danger-subtle bg-danger-subtle bg-opacity-10' : 'bg-light bg-opacity-50'}`}>
                      <div>
                        <div className={`text-sm fw-bold ${item.danger ? 'text-danger' : ''}`}>{item.name}</div>
                        <small className="text-muted" style={{fontSize: '10px'}}>授權範圍: {item.group}</small>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" defaultChecked={!item.danger} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="alert alert-warning mt-4 py-2 border-0 small text-dark d-flex align-items-center gap-2">
                <span>⚠️</span> 修改此帳號權限後，該人員下一次操作時將立即生效並產生變更日誌。
              </div>

              <div className="mt-4 pt-3 border-top text-end">
                <button className="btn btn-primary px-5 fw-bold shadow-sm rounded-pill">儲存 eng_wang 的權限設定</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
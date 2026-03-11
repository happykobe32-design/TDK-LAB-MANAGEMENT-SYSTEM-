import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// 1. 模擬圖表數據 (對應圖片中的 User Request Volume)
const mockChartData = [
  { date: '02-23', requests: 294 },
  { date: '02-24', requests: 1114 },
  { date: '02-25', requests: 710 },
  { date: '02-26', requests: 596 },
  { date: '02-27', requests: 171 },
  { date: '03-01', requests: 113 },
];

// 2. 模擬佈告欄數據 (對應你想要的 Check-out 提醒)
const mockLiveTasks = [
  { id: 1, qr: 'QR-2026001', lot: 'G6W200-S1', stress: 'HTOL', remains: '1.5', status: 'Running' },
  { id: 2, qr: 'QR-2026005', lot: 'G6W550-E2', stress: 'PTC', remains: '4.2', status: 'Running' },
  { id: 3, qr: 'QR-2026012', lot: 'A1B100-M1', stress: 'TC', remains: '0.5', status: 'Warning' },
];

const Dashboard = () => {
  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 頁面標題 */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Dashboard Overview</h3>
        <span className="badge bg-primary">Last Update: {new Promise(r => {}).toString().slice(0,10)} 14:00</span>
      </div>

      {/* 第一層：頂部狀態卡片 (對應圖片左上角數字) */}
      <div className="row g-3 mb-4">
        {[
          { title: 'Active Users', value: '31', color: '#6f42c1' },
          { title: 'User Requests', value: '3,268', color: '#198754' },
          { title: 'Failed Requests', value: '31', color: '#dc3545' },
          { title: 'Running Tests', value: '12', color: '#0dcaf0' }
        ].map((item, idx) => (
          <div className="col-md-3" key={idx}>
            <div className="card border-0 shadow-sm" style={{ borderLeft: `5px solid ${item.color}` }}>
              <div className="card-body p-4 text-center">
                <h6 className="text-muted small text-uppercase fw-bold">{item.title}</h6>
                <h2 className="display-6 fw-bold mb-0" style={{ color: item.color }}>{item.value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* 第二層左側：趨勢圖 (User Request Volume) */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4">User Request Volume Over Time</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="requests" stroke="#0d6efd" fillOpacity={1} fill="url(#colorReq)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 第二層右側：即時佈告欄 (Bulletin Board) */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 border-0">
              <h5 className="fw-bold mb-0">Live Test Tracker</h5>
            </div>
            <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '350px' }}>
              {mockLiveTasks.map(task => (
                <div className="list-group-item p-3 border-start border-warning border-3 mb-2 mx-2 rounded shadow-sm" key={task.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <span className="fw-bold text-primary">{task.qr}</span>
                      <div className="small fw-bold">{task.lot}</div>
                      <div className="text-muted x-small">Stress: {task.stress}</div>
                    </div>
                    <div className="text-end">
                      <span className={`badge ${parseFloat(task.remains) < 1 ? 'bg-danger' : 'bg-warning text-dark'} mb-1`}>
                        {task.remains} hrs left
                      </span>
                      <div className="x-small text-success">● {task.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-footer bg-white border-0 text-center py-3">
              <button className="btn btn-sm btn-outline-secondary w-100">View All Run Cards</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
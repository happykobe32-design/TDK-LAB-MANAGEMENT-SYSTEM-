import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios'; 
import { Clock, Cpu, AlertCircle, Zap } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [runCards, setRunCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [tRes, pRes, rRes] = await Promise.all([
        apiClient.get('/tasks/'),
        apiClient.get('/projects/'),
        apiClient.get('/run_cards/')
      ]);
      setTasks(tRes.data);
      setProjects(pRes.data);
      setRunCards(rRes.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 30000); 
    return () => clearInterval(timer);
  }, []);

  const getProcessedData = () => {
    const now = new Date();
    const running = [];
    const pending = [];
    const busyMachines = new Set();

    // 依據 Run Card 分組處理 Task 邏輯
    runCards.forEach(rc => {
      const proj = projects.find(p => p.project_id === rc.project_id);
      const qrName = proj ? proj.qr : "N/A";
      
      const rcTasks = tasks
        .filter(t => t.run_card_id === rc.run_card_id)
        .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

      rcTasks.forEach((task, index) => {
        const commonInfo = {
          ...task,
          project_id: rc.project_id,
          qr: qrName,
          lot_id: rc.lot_id,
        };

        // A. 判定為 Running (正在測試中)
        if (task.check_in_time && !task.check_out_time) {
          const startTimeStr = task.check_in_time.split('\n')[0];
          const start = new Date(startTimeStr);
          const duration = parseFloat(task.time) || 0;
          const end = new Date(start.getTime() + duration * 3600000);
          const remains = (end - now) / 3600000;
          
          running.push({ 
            ...commonInfo, 
            remains: remains > 0 ? remains.toFixed(1) : "0.0", 
            statusColor: remains <= 1 ? 'text-danger' : 'text-warning'
          });

          // 1. 更新機台狀態：將正在使用的機台加入 Set
          if (task.hardware) {
            busyMachines.add(task.hardware.trim().toUpperCase());
          }
        } 
        
        // B. 判定為 Pending (待開始)
        else if (!task.check_in_time && task.status !== "Done" && task.status !== "SKIPPED") {
          const prevTask = rcTasks[index - 1];
          const canStart = !prevTask || (prevTask.check_out_time || prevTask.status === "SKIPPED");
          
          if (canStart) {
            // 3. 計算等待時間 (如果有前一站的 check_out_time 則以此起算，否則以 project 創立時間概算)
            const waitBase = prevTask?.check_out_time ? new Date(prevTask.check_out_time.split('\n')[0]) : now;
            const waitHours = Math.abs(now - waitBase) / 3600000;
            
            pending.push({
              ...commonInfo,
              waitHours: waitHours.toFixed(1),
              isOverdue: waitHours >= 24
            });
          }
        }
      });
    });

    return { running, pending, busyMachines };
  };

  const handleTaskClick = (task) => {
    if (!task.project_id) {
      alert("Missing Project ID linkage");
      return;
    }
    const queryParams = new URLSearchParams({
      pIdx: task.project_id, 
      rcIdx: task.run_card_id,
      lotId: task.lot_id
    }).toString();
    
    navigate(`/checkinout?${queryParams}`);
  };

  const { running, pending, busyMachines } = getProcessedData();

  if (loading) return <div className="p-4 text-center text-muted">Loading System Data...</div>;

  return (
    <div className="container-fluid p-2" style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontSize: '0.85rem' }}>
      <style>{`
        .kpi-card { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; border-radius: 4px; }
        .task-column { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); min-height: 80vh; }
        .task-item { padding: 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; }
        .task-item:hover { background-color: #f8fafc; transform: translateX(4px); }
        .info-label { font-weight: bold; color: #64748b; margin-right: 4px; font-size: 0.75rem; }
        .machine-badge { font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; }
        .x-small { font-size: 0.75rem; }
      `}</style>

      {/* KPI 區塊 */}
      <div className="row g-1 mb-2">
        <div className="col-3"><div className="kpi-card text-white shadow-sm bg-success"><span>RUNNING</span><div className="h4 mb-0">{running.length}</div></div></div>
        <div className="col-3"><div className="kpi-card text-white shadow-sm bg-warning"><span>PENDING</span><div className="h4 mb-0">{pending.length}</div></div></div>
        <div className="col-3"><div className="kpi-card text-white shadow-sm bg-danger"><span>URGENT (1H)</span><div className="h4 mb-0">{running.filter(r => parseFloat(r.remains) <= 1).length}</div></div></div>
        <div className="col-3"><div className="kpi-card text-white shadow-sm bg-primary"><span>TOTAL ACTIVE</span><div className="h4 mb-0">{tasks.filter(t => t.status !== "Done").length}</div></div></div>
      </div>

      <div className="row g-2">
        {/* 左：進行中 */}
        <div className="col-lg-4">
          <div className="task-column p-2">
            <div className="fw-bold text-muted mb-2 px-2 border-bottom pb-2"><Zap size={14} className="text-warning"/> IN-PROCESS</div>
            {running.map(task => (
              <div key={task.task_id} className="task-item" onClick={() => handleTaskClick(task)}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className={`fw-bold ${task.statusColor}`} style={{fontSize: '0.9rem'}}>QR: {task.qr}</div>
                    <div className="x-small mt-1"><span className="info-label">LOT:</span>{task.lot_id}</div>
                    <div className="x-small"><span className="info-label">STRESS:</span>{task.operation}</div>
                    <div className="x-small text-primary fw-bold mt-1"><Cpu size={10}/> {task.hardware || "Not Assigned"}</div>
                  </div>
                  <div className="text-end">
                    <div className={`fw-bold ${task.statusColor}`}><Clock size={12}/> {task.remains}h</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 中：待開始 */}
        <div className="col-lg-4">
          <div className="task-column p-2">
            <div className="fw-bold text-muted mb-2 px-2 border-bottom pb-2"><AlertCircle size={14} className="text-info"/> PENDING START</div>
            {pending.map(task => (
              <div key={task.task_id} className="task-item" onClick={() => handleTaskClick(task)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold text-primary" style={{fontSize: '0.9rem'}}>QR: {task.qr}</div>
                    <div className="x-small mt-1"><span className="info-label">LOT:</span>{task.lot_id}</div>
                    <div className="x-small"><span className="info-label">STRESS:</span>{task.operation}</div>
                  </div>
                  <div className="text-end">
                    <button className="btn btn-sm btn-outline-warning x-small py-1 px-2 fw-bold mb-1">START</button>
                    <div className={`x-small fw-bold ${task.isOverdue ? 'text-danger' : 'text-muted'}`}>
                      <Clock size={10}/> {task.waitHours}h
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右：機台狀態 */}
        <div className="col-lg-4">
          <div className="task-column p-3">
            <div className="fw-bold text-muted mb-3 d-flex align-items-center"><Cpu size={14} className="text-primary me-2"/> MACHINE UTILIZATION</div>
            <div className="row g-2">
              {['OVEN-01', 'OVEN-02', 'THS-01', 'THS-02', 'ALT-01', 'ALT-02'].map(m => {
                const isBusy = busyMachines.has(m);
                return (
                  <div className="col-6" key={m}>
                    <div className={`border rounded p-2 text-center ${isBusy ? 'bg-danger-subtle border-danger' : 'bg-light'}`} style={{transition: '0.3s'}}>
                      <div className="x-small fw-bold">{m}</div>
                      <span className={`machine-badge ${isBusy ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                        {isBusy ? 'IN USE' : 'AVAILABLE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
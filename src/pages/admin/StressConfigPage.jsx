import React, { useState } from 'react';

const StressConfigPage = () => {
  // 假資料庫
  const [data, setData] = useState([
    {
      id: "S1", name: "Environmental Test",
      types: [
        { 
          id: "T1", name: "ALT", 
          ops: [{ id: "O1", name: "Power Cycling", conds: [] }] 
        }
      ]
    }
  ]);

  // 控制選中哪一層
  const [selection, setSelection] = useState({ s: "S1", t: "T1", o: "O1" });
  const [newCond, setNewCond] = useState({ name: '', label: '', unit: '', type: 'Number', range: 'N' });

  // 取得當前編輯對象
  const currentOp = data.find(s => s.id === selection.s)
                        ?.types.find(t => t.id === selection.t)
                        ?.ops.find(o => o.id === selection.o);

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#f0f2f5", minHeight: "90vh" }}>
      <div className="row justify-content-center">
        <div className="col-xl-11">
          
          {/* 頂部導航：用簡潔的下拉或麵包屑取代雜亂的列表 */}
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-primary me-2">1</span>
                <select className="form-select form-select-sm border-0 bg-light" style={{ width: '200px' }} value={selection.s} onChange={e => setSelection({...selection, s: e.target.value})}>
                  <option value="S1">Environmental Test</option>
                </select>
              </div>
              <span className="text-muted">/</span>
              <div className="d-flex align-items-center">
                <span className="badge bg-info me-2">2</span>
                <select className="form-select form-select-sm border-0 bg-light" style={{ width: '150px' }} value={selection.t} onChange={e => setSelection({...selection, t: e.target.value})}>
                  <option value="T1">ALT</option>
                </select>
              </div>
              <span className="text-muted">/</span>
              <div className="d-flex align-items-center">
                <span className="badge bg-secondary me-2">3</span>
                <select className="form-select form-select-sm border-0 bg-light" style={{ width: '180px' }} value={selection.o} onChange={e => setSelection({...selection, o: e.target.value})}>
                  <option value="O1">Power Cycling</option>
                </select>
              </div>
              <div className="ms-auto">
                <button className="btn btn-primary btn-sm px-4 shadow-sm">💾 儲存所有變更</button>
              </div>
            </div>
          </div>

          {/* 主編輯區：PPT 矩陣 (1:1 還原) */}
          <div className="card shadow-sm border-0 overflow-hidden">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between">
              <h6 className="mb-0 fw-bold">Step 4: 測試條件 (Condition) 屬性定義</h6>
              <span className="text-muted small">所有設定將影響未來 Create 頁面的輸入框</span>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover align-middle mb-0 text-center">
                <thead className="bg-light">
                  <tr className="small text-muted">
                    <th>條件名稱 (DB Key)</th>
                    <th>顯示標題 (UI Label)</th>
                    <th>單位 (Unit)</th>
                    <th>資料類型</th>
                    <th>是否為範圍 (Range)</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 已有的 Condition */}
                  <tr>
                    <td><input className="form-control form-control-sm border-0 text-center" defaultValue="溫度" /></td>
                    <td><input className="form-control form-control-sm border-0 text-center" defaultValue="Temp" /></td>
                    <td><input className="form-control form-control-sm border-0 text-center" defaultValue="°C" /></td>
                    <td><select className="form-select form-select-sm border-0 text-center"><option>Number</option></select></td>
                    <td>
                      <div className="d-flex justify-content-center gap-2">
                        <label className="small"><input type="radio" checked readOnly /> 是</label>
                        <label className="small"><input type="radio" disabled /> 否</label>
                      </div>
                    </td>
                    <td><button className="btn btn-link text-danger p-0">🗑️</button></td>
                  </tr>

                  {/* PPT 標誌性的新增行：黃色亮點區域 */}
                  <tr style={{ backgroundColor: "#fffbe6" }}>
                    <td><input className="form-control form-control-sm border-warning bg-white" placeholder="條件名稱" value={newCond.name} onChange={e=>setNewCond({...newCond, name: e.target.value})} /></td>
                    <td><input className="form-control form-control-sm border-0 bg-white" placeholder="顯示名稱" value={newCond.label} onChange={e=>setNewCond({...newCond, label: e.target.value})} /></td>
                    <td><input className="form-control form-control-sm border-0 bg-white" placeholder="單位" value={newCond.unit} onChange={e=>setNewCond({...newCond, unit: e.target.value})} /></td>
                    <td><select className="form-select form-select-sm border-0 bg-white"><option>Number</option><option>Text</option></select></td>
                    <td>
                      <div className="d-flex justify-content-center gap-3">
                        <label className="small"><input type="radio" checked={newCond.range === 'Y'} onChange={()=>setNewCond({...newCond, range:'Y'})}/> 是</label>
                        <label className="small"><input type="radio" checked={newCond.range === 'N'} onChange={()=>setNewCond({...newCond, range:'N'})}/> 否</label>
                      </div>
                    </td>
                    <td><button className="btn btn-warning btn-sm w-100 fw-bold border-white">確定新增</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 頁尾提示 */}
          <div className="mt-3 text-center">
            <p className="text-muted small">注意：修改「條件名稱」可能會導致舊有的 RunCard 資料讀取異常，請謹慎操作。</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StressConfigPage;
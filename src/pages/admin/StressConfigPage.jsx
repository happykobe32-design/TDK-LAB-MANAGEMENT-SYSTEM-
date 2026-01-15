import React, { useState } from 'react';

const StressConfigPage = () => {
  // 1. 模擬資料庫資料 (包含四層架構)
  const [data, setData] = useState([
    {
      id: "S1", name: "Environmental Test",
      types: [
        { 
          id: "T1", name: "ALT", 
          ops: [
            { 
              id: "O1", name: "Power Cycling", 
              conds: [
                { id: 1, name: '溫度', label: 'Temp', unit: '°C', type: 'Number', range: 'Y' },
                { id: 2, name: '濕度', label: 'Humid', unit: '%RH', type: 'Number', range: 'N' }
              ] 
            }
          ] 
        }
      ]
    }
  ]);

  // 2. UI 狀態
  const [selection, setSelection] = useState({ s: "S1", t: "T1", o: "O1" });
  const [newCond, setNewCond] = useState({ name: '', label: '', unit: '', type: 'Number', range: 'N' });

  // 取得當前編輯對象
  const currentStress = data.find(s => s.id === selection.s);
  const currentType = currentStress?.types.find(t => t.id === selection.t);
  const currentOp = currentType?.ops.find(o => o.id === selection.o);

  // --- 核心邏輯：將巢狀資料扁平化，生成類似 Excel 的清單 ---
  const generateExcelPreview = () => {
    let rows = [];
    data.forEach(s => {
      s.types.forEach(t => {
        t.ops.forEach(o => {
          o.conds.forEach(c => {
            rows.push({
              stress: s.name,
              type: t.name,
              op: o.name,
              cond: c.name,
              label: c.label,
              unit: c.unit,
              range: c.range
            });
          });
        });
      });
    });
    return rows;
  };

  const excelRows = generateExcelPreview();

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      
      {/* 區塊 A: 頂部路徑選擇 (管理編輯目標) */}
      <div className="card shadow-sm mb-4 border-0">
        <div className="card-header bg-white fw-bold border-bottom">
          <i className="bi bi-pencil-square me-2"></i>編輯路徑設定
        </div>
        <div className="card-body d-flex gap-3 align-items-center">
          <div className="flex-grow-1">
            <label className="small text-muted">Stress</label>
            <select className="form-select" value={selection.s} onChange={e => setSelection({s: e.target.value, t: '', o: ''})}>
              {data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-grow-1">
            <label className="small text-muted">Type</label>
            <select className="form-select" value={selection.t} onChange={e => setSelection({...selection, t: e.target.value, o: ''})}>
              <option value="">選擇 Type</option>
              {currentStress?.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex-grow-1">
            <label className="small text-muted">Operation</label>
            <select className="form-select" value={selection.o} onChange={e => setSelection({...selection, o: e.target.value})}>
              <option value="">選擇 Operation</option>
              {currentType?.ops.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="align-self-end">
            <button className="btn btn-primary px-4">💾 儲存變更</button>
          </div>
        </div>
      </div>

      {/* 區塊 B: PPT 矩陣編輯區 (針對單個 Operation) */}
      <div className="card shadow-sm mb-5 border-0">
        <div className="card-header bg-warning text-dark fw-bold">
          4. Condition 屬性定義 (當前選定步驟)
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-center">
            <thead className="table-light">
              <tr className="small">
                <th>條件名稱</th><th>標題</th><th>單位</th><th>類型</th><th>Range</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentOp?.conds.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td><td>{c.label}</td><td>{c.unit}</td><td>{c.type}</td>
                  <td>{c.range === 'Y' ? '✅' : '❌'}</td>
                  <td><button className="btn btn-sm text-danger">🗑️</button></td>
                </tr>
              ))}
              <tr style={{ backgroundColor: "#fffbe6" }}>
                <td><input className="form-control form-control-sm" placeholder="名稱" /></td>
                <td><input className="form-control form-control-sm" placeholder="標題" /></td>
                <td><input className="form-control form-control-sm" placeholder="單位" /></td>
                <td><select className="form-select form-select-sm"><option>Number</option></select></td>
                <td><input type="checkbox" /></td>
                <td><button className="btn btn-warning btn-sm w-100">新增</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 區塊 C: Excel 全局資料預覽表 (你要的橫向清單) */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span><i className="bi bi-table me-2"></i>全局資料總表 (Excel 預覽)</span>
          <button className="btn btn-sm btn-outline-light">📤 匯出 Excel</button>
        </div>
        <div className="table-responsive" style={{ maxHeight: "400px" }}>
          <table className="table table-sm table-bordered table-striped mb-0 small text-center">
            <thead className="table-secondary sticky-top">
              <tr>
                <th>Stress Name</th>
                <th>Type Name</th>
                <th>Operation</th>
                <th>Condition Name</th>
                <th>UI Label</th>
                <th>Unit</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              {excelRows.map((row, index) => (
                <tr key={index}>
                  <td className="fw-bold">{row.stress}</td>
                  <td className="text-primary">{row.type}</td>
                  <td className="text-success">{row.op}</td>
                  <td>{row.cond}</td>
                  <td>{row.label}</td>
                  <td>{row.unit}</td>
                  <td>{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StressConfigPage;
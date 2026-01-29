import React, { useState } from 'react';
import { Trash2, Plus, Save, Settings, ChevronRight, FileText } from 'lucide-react';

const StressConfigPage = () => {
  const [data, setData] = useState([
    {
      id: "S1", name: "ALT",
      steps: [
        { id: "P1", type: "QT", op: "T0", condition: "125°C / 500hrs / Vcc=3.3V" },
        { id: "P2", type: "QT", op: "T1", condition: "125°C / 1000hrs / Vcc=3.3V" },
        { id: "P3", type: "RA", op: "Post-test", condition: "Room Temp / Functional Check" }
      ]
    },
    {
      id: "S2", name: "BHAST-PCB",
      steps: [
        { id: "P4", type: "Initial", op: "Pre-test", condition: "85°C / 85%RH" }
      ]
    }
  ]);

  const [activeId, setActiveId] = useState("S1");
  const currentStress = data.find(s => s.id === activeId);

  return (
    <div className="container-fluid py-2" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      
      {/* Header Section */}
      <div className="mb-2 px-1 border-bottom pb-2">

        <div className="text-muted small fw-bold mt-1" style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>
          TEST SETTINGS
        </div>
      </div>

      <div className="row g-2">
        {/* Left Sidebar: Stress List & Add Action */}
        <div className="col-md-2">
          <div className="card border shadow-sm rounded-1">
            <div className="list-group list-group-flush rounded-1">
              <div className="list-group-item bg-light py-2 small fw-bold text-secondary">Stress</div>
              {data.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`list-group-item list-group-item-action py-2 border-0 d-flex justify-content-between align-items-center ${activeId === s.id ? 'bg-primary text-white fw-bold' : 'text-dark small'}`}
                >
                  <span className="text-truncate">{s.name}</span>
                  <ChevronRight size={12} className={activeId === s.id ? 'opacity-100' : 'opacity-25'} />
                </button>
              ))}
              {/* Add Stress moved here */}
              <button className="list-group-item list-group-item-action py-2 text-primary small fw-bold text-center border-top bg-white hover-bg-light">
                <Plus size={14} className="me-1" /> Add Stress
              </button>
            </div>
          </div>
        </div>

        {/* Right Content: Excel-style Workflow Grid */}
        <div className="col-md-10">
          <div className="card border shadow-sm rounded-1 overflow-hidden">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center border-bottom">
              <div className="d-flex align-items-center gap-2">
                <FileText size={16} className="text-muted" />
                <span className="fw-bold text-dark small">{currentStress?.name}</span>
              </div>
              <button className="btn btn-success btn-sm px-3 d-flex align-items-center gap-1 py-1 shadow-sm">
                <Save size={14} /> SAVE SETTINGS
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0 align-middle">
                <thead style={{ backgroundColor: "#f1f5f9" }}>
                  <tr className="text-secondary small fw-bold" style={{ fontSize: '0.75rem' }}>
                    <th className="text-center py-2" style={{ width: "50px" }}>STEP</th>
                    <th className="ps-2">TYPE</th>
                    <th className="ps-2">OPERATION</th>
                    <th className="ps-2">CONDITION</th>
                    <th className="text-center" style={{ width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentStress?.steps.map((step, index) => (
                    <tr key={step.id}>
                      <td className="text-center text-muted fw-bold bg-light small">{index + 1}</td>
                      <td className="p-0">
                        <input className="form-control form-control-sm border-0 bg-transparent rounded-0 shadow-none px-2" defaultValue={step.type} />
                      </td>
                      <td className="p-0">
                        <input className="form-control form-control-sm border-0 bg-transparent rounded-0 shadow-none px-2 fw-medium" defaultValue={step.op} />
                      </td>
                      <td className="p-0">
                        <input className="form-control form-control-sm border-0 bg-transparent rounded-0 shadow-none px-2" defaultValue={step.condition} />
                      </td>
                      <td className="text-center">
                        <button className="btn btn-link text-danger p-0 shadow-none opacity-75 hover-opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Excel-style Add Row */}
                  <tr style={{ backgroundColor: "rgba(13, 110, 253, 0.03)" }}>
                    <td className="text-center text-primary fw-bold small">+</td>
                    <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent rounded-0 px-2" placeholder="New Type" /></td>
                    <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent rounded-0 px-2" placeholder="New Op" /></td>
                    <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent rounded-0 px-2" placeholder="Input condition string..." /></td>
                    <td className="text-center">
                      <button className="btn btn-primary btn-sm px-2 py-0" style={{ fontSize: '0.7rem' }}>ADD</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-2 text-end">
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>* Steps are automatically numbered sequentially.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressConfigPage;
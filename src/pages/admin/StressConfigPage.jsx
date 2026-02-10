import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, ChevronRight, FileText, AlertCircle, X } from 'lucide-react';

// 使用 window.location.hostname 會自動抓取「你現在網址列顯示的那個 IP」
const API_BASE = `http://${window.location.hostname}:9000`;

const StressConfigPage = () => {
    const [data, setData] = useState([]); // 存儲分組後的 Stress 資料
    const [activeStressName, setActiveStressName] = useState(null); // 以 stress 欄位值作為選中標記
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. 從資料庫抓取並初始化
    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/stress/`);
            const json = await res.json(); // 後端回傳 [{id, name, steps:[]}, ...]
            setData(json);
            if (json.length > 0 && !activeStressName) {
                setActiveStressName(json[0].name);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
            alert("❌ 無法連接資料庫，請檢查後端服務。");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const currentStress = data.find(s => s.name === activeStressName);

    // 2. 更新步驟欄位 (Local)
    const updateStepField = (stepIndex, field, value) => {
        const newData = data.map(s => {
            if (s.name === activeStressName) {
                const newSteps = [...s.steps];
                newSteps[stepIndex][field] = value;
                return { ...s, steps: newSteps };
            }
            return s;
        });
        setData(newData);
    };

    // 3. 新增步驟行 (Local)
    const addStep = () => {
        const newData = data.map(s => {
            if (s.name === activeStressName) {
                return {
                    ...s,
                    steps: [...s.steps, { type: "", operation: "", condition: "", sequence_order: s.steps.length }]
                };
            }
            return s;
        });
        setData(newData);
    };

    // 4. 刪除單一步驟 (Local - 需按 SAVE 才會同步資料庫)
    const deleteStep = (index) => {
        const newData = data.map(s => {
            if (s.name === activeStressName) {
                const newSteps = s.steps.filter((_, i) => i !== index);
                return { ...s, steps: newSteps };
            }
            return s;
        });
        setData(newData);
    };

    // 5. 新增全新的 Stress 類別
    const addNewStress = () => {
        const name = window.prompt("請輸入新的 Stress 名稱 (例如: HTOL):");
        if (!name) return;
        if (data.find(s => s.name === name)) return alert("該名稱已存在！");

        const newEntry = {
            name: name,
            steps: [{ type: "", operation: "", condition: "", sequence_order: 0 }]
        };
        setData([...data, newEntry]);
        setActiveStressName(name);
    };

    // 6. 刪除整個 Stress 類別 (直接同步資料庫)
    const handleDeleteStressGroup = async (stressName) => {
        if (!window.confirm(`確定要刪除整個 "${stressName}" 及其所有步驟嗎？`)) return;

        try {
            const res = await fetch(`${API_BASE}/stress/${stressName}`, { method: 'DELETE' });
            if (res.ok) {
                const newData = data.filter(s => s.name !== stressName);
                setData(newData);
                if (activeStressName === stressName) {
                    setActiveStressName(newData.length > 0 ? newData[0].name : null);
                }
            } else {
                alert("刪除失敗");
            }
        } catch (err) {
            alert("刪除出錯: " + err.message);
        }
    };

    // 7. 儲存至資料庫 (同步 stress 欄位與 steps)
    const handleSave = async () => {
        if (!currentStress) return;
        setIsSaving(true);
        try {
            const payload = {
                stress: currentStress.name, // 對應後端 stress 欄位
                steps: currentStress.steps,
                created_by: "Admin"
            };

            const res = await fetch(`${API_BASE}/stress/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`✅ ${currentStress.name} 配置已成功儲存至資料庫`);
                fetchConfigs(); 
            } else {
                const err = await res.json();
                throw new Error(err.detail || "儲存失敗");
            }
        } catch (err) {
            alert(`❌ 錯誤: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-5 text-center text-muted">Loading...</div>;

    return (
        <div className="container-fluid py-2" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* Header */}
            <div className="mb-2 px-1 border-bottom pb-2 d-flex justify-content-between align-items-center">
                <div className="text-muted small fw-bold" style={{ fontSize: '1rem' }}>
                    CONFIGURATION MAINTENANCE
                </div>
                {currentStress && (
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-success btn-sm px-4 d-flex align-items-center gap-2">
                        {isSaving ? "SAVING..." : <><Save size={14} /> SAVE SETTINGS</>}
                    </button>
                )}
            </div>

            <div className="row g-2">
                {/* 左側：Stress 列表 */}
                <div className="col-md-2">
                    <div className="card border shadow-sm">
                        <div className="list-group list-group-flush">
                            <div className="list-group-item bg-light py-2 small fw-bold text-secondary">Stress List</div>
                            {data.map(s => (
                                <div 
                                    key={s.name}
                                    className={`list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center p-2 ${activeStressName === s.name ? 'bg-primary text-white fw-bold' : 'text-dark small'}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setActiveStressName(s.name)}
                                >
                                    <span className="text-truncate">{s.name}</span>
                                    <div className="d-flex align-items-center gap-1">
                                        <button 
                                            className={`btn btn-link p-0 ${activeStressName === s.name ? 'text-white' : 'text-danger'} opacity-50 hover-opacity-100`}
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStressGroup(s.name); }}
                                        >
                                            <X size={14} />
                                        </button>
                                        <ChevronRight size={12} className={activeStressName === s.name ? 'opacity-100' : 'opacity-25'} />
                                    </div>
                                </div>
                            ))}
                            <button onClick={addNewStress} className="list-group-item list-group-item-action py-2 text-primary small fw-bold text-center border-top">
                                <Plus size={14} /> Add Stress
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右側：編輯表格 */}
                <div className="col-md-10">
                    {!currentStress ? (
                        <div className="card p-5 text-center text-muted border-dashed">
                            <AlertCircle className="mx-auto mb-2" size={32} />
                            Please select a Stress from the list.
                        </div>
                    ) : (
                        <div className="card border shadow-sm rounded-1">
                            <div className="card-header bg-white py-2 d-flex align-items-center gap-2">
                                <FileText size={16} className="text-muted" />
                                <span className="fw-bold small">{activeStressName} Workflow</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm mb-0">
                                    <thead className="table-light">
                                        <tr className="small text-secondary">
                                            <th className="text-center" style={{ width: "50px" }}>STEP</th>
                                            <th>TYPE</th>
                                            <th>OPERATION</th>
                                            <th>CONDITION</th>
                                            <th className="text-center" style={{ width: "50px" }}>DEL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentStress.steps.map((step, index) => (
                                            <tr key={index}>
                                                <td className="text-center bg-light fw-bold small">{index + 1}</td>
                                                <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent shadow-none" value={step.type || ""} onChange={(e) => updateStepField(index, 'type', e.target.value)} /></td>
                                                <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent shadow-none" value={step.operation || ""} onChange={(e) => updateStepField(index, 'operation', e.target.value)} /></td>
                                                <td className="p-0"><input className="form-control form-control-sm border-0 bg-transparent shadow-none" value={step.condition || ""} onChange={(e) => updateStepField(index, 'condition', e.target.value)} /></td>
                                                <td className="text-center">
                                                    <button onClick={() => deleteStep(index)} className="btn btn-link text-danger p-0 shadow-none"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan="5" className="p-0">
                                                <button onClick={addStep} className="btn btn-link btn-sm w-100 text-decoration-none py-2">+ Insert Step</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StressConfigPage;
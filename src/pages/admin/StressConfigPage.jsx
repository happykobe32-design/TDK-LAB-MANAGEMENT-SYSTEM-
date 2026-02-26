import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, ChevronRight, X } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:8000`;

const StressConfigPage = () => {
    const [data, setData] = useState([]); 
    const [activeStressName, setActiveStressName] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const groupByStress = (rawList) => {
        if (!Array.isArray(rawList)) return [];
        const groups = {};
        rawList.forEach(item => {
            if (!groups[item.stress]) {
                groups[item.stress] = { name: item.stress, steps: [] };
            }
            groups[item.stress].steps.push({
                stress_test_id: item.stress_test_id,
                type: item.type || "",
                operation: item.operation || "",
                condition: item.condition || "",
                sequence_order: item.sequence_order || 0
            });
        });
        const result = Object.values(groups);
        result.forEach(g => g.steps.sort((a, b) => a.sequence_order - b.sequence_order));
        return result;
    };

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/stress-test-settings/`);
            if (!res.ok) throw new Error("無法取得設定資料");
            const json = await res.json(); 
            const formattedData = groupByStress(json);
            setData(formattedData);
            if (formattedData.length > 0 && !activeStressName) {
                setActiveStressName(formattedData[0].name);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConfigs(); }, []);

    const currentStress = data?.find(s => s.name === activeStressName);

    // 新增步驟
    const addStep = (targetStressName = activeStressName) => {
        if (!targetStressName) return;
        setData(prev => prev.map(s => {
            if (s.name === targetStressName) {
                const steps = s.steps || [];
                const nextOrder = steps.length > 0 
                    ? Math.max(...steps.map(st => st.sequence_order)) + 1 
                    : 0;
                return {
                    ...s,
                    steps: [...steps, { type: "", operation: "", condition: "", sequence_order: nextOrder }]
                };
            }
            return s;
        }));
    };

    // 更新欄位
    const updateField = (index, field, value) => {
        setData(prev => prev.map(s => {
            if (s.name === activeStressName) {
                const newSteps = [...(s.steps || [])];
                newSteps[index] = { ...newSteps[index], [field]: value };
                return { ...s, steps: newSteps };
            }
            return s;
        }));
    };

    // 儲存邏輯
    const handleSave = async () => {
        if (!currentStress || !currentStress.steps) return;
        setIsSaving(true);
        try {
            for (const step of currentStress.steps) {
                // 如果是全空的步驟則跳過不存
                if (!step.type && !step.operation && !step.condition) continue;

                const payload = {
                    stress: currentStress.name,
                    type: step.type || "",
                    operation: step.operation || "",
                    condition: step.condition || "",
                    sequence_order: parseInt(step.sequence_order) || 0
                };

                const url = step.stress_test_id 
                    ? `${API_BASE}/stress-test-settings/${step.stress_test_id}` 
                    : `${API_BASE}/stress-test-settings/`;
                
                const res = await fetch(url, {
                    method: step.stress_test_id ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("儲存過程中發生錯誤");
            }
            alert("✅ 儲存成功");
            fetchConfigs();
        } catch (err) {
            alert(`❌ 儲存失敗: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // 刪除步驟
    const deleteStep = async (index, step) => {
        if (!window.confirm("確定刪除此步驟？")) return;
        if (step.stress_test_id) {
            try {
                await fetch(`${API_BASE}/stress-test-settings/${step.stress_test_id}`, { method: 'DELETE' });
            } catch (e) { console.error("Delete failed"); }
        }
        setData(prev => prev.map(s => {
            if (s.name === activeStressName) {
                const filtered = (s.steps || []).filter((_, i) => i !== index);
                return { ...s, steps: filtered.map((st, i) => ({ ...st, sequence_order: i })) };
            }
            return s;
        }));
    };

    if (loading) return <div className="p-5 text-center text-muted">Loading configuration...</div>;

    return (
        <div className="container-fluid py-2" style={{ backgroundColor: "#f4f7f9", minHeight: "100vh" }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-2 px-0">
                <h6 className="mb-0 text-secondary fw-bold" style={{ fontSize: '1rem', letterSpacing: '1px' }}>
                    Test settings
                </h6>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className={`btn btn-sm ${isSaving ? 'btn-secondary' : 'btn-success'} px-4 shadow-sm fw-bold`}
                >
                    <Save size={14} className="me-1" /> {isSaving ? "SAVING..." : "SAVE CHANGES"}
                </button>
            </div>

            <div className="row g-2">
                {/* 左側 Stress List */}
                <div className="col-md-3 col-lg-2">
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                        <div className="list-group list-group-flush">
                            <div className="list-group-item bg-light small fw-bold text-muted py-2">STRESS LIST</div>
                            {data.map(s => (
                                <button 
                                    key={s.name} 
                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 py-2 small ${activeStressName === s.name ? 'bg-primary text-white shadow-sm' : ''}`}
                                    onClick={() => setActiveStressName(s.name)}
                                >
                                    <span className="text-truncate">{s.name}</span>
                                    <ChevronRight size={12} opacity={activeStressName === s.name ? 1 : 0.3} />
                                </button>
                            ))}
                            <button 
                                className="list-group-item list-group-item-action text-primary small py-3 fw-bold border-0 text-center"
                                onClick={() => {
                                    const name = prompt("Enter Stress Name:");
                                    if (name) {
                                        const newEntry = { name, steps: [{ type: "", operation: "", condition: "", sequence_order: 0 }] };
                                        setData([...data, newEntry]);
                                        setActiveStressName(name);
                                    }
                                }}
                            >
                                <Plus size={14} className="me-1" /> Add  Stress
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右側 Workflow 編輯區 */}
                <div className="col-md-9 col-lg-10">
                    {currentStress ? (
                        <div className="card border-0 shadow-sm rounded-3">
                            <div className="card-header bg-white py-2 border-bottom">
                                <span className="badge bg-soft-primary text-primary me-2">Active</span>
                                <span className="fw-bold small">{activeStressName} Workflow</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
                                            <th className="ps-3" style={{ width: "60px" }}>Step</th>
                                            <th>Type</th>
                                            <th>Operation</th>
                                            <th>Condition</th>
                                            <th className="text-center" style={{ width: "60px" }}>Del</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(currentStress.steps || []).map((step, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-3 text-muted small fw-bold">{idx + 1}</td>
                                                <td className="p-1">
                                                    <input className="form-control form-control-sm border-0 bg-light" value={step.type} onChange={e => updateField(idx, 'type', e.target.value)} placeholder="Type..." />
                                                </td>
                                                <td className="p-1">
                                                    <input className="form-control form-control-sm border-0 bg-light" value={step.operation} onChange={e => updateField(idx, 'operation', e.target.value)} placeholder="Operation..." />
                                                </td>
                                                <td className="p-1">
                                                    <input className="form-control form-control-sm border-0 bg-light" value={step.condition} onChange={e => updateField(idx, 'condition', e.target.value)} placeholder="Condition..." />
                                                </td>
                                                <td className="text-center">
                                                    <button className="btn btn-link btn-sm text-danger p-0" onClick={() => deleteStep(idx, step)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div 
                                    className="text-center py-2 bg-white border-top small text-primary fw-bold" 
                                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                    onClick={() => addStep()}
                                    onMouseOver={(e) => e.target.style.background = "#f8f9fa"}
                                    onMouseOut={(e) => e.target.style.background = "white"}
                                >
                                    <Plus size={14} className="me-1" /> New Step
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                            <Plus size={48} className="mb-2" opacity={0.2} />
                            <p className="small">Select a Stress from the list to start editing</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .bg-soft-primary { background-color: #e7f1ff; }
                .form-control-sm:focus { background-color: #fff !important; box-shadow: none; border: 1px solid #0d6efd !important; }
                .list-group-item.active { background-color: #0d6efd !important; }
                table input::placeholder { color: #ccc; font-size: 0.75rem; }
            `}} />
        </div>
    );
};

export default StressConfigPage;
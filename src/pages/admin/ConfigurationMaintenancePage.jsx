import { useEffect, useState } from "react";
import { FaTrashAlt, FaEdit, FaPlus, FaCogs } from "react-icons/fa"; // 請確保已執行 npm install react-icons
import "../../assets/RunCardCreatePage.css"; 

const EMPTY_MASTER = {
  productFamilies: [],
  products: [],
};

export default function ConfigurationMaintenancePage() {
  const [master, setMaster] = useState(EMPTY_MASTER);
  const [showFamilyInput, setShowFamilyInput] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterFamilyId, setFilterFamilyId] = useState("ALL");

  // 1. 載入資料 (LocalStorage)
  useEffect(() => {
    const saved = localStorage.getItem("config_master");
    if (saved) {
      try { setMaster(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // 2. 儲存資料
  const saveMaster = (next) => {
    setMaster(next);
    localStorage.setItem("config_master", JSON.stringify(next));
  };

  // --- 家族設定邏輯 ---
  const handleAddFamily = () => {
    if (!newFamilyName.trim()) return;
    const next = {
      ...master,
      productFamilies: [...master.productFamilies, { id: "PF_" + Date.now(), name: newFamilyName.trim() }]
    };
    saveMaster(next);
    setNewFamilyName("");
    setShowFamilyInput(false);
  };

  const deleteFamily = (id, e) => {
    e.stopPropagation(); // 防止觸發行點擊的篩選功能
    if (!window.confirm("Are you sure you want to delete this family and all its products?")) return;
    saveMaster({
      ...master,
      productFamilies: master.productFamilies.filter(f => f.id !== id),
      products: master.products.filter(p => p.familyId !== id)
    });
    if (filterFamilyId === id) setFilterFamilyId("ALL");
  };

  // --- 產品設定邏輯 ---
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        id: "P_" + Date.now(),
        familyId: filterFamilyId !== "ALL" ? filterFamilyId : "",
        internalName: "",
        productName: "",
        version: "",
      });
    }
  };

  const deleteProduct = (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    saveMaster({
      ...master,
      products: master.products.filter(p => p.id !== id)
    });
  };

  const handleSaveProduct = () => {
    if (!editingProduct.familyId || !editingProduct.productName) return alert("請填寫必要資訊");
    const exists = master.products.find(p => p.id === editingProduct.id);
    const nextProducts = exists
      ? master.products.map(p => p.id === editingProduct.id ? editingProduct : p)
      : [...master.products, editingProduct];

    saveMaster({ ...master, products: nextProducts });
    setEditingProduct(null);
  };

  // --- 計算篩選後的產品清單 ---
  const filteredProducts = filterFamilyId === "ALL" 
    ? master.products 
    : master.products.filter(p => p.familyId === filterFamilyId);

  return (
    <div className="container-fluid mt-3 px-4">
      
      {/* --- 新增頁面標題 --- */}
      <div className="mb-4 shadow-sm p-3 bg-white rounded border-start border-primary border-5">
        <h4 className="mb-0 fw-bold text-dark">
          <FaCogs className="me-2 text-primary" />
          Product Family
        </h4>
      </div>

      <div className="row g-4">
        {/* --- 左側：家族設定 (改用垃圾桶圖示) --- */}
        <div className="col-lg-3 col-md-4">
          <div className="card shadow-sm border-0 mb-4 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
              <span className="fw-bold text-secondary">Product Family List</span>
              <button className="btn btn-sm btn-outline-primary border px-2" onClick={() => setShowFamilyInput(true)}>
                <FaPlus size={12} className="mb-1" /> Add
              </button>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 small">FAMILY NAME</th>
                    <th className="text-center small" style={{ width: "60px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {master.productFamilies.map(f => (
                    <tr 
                      key={f.id} 
                      onClick={() => setFilterFamilyId(f.id)} 
                      style={{ cursor: "pointer" }}
                      className={filterFamilyId === f.id ? "table-primary" : ""}
                    >
                      <td className="ps-3 align-middle fw-medium">{f.name}</td>
                      <td className="text-center">
                        <button className="btn btn-link text-danger p-1" onClick={(e) => deleteFamily(f.id, e)}>
                          <FaTrashAlt size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {showFamilyInput && (
                    <tr className="table-warning">
                      <td className="p-2" colSpan="2">
                        <div className="input-group input-group-sm">
                          <input className="form-control" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Name..." autoFocus />
                          <button className="btn btn-success" onClick={handleAddFamily}>OK</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- 右側：產品清單 (增加刪除按鈕與外框) --- */}
        <div className="col-lg-9 col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-secondary text-nowrap">Product List :</span>
                  <select 
                    className="form-select form-select-sm ms-3 border" 
                    style={{ width: "200px" }}
                    value={filterFamilyId}
                    onChange={(e) => setFilterFamilyId(e.target.value)}
                  >
                    <option value="ALL">--ALL PRODUCT FAMILY--</option>
                    {master.productFamilies.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm px-4 shadow-sm border" onClick={() => openProductModal()}>
                  <FaPlus size={12} className="me-1 mb-1" /> Add
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-center">
                  <thead className="table-light text-secondary small">
                    <tr>
                      <th>PRODUCT FAMILY</th>
                      <th>INTERNAL NAME</th>
                      <th>PRODUCT NAME</th>
                      <th>VERSION</th>
                      <th style={{ width: "160px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td className="text-muted small">{master.productFamilies.find(f => f.id === p.familyId)?.name}</td>
                          <td>{p.internalName || "-"}</td>
                          <td className="fw-bold text-primary">{p.productName}</td>
                          <td>{p.version || "-"}</td>
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                              <button className="btn btn-sm btn-outline-secondary border px-2" onClick={() => openProductModal(p)}>
                                <FaEdit size={12} className="mb-1" /> Edit
                              </button>
                              <button className="btn btn-sm btn-outline-danger border px-2" onClick={() => deleteProduct(p.id)}>
                                <FaTrashAlt size={12} className="mb-1" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-5 text-muted">Currently no product data matches.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 產品編輯 Modal --- */}
      {editingProduct && (
        <div className="modal d-block shadow" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-bottom">
                <h6 className="modal-title fw-bold">Product Configuration</h6>
                <button className="btn-close" onClick={() => setEditingProduct(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted">Product Family</label>
                    <select className="form-select border" value={editingProduct.familyId} onChange={e => setEditingProduct({...editingProduct, familyId: e.target.value})}>
                      <option value="">-- Select Family --</option>
                      {master.productFamilies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted">Product Name</label>
                    <input className="form-control border" value={editingProduct.productName} onChange={e => setEditingProduct({...editingProduct, productName: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Internal Name</label>
                    <input className="form-control border" value={editingProduct.internalName} onChange={e => setEditingProduct({...editingProduct, internalName: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Version</label>
                    <input className="form-control border" value={editingProduct.version} onChange={e => setEditingProduct({...editingProduct, version: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-0">
                <button className="btn btn-secondary btn-sm px-4 border" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm px-4 shadow-sm border" onClick={handleSaveProduct}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
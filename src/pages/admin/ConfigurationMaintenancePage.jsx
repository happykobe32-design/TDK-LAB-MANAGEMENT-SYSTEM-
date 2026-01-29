import { useEffect, useState } from "react";
import { FaTrashAlt, FaEdit, FaPlus, FaCogs, FaDatabase } from "react-icons/fa"; 

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

  // --- Family Logic ---
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
    e.stopPropagation();
    if (!window.confirm("Delete this family and all associated products?")) return;
    saveMaster({
      ...master,
      productFamilies: master.productFamilies.filter(f => f.id !== id),
      products: master.products.filter(p => p.familyId !== id)
    });
    if (filterFamilyId === id) setFilterFamilyId("ALL");
  };

  // --- Product Logic ---
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        id: "P_" + Date.now(),
        familyId: filterFamilyId !== "ALL" ? filterFamilyId : "",
        productName: "",
      });
    }
  };

  const deleteProduct = (id) => {
    if (!window.confirm("Delete this product?")) return;
    saveMaster({
      ...master,
      products: master.products.filter(p => p.id !== id)
    });
  };

  const handleSaveProduct = () => {
    if (!editingProduct.familyId || !editingProduct.productName) return alert("Required fields missing");
    const exists = master.products.find(p => p.id === editingProduct.id);
    const nextProducts = exists
      ? master.products.map(p => p.id === editingProduct.id ? editingProduct : p)
      : [...master.products, editingProduct];

    saveMaster({ ...master, products: nextProducts });
    setEditingProduct(null);
  };

  const filteredProducts = filterFamilyId === "ALL" 
    ? master.products 
    : master.products.filter(p => p.familyId === filterFamilyId);

  return (
    <div className="container-fluid py-2 px-3" style={{ backgroundColor: "#fbfbfb", minHeight: "100vh" }}>
      
      {/* Small Label Header */}
      <div className="mb-2 px-1 border-bottom pb-1">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted fw-bold" style={{ fontSize: '1rem', letterSpacing: '1px' }}>
            PRODUCT SETTINGS
          </span>
        </div>
      </div>

      <div className="row g-2">
        {/* Left Side: Product Family List */}
        <div className="col-lg-3 col-md-4">
          <div className="card shadow-sm border-0 rounded-1">
            <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="small fw-bold text-secondary">PRODUCT FAMILY LIST</span>
              <button className="btn btn-xs btn-outline-primary py-0 px-2" style={{ fontSize: '0.7rem' }} onClick={() => setShowFamilyInput(true)}>
                <FaPlus className="me-0" />ADD
              </button>
            </div>
            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '75vh' }}>
              <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                <tbody>
                  <tr 
                    className={filterFamilyId === "ALL" ? "table-primary" : ""}
                    onClick={() => setFilterFamilyId("ALL")}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="ps-3 py-2 fw-bold text-primary">All Families</td>
                    <td></td>
                  </tr>
                  {master.productFamilies.map(f => (
                    <tr 
                      key={f.id} 
                      onClick={() => setFilterFamilyId(f.id)} 
                      style={{ cursor: "pointer" }}
                      className={filterFamilyId === f.id ? "table-primary" : ""}
                    >
                      <td className="ps-3 py-2">{f.name}</td>
                      <td className="text-end pe-3">
                        <FaTrashAlt 
                          size={12} 
                          className="text-danger opacity-50 hover-opacity-100" 
                          onClick={(e) => deleteFamily(f.id, e)} 
                        />
                      </td>
                    </tr>
                  ))}
                  {showFamilyInput && (
                    <tr className="table-warning">
                      <td className="p-2" colSpan="2">
                        <div className="input-group input-group-sm">
                          <input className="form-control" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="New Family Name..." autoFocus />
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

        {/* Right Side: Product Data Grid (Excel Style) */}
        <div className="col-lg-9 col-md-8">
          <div className="card shadow-sm border-0 rounded-1 overflow-hidden">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaDatabase size={14} className="text-muted" />
                <span className="fw-bold small">PRODUCT LIST</span>
              </div>
              <button className="btn btn-primary btn-sm px-3 shadow-sm" onClick={() => openProductModal()}>
                <FaPlus className="me-1" /> Add Product
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0 text-center align-middle">
                <thead style={{ backgroundColor: "#f1f5f9" }}>
                  <tr className="text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                    <th style={{ width: "60px" }}>NO</th>
                    <th className="text-start ps-3">PRODUCT FAMILY</th>
                    <th className="text-start ps-3">PRODUCT NAME</th>
                    <th style={{ width: "70px" }}></th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem' }}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p, index) => (
                      <tr key={p.id}>
                        <td className="bg-light fw-bold text-muted small">{index + 1}</td>
                        <td className="text-start ps-3 text-muted">{master.productFamilies.find(f => f.id === p.familyId)?.name}</td>
                        <td className="text-start ps-3 fw-bold text-primary">{p.productName}</td>
                        <td>
                          <div className="d-flex justify-content-center gap-3">
                            <FaEdit className="text-secondary cursor-pointer hover-text-primary" size={14} onClick={() => openProductModal(p)} title="Edit" />
                            <FaTrashAlt className="text-danger opacity-75 cursor-pointer hover-opacity-100" size={14} onClick={() => deleteProduct(p.id)} title="Delete" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-4 text-muted small italic">No product data found in this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Product Modal */}
      {editingProduct && (
        <div className="modal d-block shadow" style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content border-0 rounded-2 shadow">
              <div className="modal-header bg-light py-2">
                <span className="fw-bold small">Product Config</span>
                <button className="btn-close" style={{ fontSize: '0.6rem' }} onClick={() => setEditingProduct(null)}></button>
              </div>
              <div className="modal-body p-3">
                <div className="mb-2">
                  <label className="small fw-bold text-muted mb-1">Family</label>
                  <select className="form-select form-select-sm" value={editingProduct.familyId} onChange={e => setEditingProduct({...editingProduct, familyId: e.target.value})}>
                    <option value="">-- Select --</option>
                    {master.productFamilies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="small fw-bold text-muted mb-1">Product Name</label>
                  <input className="form-control form-control-sm" value={editingProduct.productName} onChange={e => setEditingProduct({...editingProduct, productName: e.target.value})} placeholder="e.g. Model X" />
                </div>
              </div>
              <div className="modal-footer bg-light py-1 border-0">
                <button className="btn btn-outline-secondary btn-sm px-3" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm px-3 shadow-sm" onClick={handleSaveProduct}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
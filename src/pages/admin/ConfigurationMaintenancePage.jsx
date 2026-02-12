import { useEffect, useState, useCallback } from "react";
import { FaTrashAlt, FaEdit, FaPlus, FaDatabase } from "react-icons/fa"; 
import axios from "axios";

// API 基礎路徑 (結尾不帶斜線) 使用 window.location.hostname 會自動抓取「你現在網址列顯示的那個 IP」
const API_BASE = `http://${window.location.hostname}:8000/products`;

export default function ConfigurationMaintenancePage() {
  const [products, setProducts] = useState([]); 
  const [showFamilyInput, setShowFamilyInput] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterFamily, setFilterFamily] = useState("ALL");

  // --- 1. 從後端載入資料 ---
  const fetchProducts = useCallback(async () => {
    try {
      // 確保路徑正確
      const res = await axios.get(`${API_BASE}/`, { params: { limit: 1000 } });
      setProducts(res.data);
    } catch (e) {
      console.error("Failed to fetch products:", e);
      alert("Unable to read the database, please check the backend service."); // 提示用戶檢查後端服務
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // --- 2. 提取唯一的 Family List ---
  const productFamilies = [...new Set(products.map(p => p.product_family).filter(Boolean))];

  // --- 3. Family Logic ---
  const handleAddFamily = () => {
    if (!newFamilyName.trim()) return;
    setFilterFamily(newFamilyName.trim());
    setNewFamilyName("");
    setShowFamilyInput(false);
  };

  // --- 4. Product Logic (CRUD) ---
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        product_family: filterFamily !== "ALL" ? filterFamily : "",
        product_name: "",
        is_active: true
        // 移除資料庫不存在的欄位
      });
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct.product_family || !editingProduct.product_name) {
      return alert("Please fill in the required fields");  //請填寫必填欄位
    }

    try {
      // 重要：根據資料庫結構，我們只傳送需要的欄位
      const payload = {
        product_family: editingProduct.product_family,
        product_name: editingProduct.product_name,
        is_active: editingProduct.is_active
      };

      if (editingProduct.id) { // 注意這裡改用 id
        await axios.put(`${API_BASE}/${editingProduct.id}`, payload);
      } else {
        await axios.post(`${API_BASE}/`, payload);
      }
      setEditingProduct(null);
      fetchProducts(); 
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed, please check the field format or backend.");  // 提示用戶檢查欄位格式或後端服務
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product？")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`); // 使用正確的 id
      fetchProducts(); 
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Delete failed.");
    }
  };

  const filteredProducts = filterFamily === "ALL" 
    ? products 
    : products.filter(p => p.product_family === filterFamily);

  return (
    <div className="container-fluid py-2 px-0" style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>
      
      <div className="mb-2 px-1 border-bottom pb-1">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted fw-bold" style={{ fontSize: '1rem', letterSpacing: '1px' }}>
            PRODUCT SETTINGS
          </span>
        </div>
      </div>

      <div className="row g-2">
        {/* Left Side: Family List */}
        <div className="col-lg-3 col-md-4">
          <div className="card shadow-sm border-0 rounded-1">
            <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="small fw-bold text-secondary">PRODUCT FAMILY</span>
              <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => setShowFamilyInput(true)}>
                <FaPlus size={10} /> ADD
              </button>
            </div>
            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '75vh' }}>
              <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                <tbody>
                  <tr 
                    className={filterFamily === "ALL" ? "table-primary" : ""}
                    onClick={() => setFilterFamily("ALL")}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="ps-3 py-2 fw-bold text-primary">All Families</td>
                  </tr>
                  {productFamilies.map(name => (
                    <tr 
                      key={name} 
                      onClick={() => setFilterFamily(name)} 
                      style={{ cursor: "pointer" }}
                      className={filterFamily === name ? "table-primary" : ""}
                    >
                      <td className="ps-3 py-2">{name}</td>
                    </tr>
                  ))}
                  {showFamilyInput && (
                    <tr className="table-warning">
                      <td className="p-2">
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

        {/* Right Side: Product Grid */}
        <div className="col-lg-9 col-md-8">
          <div className="card shadow-sm border-0 rounded-1 overflow-hidden">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <FaDatabase size={14} className="text-muted" />
                <span className="fw-bold small">PRODUCT LIST ({filteredProducts.length})</span>
              </div>
              <button className="btn btn-primary btn-sm px-3 shadow-sm" onClick={() => openProductModal()}>
                <FaPlus className="me-1" /> Add Product
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0 text-center align-middle">
                <thead style={{ backgroundColor: "#f9f5f1" }}>
                  <tr className="text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                    <th style={{ width: "30px" }}>NO</th>
                    <th className="text-start ps-3">PRODUCT FAMILY</th>
                    <th className="text-start ps-3">PRODUCT NAME</th>
                    <th style={{ width: "80px" }}></th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.85rem' }}>
                  {filteredProducts.map((p, index) => (
                    <tr key={p.id}> {/* 改用 p.id */}
                      <td className="bg-light fw-bold text-muted small">{index + 1}</td>
                      <td className="text-start ps-3 text-muted">{p.product_family}</td>
                      <td className="text-start ps-3 fw-bold text-primary">{p.product_name}</td>
                      <td>
                        <div className="d-flex justify-content-center gap-3">
                          <FaEdit className="text-secondary cursor-pointer" size={14} onClick={() => openProductModal(p)} />
                          <FaTrashAlt className="text-danger opacity-75 cursor-pointer" size={14} onClick={() => handleDeleteProduct(p.id)} /> {/* 改用 p.id */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editingProduct && (
        <div className="modal d-block shadow" style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content border-0 rounded-2">
              <div className="modal-header bg-light py-2">
                <span className="fw-bold small">{editingProduct.id ? "Edit Product" : "New Product"}</span>
                <button className="btn-close" style={{ fontSize: '0.6rem' }} onClick={() => setEditingProduct(null)}></button>
              </div>
              <div className="modal-body p-3">
                <div className="mb-2">
                  <label className="small fw-bold text-muted mb-1">Family</label>
                  <input 
                    className="form-control form-control-sm" 
                    value={editingProduct.product_family || ""} 
                    onChange={e => setEditingProduct({...editingProduct, product_family: e.target.value})} 
                    placeholder="e.g. Motion"
                  />
                </div>
                <div>
                  <label className="small fw-bold text-muted mb-1">Product Name</label>
                  <input 
                    className="form-control form-control-sm" 
                    value={editingProduct.product_name || ""} 
                    onChange={e => setEditingProduct({...editingProduct, product_name: e.target.value})} 
                    placeholder="e.g. XAN" 
                  />
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
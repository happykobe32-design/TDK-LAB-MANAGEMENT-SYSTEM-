import { useEffect, useState } from "react";
import "../../assets/RunCardCreatePage.css";

/**
 * config_master 結構（唯一資料來源）
 * {
 *   productFamilies: [{ id, name }],
 *   products: [{
 *     id,
 *     familyId,
 *     internalName,
 *     productName,
 *     version,
 *     dbPn,
 *     spec
 *   }]
 * }
 */

const EMPTY_MASTER = {
  productFamilies: [],
  products: [],
};

export default function ConfigurationMaintenancePage() {
  const [master, setMaster] = useState(EMPTY_MASTER);

  // Product Family 新增用
  const [newFamilyName, setNewFamilyName] = useState("");

  // Product 編輯區
  const [editingProduct, setEditingProduct] = useState(null);

  // =============================
  // Load / Save
  // =============================
  useEffect(() => {
    const saved = localStorage.getItem("config_master");
    if (saved) {
      try {
        setMaster(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveMaster = (next) => {
    setMaster(next);
    localStorage.setItem("config_master", JSON.stringify(next));
  };

  // =============================
  // Product Family（圖二）
  // =============================
  const addFamily = () => {
    if (!newFamilyName.trim()) return;
    saveMaster({
      ...master,
      productFamilies: [
        ...master.productFamilies,
        { id: "PF_" + Date.now(), name: newFamilyName.trim() },
      ],
    });
    setNewFamilyName("");
  };

  const updateFamily = (id, name) => {
    saveMaster({
      ...master,
      productFamilies: master.productFamilies.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
    });
  };

  const deleteFamily = (id) => {
    if (!window.confirm("刪除此家族，底下產品也會一起刪除，確定？")) return;
    saveMaster({
      productFamilies: master.productFamilies.filter((f) => f.id !== id),
      products: master.products.filter((p) => p.familyId !== id),
    });
  };

  // =============================
  // Product（圖一）
  // =============================
  const startNewProduct = () => {
    setEditingProduct({
      id: "P_" + Date.now(),
      familyId: "",
      internalName: "",
      productName: "",
      version: "",
      dbPn: "",
      spec: "",
    });
  };

  const saveProduct = () => {
    if (!editingProduct.familyId || !editingProduct.productName) {
      return alert("請選擇 Product Family 並填寫 Product Name");
    }

    const exists = master.products.some((p) => p.id === editingProduct.id);
    const nextProducts = exists
      ? master.products.map((p) =>
          p.id === editingProduct.id ? editingProduct : p
        )
      : [...master.products, editingProduct];

    saveMaster({ ...master, products: nextProducts });
    setEditingProduct(null);
  };

  const editProduct = (p) => {
    setEditingProduct({ ...p });
  };

  const deleteProduct = (id) => {
    if (!window.confirm("確定刪除此 Product？")) return;
    saveMaster({
      ...master,
      products: master.products.filter((p) => p.id !== id),
    });
  };

  // =============================
  // Render
  // =============================
  return (
    <div className="container-xl mt-4">
      <h3 className="fw-bold mb-4">Configuration Maintenance</h3>

      {/* ================= 家族設定（圖二） ================= */}
      <div className="card mb-5 p-3">
        <h5 className="fw-bold mb-3">家族設定 (Product Family)</h5>

        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>條件名稱</th>
              <th style={{ width: 160 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {master.productFamilies.map((f) => (
              <tr key={f.id}>
                <td>
                  <input
                    className="form-control"
                    value={f.name}
                    onChange={(e) => updateFamily(f.id, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteFamily(f.id)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {master.productFamilies.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-muted">
                  尚無資料
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="d-flex gap-2 mt-2">
          <input
            className="form-control"
            placeholder="新增家族名稱"
            value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addFamily}>
            確定
          </button>
        </div>
      </div>

      {/* ================= 產品編輯（圖一） ================= */}
      <div className="card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">產品編輯 (Product)</h5>
          <button className="btn btn-success" onClick={startNewProduct}>
            新增產品
          </button>
        </div>

        {/* 編輯表單 */}
        {editingProduct && (
          <div className="border rounded p-3 mb-4">
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Product Family</label>
                <select
                  className="form-select"
                  value={editingProduct.familyId}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      familyId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Select --</option>
                  {master.productFamilies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Internal Name</label>
                <input
                  className="form-control"
                  value={editingProduct.internalName}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      internalName: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Product Name</label>
                <input
                  className="form-control"
                  value={editingProduct.productName}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      productName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Product Version</label>
                <input
                  className="form-control"
                  value={editingProduct.version}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      version: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">DB PN</label>
                <input
                  className="form-control"
                  value={editingProduct.dbPn}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      dbPn: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Product Spec</label>
                <input
                  className="form-control"
                  value={editingProduct.spec}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      spec: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={saveProduct}>
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingProduct(null)}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Product List */}
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Product Name</th>
              <th>Family</th>
              <th style={{ width: 160 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {master.products.map((p) => (
              <tr key={p.id}>
                <td>{p.productName}</td>
                <td>
                  {master.productFamilies.find((f) => f.id === p.familyId)?.name || "-"}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-info me-2"
                    onClick={() => editProduct(p)}
                  >
                    編輯
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteProduct(p.id)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {master.products.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  尚無產品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/pages/RunCardEditPage.jsx 單筆編輯頁面
export default function RunCardEditPage({
  editingId,
  editFormData,
  handleEditFormChange,
  handleEditSubmit,
  setPage,
}) {
  return (
    <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="card-header">
        <h3 className="card-title">✏️ 編輯 Run Card</h3>
      </div>

      <div className="card-body">
        <div className="alert alert-info mb-4">
          Run Card ID：<strong>{editingId}</strong>
        </div>

        <div className="row g-3">
          {[
            ["product", "Product"],
            ["lotId", "Lot ID"],
            ["stress", "Stress"],
            ["cycle", "Cycle"],
            ["testProgram", "Test Program"],
            ["testScript", "Test Script"],
            ["note", "Note"],
          ].map(([key, label]) => (
            <div className="col-md-6" key={key}>
              <label className="form-label">{label}</label>
              <input
                className="form-control"
                name={key}
                value={editFormData[key] || ""}
                onChange={handleEditFormChange}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 d-flex justify-content-between">
          <button className="btn btn-outline-secondary" onClick={() => setPage("list")}>
            取消
          </button>
          <button className="btn btn-success" onClick={handleEditSubmit}>
            儲存修改
          </button>
        </div>
      </div>
    </div>
  );
}

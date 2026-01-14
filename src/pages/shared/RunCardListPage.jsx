import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * ViewSearchPage (Master View)
 * - List view (AG Grid) with KPI + filters (KEEP your original style vibe)
 * - Details sidebar removed
 * - Progress column REMOVED (per latest requirement)
 * - Edit opens a large modal: ONE-PAGE master traveler (Create fields + Check In/Out steps)
 * - Save writes back to localStorage "all_projects" so Check In/Out sees the same updated data
 * - Qty In / Qty Out / Hardware are NOT shown in the master form (per requirement)
 * - Master form header fields: follow LIST column order as the ONLY 기준 (except Status not shown inside form)
 */
export default function ViewSearchPage({ userRole, handleEdit, handleDelete }) {
  const [allProjects, setAllProjects] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // ---- Master Edit Modal ----
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null); // { projectId, lotId }
  const [editDraft, setEditDraft] = useState(null); // full project object (deep clone)
  const [editLotId, setEditLotId] = useState("");
  const [editError, setEditError] = useState("");

  const loadAll = useCallback(() => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    setAllProjects(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------- Helpers ----------
  const formatNow = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes()) +
      ":" +
      pad(d.getSeconds())
    );
  };

  const computeLotStatus = (lot) => {
    const allRows = (lot?.stresses || []).flatMap((s) => s?.rowData || []);
    const isAllDone =
      allRows.length > 0 && allRows.every((r) => r.endTime && r.endTime !== "");
    const isAnyStarted = allRows.some((r) => r.startTime && r.startTime !== "");

    let lotStatus = "Init";
    if (isAllDone && allRows.length > 0) lotStatus = "completed";
    else if (isAnyStarted) lotStatus = "in-process";
    return { lotStatus, allRows };
  };

  const openMasterEdit = (projectId, lotId) => {
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const proj = (Array.isArray(data) ? data : []).find(
      (p) => p?.header?.["Product ID"] === projectId
    );
    if (!proj) {
      alert("Project not found in localStorage.");
      return;
    }

    const clone = JSON.parse(JSON.stringify(proj));
    const targetLot =
      (clone.lots || []).find((l) => l?.lotId === lotId) ||
      (clone.lots || [])[0] ||
      null;

    setEditingMeta({ projectId, lotId });
    setEditDraft(clone);
    setEditLotId(targetLot?.lotId || "");
    setEditError("");
    setIsEditOpen(true);
  };

  const closeMasterEdit = () => {
    setIsEditOpen(false);
    setEditingMeta(null);
    setEditDraft(null);
    setEditLotId("");
    setEditError("");
  };

  const saveMasterEdit = () => {
    if (!editDraft || !editingMeta) return;

    // Required: update Status_Update_Time
    const now = formatNow();
    if (!editDraft.header) editDraft.header = {};
    editDraft.header["Status_Update_Time"] = now;

    // Write back to localStorage by matching original projectId (Product ID)
    const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
    const arr = Array.isArray(data) ? data : [];
    const idx = arr.findIndex(
      (p) => p?.header?.["Product ID"] === editingMeta.projectId
    );

    if (idx < 0) {
      setEditError("Save failed: Project not found.");
      return;
    }

    // If user changed Product ID in header, guard duplicate
    const newId = editDraft?.header?.["Product ID"];
    if (newId && newId !== editingMeta.projectId) {
      const dup = arr.findIndex(
        (p, i) => i !== idx && p?.header?.["Product ID"] === newId
      );
      if (dup >= 0) {
        setEditError(`Save failed: Duplicate Product ID "${newId}" already exists.`);
        return;
      }
    }

    arr[idx] = editDraft;
    localStorage.setItem("all_projects", JSON.stringify(arr));
    loadAll();

    // Update editingMeta key if user changed Product ID
    setEditingMeta((m) => {
      if (!m) return m;
      return { ...m, projectId: editDraft?.header?.["Product ID"] || m.projectId };
    });

    setEditError("");
    closeMasterEdit();
  };

  const updateHeaderField = (key, value) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, header: { ...(prev.header || {}) } };
      next.header[key] = value;
      return next;
    });
  };

  const updateRowField = (stressIdx, rowIdx, key, value) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const lot = (next.lots || []).find((l) => l?.lotId === editLotId);
      if (!lot) return next;
      const s = (lot.stresses || [])[stressIdx];
      if (!s) return next;
      if (!s.rowData) s.rowData = [];
      const r = s.rowData[rowIdx];
      if (!r) return next;
      r[key] = value;
      return next;
    });
  };

  // ---------- Build list rows (AG Grid) ----------
  const allRows = useMemo(() => {
    const masterRows = [];
    (allProjects || []).forEach((proj) => {
      const createdDate =
        (proj?.header &&
          (proj.header["Created Date"] || proj.header["Created Date "])) ||
        proj?.createdAt ||
        "";
      const projectId = proj?.header?.["Product ID"] || "";
      const product = proj?.header?.["Product"] || "";
      const owner = proj?.header?.["Owner"] || "";
      const statusUpdateTime = proj?.header?.["Status_Update_Time"] || "";

      (proj?.lots || []).forEach((lot) => {
        const { lotStatus, allRows: steps } = computeLotStatus(lot);
        masterRows.push({
          projectId,
          product,
          owner,
          createdDate,
          statusUpdateTime,
          lotId: lot?.lotId || "",
          status: lotStatus,
          stresses: lot?.stresses || [],
          totalSteps: steps.length,
          completedSteps: steps.filter((r) => r?.endTime).length,
          passRate:
            steps.length > 0
              ? Math.round((steps.filter((r) => r?.endTime).length / steps.length) * 100)
              : 0,
        });
      });
    });
    return masterRows;
  }, [allProjects]);

  const filteredData = useMemo(() => {
    return (allRows || []).filter((item) => {
      const pid = (item.projectId || "").toLowerCase();
      const lot = (item.lotId || "").toLowerCase();
      const prod = (item.product || "").toLowerCase();
      const own = (item.owner || "").toLowerCase();
      const q = (searchText || "").toLowerCase();

      const matchesSearch = pid.includes(q) || lot.includes(q) || prod.includes(q) || own.includes(q);

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesOwner = ownerFilter === "all" || item.owner === ownerFilter;
      const matchesProduct = productFilter === "all" || item.product === productFilter;

      let matchesDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(item.createdDate).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (itemDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end.getTime()) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesOwner && matchesProduct && matchesDate;
    });
  }, [allRows, searchText, statusFilter, ownerFilter, productFilter, startDate, endDate]);

  const cardStatistics = useMemo(() => {
    const total = (allRows || []).length;
    const completed = (allRows || []).filter((p) => p.status === "completed").length;
    const inProcess = (allRows || []).filter((p) => p.status === "in-process").length;
    const init = (allRows || []).filter((p) => p.status === "Init").length;
    return { total, completed, inProcess, init };
  }, [allRows]);

  const globalStatistics = useMemo(() => {
    const totalSteps = (allRows || []).reduce((sum, p) => sum + (p.totalSteps || 0), 0);
    const completedSteps = (allRows || []).reduce((sum, p) => sum + (p.completedSteps || 0), 0);
    const passRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    return { passRate, totalSteps, completedSteps };
  }, [allRows]);

  const owners = useMemo(() => {
    const unique = [...new Set((allRows || []).map((p) => p.owner).filter(Boolean))];
    return unique.sort();
  }, [allRows]);

  const products = useMemo(() => {
    const unique = [...new Set((allRows || []).map((p) => p.product).filter(Boolean))];
    return unique.sort();
  }, [allRows]);

  const handleResetFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setOwnerFilter("all");
    setProductFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const statusCell = (p) => {
    const colors = {
      completed: { bg: "#d1fae5", text: "#065f46", label: "✓ COMPLETED" },
      "in-process": { bg: "#ffedd5", text: "#9a3412", label: "⟳ IN-PROCESS" },
      Init: { bg: "#f1f5f9", text: "#64748b", label: "○ INIT" },
    };
    const config = colors[p.value] || colors.Init;
    return (
      <span
        style={{
          backgroundColor: config.bg,
          color: config.text,
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "bold",
        }}
      >
        {config.label}
      </span>
    );
  };

  // ✅ Column order 기준: Status, Product ID, Lot ID, Product, Owner, Created Date, Status_Update_Time, Manage
  // ✅ Progress removed
  const columnDefs = useMemo(() => {
    const cols = [
      { headerName: "Status", field: "status", width: 120, cellRenderer: statusCell },
      { headerName: "Product ID", field: "projectId", width: 140 },
      { headerName: "Lot ID", field: "lotId", width: 140 },
      { headerName: "Product", field: "product", width: 140 },
      { headerName: "Owner", field: "owner", width: 120 },
      { headerName: "Created Date", field: "createdDate", width: 160 },
      { headerName: "Status_Update_Time", field: "statusUpdateTime", width: 180 },
    ];

    cols.push({
      headerName: "Manage",
      width: 170,
      cellRenderer: (params) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-edit"
            onClick={(e) => {
              e.stopPropagation();
              try {
                if (typeof handleEdit === "function") handleEdit(params.data.projectId);
              } catch (err) {}
              openMasterEdit(params.data.projectId, params.data.lotId);
            }}
            title="Edit (Master Traveler)"
          >
            ✏️ Edit
          </button>
          <button
            className="btn-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete this item?`)) {
                try {
                  if (typeof handleDelete === "function") handleDelete(params.data.projectId);
                } catch (err) {}
                const data = JSON.parse(localStorage.getItem("all_projects") || "[]");
                const updatedData = (Array.isArray(data) ? data : []).filter(
                  (proj) => proj?.header?.["Product ID"] !== params.data.projectId
                );
                localStorage.setItem("all_projects", JSON.stringify(updatedData));
                loadAll();
              }
            }}
            title="Delete project"
          >
            🗑️ Delete
          </button>
        </div>
      ),
    });

    return cols;
  }, [handleEdit, handleDelete, loadAll]);

  // ---------- Master form view model ----------
  // ✅ Form order 기준: follow LIST order (except Status). Then add the remaining create header fields (kept compact).
  const masterHeaderKeys = useMemo(() => {
    return [
      // list order (except Status)
      "Product ID",
      "Lot ID",
      "Product",
      "Owner",
      "Created Date",
      "Status_Update_Time",
      // remaining create fields (keep)
      "Project Family",
      "Version",
      "QR",
      "Remark",
    ];
  }, []);

  const currentLot = useMemo(() => {
    if (!editDraft) return null;
    return (editDraft.lots || []).find((l) => l?.lotId === editLotId) || null;
  }, [editDraft, editLotId]);

  const stepFlat = useMemo(() => {
    if (!currentLot) return [];
    const out = [];
    (currentLot.stresses || []).forEach((s, stressIdx) => {
      const stressName = s?.stress || "";
      (s?.rowData || []).forEach((row, rowIdx) => {
        out.push({
          stressIdx,
          rowIdx,
          stress: stressName,
          operation: row?.operation || "",
          condition: row?.condition || "",
          startTime: row?.startTime || "",
          endTime: row?.endTime || "",
          remark: row?.remark || row?.Remark || "",
        });
      });
    });
    return out;
  }, [currentLot]);

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        background: "#f0f4f8",
        overflow: "hidden",
        flexDirection: "column",
      }}
    >
      {/* ============ 頂部統計摘要區 (keep original vibe) ============ */}
      <div
        style={{
          background: "white",
          padding: "10px 20px",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
            marginBottom: "0px",
          }}
        >
          <div
            className="kpi-card"
            onClick={() => setStatusFilter("all")}
            style={{
              cursor: "pointer",
              opacity: statusFilter === "all" ? 1 : 0.6,
              borderColor: statusFilter === "all" ? "#3b82f6" : "#e2e8f0",
              borderWidth: statusFilter === "all" ? "2px" : "1px",
            }}
          >
            <div className="kpi-label">Total Tests</div>
            <div className="kpi-value">{cardStatistics.total}</div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter("completed")}
            style={{
              cursor: "pointer",
              opacity: statusFilter === "completed" ? 1 : 0.6,
              borderColor: statusFilter === "completed" ? "#10b981" : "#e2e8f0",
              borderWidth: statusFilter === "completed" ? "2px" : "1px",
            }}
          >
            <div className="kpi-label">Completed</div>
            <div className="kpi-value" style={{ color: "#10b981" }}>
              {cardStatistics.completed}
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter("in-process")}
            style={{
              cursor: "pointer",
              opacity: statusFilter === "in-process" ? 1 : 0.6,
              borderColor: statusFilter === "in-process" ? "#f59e0b" : "#e2e8f0",
              borderWidth: statusFilter === "in-process" ? "2px" : "1px",
            }}
          >
            <div className="kpi-label">In-Process</div>
            <div className="kpi-value" style={{ color: "#f59e0b" }}>
              {cardStatistics.inProcess}
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setStatusFilter("Init")}
            style={{
              cursor: "pointer",
              opacity: statusFilter === "Init" ? 1 : 0.6,
              borderColor: statusFilter === "Init" ? "#64748b" : "#e2e8f0",
              borderWidth: statusFilter === "Init" ? "2px" : "1px",
            }}
          >
            <div className="kpi-label">Init</div>
            <div className="kpi-value" style={{ color: "#94a3b8" }}>
              {cardStatistics.init}
            </div>
          </div>

          <div className="kpi-card" style={{ cursor: "default" }}>
            <div className="kpi-label">Pass Rate</div>
            <div className="kpi-value" style={{ color: "#3b82f6" }}>
              {globalStatistics.passRate}%
            </div>
          </div>

          <div className="kpi-card" style={{ cursor: "default" }}>
            <div className="kpi-label">Total Steps</div>
            <div className="kpi-value">
              {globalStatistics.completedSteps}/{globalStatistics.totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* ============ 搜索與篩選區域 ============ */}
      <div style={{ background: "white", padding: "10px 20px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "240px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              🔍 Search (ID / Lot / Product / Owner)
            </label>
            <input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          <button
            className="filter-toggle-btn"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            style={{
              background: showAdvancedFilter ? "#3b82f6" : "#f1f5f9",
              color: showAdvancedFilter ? "white" : "#475569",
            }}
          >
            ⚙️ Advanced
          </button>

          <button className="reset-btn" onClick={handleResetFilters} title="Reset all filters">
            ⟲ Reset
          </button>
        </div>

        {showAdvancedFilter && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Owner
              </label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              >
                <option value="all">All Owners</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Product
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              >
                <option value="all">All Products</option>
                {products.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ============ 主要表格區域 ============ */}
      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", fontWeight: 500 }}>
            📊 Showing {filteredData.length} of {allRows.length} tests
          </div>
          <div className="ag-theme-alpine compact-grid" style={{ flex: 1, width: "100%" }}>
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, resizable: true, filter: false, flex: 1 }}
              pagination={true}
              paginationPageSize={40}
              rowHeight={44}
              headerHeight={40}
              rowClass="grid-row"
            />
          </div>
        </div>
      </div>

      {/* ============ Master Edit Modal (ONE PAGE, no internal search) ============ */}
      {isEditOpen && editDraft && (
        <div
          className="master-modal-overlay"
          onMouseDown={(e) => {
            if (e.target.classList.contains("master-modal-overlay")) closeMasterEdit();
          }}
        >
          <div className="master-modal" role="dialog" aria-modal="true">
            <div className="master-modal-header">
              <div>
                <div className="master-modal-subtitle">MASTER TRAVELER</div>
                <div className="master-modal-title">
                  Product ID: <strong>{editDraft?.header?.["Product ID"] || "-"}</strong> &nbsp; | &nbsp; Lot: <strong>{editLotId || "-"}</strong>
                </div>
              </div>
              <button className="master-close-btn" onClick={closeMasterEdit} title="Close">
                ×
              </button>
            </div>

            <div className="master-modal-body">
              {editError && <div className="master-error">{editError}</div>}

              {/* ONE PAGE: Header fields (compact, order follows LIST columns first) */}
              <div className="master-section">
                <div className="master-section-title">Project Information</div>

                <div className="master-form-grid">
                  {masterHeaderKeys.map((k) => {
                    // Lot ID is from lot, not header
                    const isLotId = k === "Lot ID";
                    const isReadonly = k === "Status_Update_Time" || isLotId;

                    const val = isLotId ? (editLotId || "") : ((editDraft?.header || {})[k] || "");

                    const label = k === "Status_Update_Time" ? "Status_Update_Time (Auto)" : k;

                    // Created Date might be blank in header; allow edit to keep sync (your data sometimes in proj.createdAt)
                    // We keep editable unless you later want lock.
                    return (
                      <div key={k} className="master-field">
                        <label className="master-label">{label}</label>

                        {k === "Remark" ? (
                          <textarea
                            className={`master-input master-textarea ${isReadonly ? "readonly" : ""}`}
                            value={val}
                            disabled={isReadonly}
                            onChange={(e) => updateHeaderField(k, e.target.value)}
                          />
                        ) : (
                          <input
                            className={`master-input ${isReadonly ? "readonly" : ""}`}
                            value={val}
                            disabled={isReadonly}
                            onChange={(e) => {
                              if (isLotId) return;
                              updateHeaderField(k, e.target.value);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Steps / Operation Records (no Qty/Hardware) */}
              <div className="master-section" style={{ marginTop: 12 }}>
                <div className="master-section-title">Operation Records (Check In / Out)</div>

                {!currentLot ? (
                  <div className="master-empty">No lot data found.</div>
                ) : stepFlat.length === 0 ? (
                  <div className="master-empty">No steps recorded.</div>
                ) : (
                  <div className="master-steps-wrap">
                    <table className="master-steps-table">
                      <thead>
                        <tr>
                          <th style={{ width: 120 }}>Lot</th>
                          <th style={{ width: 140 }}>Stress</th>
                          <th>Operation</th>
                          <th>Condition</th>
                          <th style={{ width: 160 }}>Check In</th>
                          <th style={{ width: 160 }}>Check Out</th>
                          <th style={{ width: 220 }}>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stepFlat.map((r, idx) => (
                          <tr key={idx}>
                            <td className="readonly-cell">{editLotId}</td>
                            <td className="readonly-cell">{r.stress}</td>
                            <td>
                              <input className="cell-input" value={r.operation} onChange={(e) => updateRowField(r.stressIdx, r.rowIdx, "operation", e.target.value)} />
                            </td>
                            <td>
                              <input className="cell-input" value={r.condition} onChange={(e) => updateRowField(r.stressIdx, r.rowIdx, "condition", e.target.value)} />
                            </td>
                            <td>
                              <input className="cell-input" value={r.startTime} onChange={(e) => updateRowField(r.stressIdx, r.rowIdx, "startTime", e.target.value)} />
                            </td>
                            <td>
                              <input className="cell-input" value={r.endTime} onChange={(e) => updateRowField(r.stressIdx, r.rowIdx, "endTime", e.target.value)} />
                            </td>
                            <td>
                              <input className="cell-input" value={r.remark} onChange={(e) => updateRowField(r.stressIdx, r.rowIdx, "remark", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="master-note">
                      • This page edits the same data used by Check In / Out (localStorage: <code>all_projects</code>).
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="master-modal-footer">
              <div className="footer-left">
                <div className="footer-hint">Status_Update_Time will be updated automatically on save.</div>
              </div>
              <div className="footer-right">
                <button className="btn-secondary" onClick={closeMasterEdit}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={saveMasterEdit}>
                  Save & Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* KPI 卡片 (restore your original style vibe) */
        .kpi-card{
          background: linear-gradient(135deg, #f8fafc 0%, #eef2f5 100%);
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #e2e8f0;
          box-shadow:0 2px 4px rgba(0,0,0,0.02);
          transition:all .3s;
        }
        .kpi-card:hover{
          box-shadow:0 4px 12px rgba(0,0,0,0.08);
          border-color:#cbd5e1;
          transform:translateY(-2px);
        }
        .kpi-label{
          font-size:11px;
          color:#64748b;
          font-weight:600;
          margin-bottom:4px;
          text-transform:uppercase;
          letter-spacing:.5px
        }
        .kpi-value{font-size:20px;font-weight:bold;color:#1e293b}

        /* 篩選按鈕 */
        .filter-toggle-btn, .reset-btn{
          padding:8px 14px;
          border:1px solid #cbd5e1;
          border-radius:6px;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:all .2s;
          white-space:nowrap;
        }
        .filter-toggle-btn{border:none}
        .reset-btn{
          background:#94a3b8;
          color:white;
          border:none;
        }
        .filter-toggle-btn:hover, .reset-btn:hover{
          transform:translateY(-2px);
          box-shadow:0 4px 8px rgba(0,0,0,0.1);
        }

        /* 表格格線優化 */
        .compact-grid .ag-cell{
          border-right:1px solid #e2e8f0!important;
          display:flex;
          align-items:center;
        }
        .compact-grid .ag-header-cell{
          border-right:1px solid #cbd5e1!important;
          background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          font-weight:700;
          color:#334155;
        }
        .compact-grid .ag-row{
          border-bottom:1px solid #e2e8f0!important;
          transition:background-color .2s;
        }
        .compact-grid .ag-row:hover{background-color:#f8fafc!important}
        .grid-row:hover{background-color:#f0f4f8!important}

        /* 管理按鈕 (keep your original colors) */
        .btn-edit, .btn-delete{
          padding:6px 10px;
          border:none;
          border-radius:5px;
          font-size:11px;
          font-weight:600;
          cursor:pointer;
          transition:all .2s;
        }
        .btn-edit{
          background:#3b82f6;
          color:white;
        }
        .btn-edit:hover{
          background:#2563eb;
          transform:translateY(-1px);
        }
        .btn-delete{
          background:#ef4444;
          color:white;
        }
        .btn-delete:hover{
          background:#dc2626;
          transform:translateY(-1px);
        }

        /* ===== MASTER MODAL (simple, not too colorful) ===== */
        .master-modal-overlay{
          position:fixed; inset:0;
          background:rgba(15,23,42,0.55);
          display:flex; align-items:center; justify-content:center;
          padding:20px;
          z-index:9999;
        }
        .master-modal{
          width:min(1180px, 96vw);
          height:min(86vh, 920px);
          background:#fff;
          border-radius:12px;
          box-shadow:0 30px 80px rgba(0,0,0,0.35);
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }
        .master-modal-header{
          padding:14px 16px;
          border-bottom:1px solid #e5e7eb;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          background:#fff;
        }
        .master-modal-subtitle{
          font-size:11px;
          font-weight:800;
          color:#64748b;
          letter-spacing:.6px;
        }
        .master-modal-title{
          margin-top:4px;
          font-size:14px;
          font-weight:700;
          color:#111827;
        }
        .master-close-btn{
          width:34px;height:34px;
          border-radius:10px;
          border:1px solid #e5e7eb;
          background:#fff;
          color:#111827;
          font-size:22px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          transition:.15s;
        }
        .master-close-btn:hover{
          background:#f8fafc;
          transform:translateY(-1px);
        }
        .master-modal-body{
          padding:14px 16px;
          overflow:auto;
          background:#fff;
        }
        .master-error{
          background:#fef2f2;
          border:1px solid #fecaca;
          color:#7f1d1d;
          padding:10px 12px;
          border-radius:10px;
          font-size:12px;
          font-weight:700;
          margin-bottom:12px;
        }
        .master-section{
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:12px;
          background:#fff;
        }
        .master-section-title{
          font-size:12px;
          font-weight:800;
          color:#111827;
          margin-bottom:8px;
          letter-spacing:.2px;
        }

        /* compact header grid */
        .master-form-grid{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap:8px 10px;
        }
        @media (max-width: 1100px){
          .master-form-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 860px){
          .master-form-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px){
          .master-form-grid{ grid-template-columns: 1fr; }
        }
        .master-field{
          display:flex;
          flex-direction:column;
          gap:5px;
          min-width:0;
        }
        .master-label{
          font-size:11px;
          font-weight:700;
          color:#475569;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .master-input{
          border:1px solid #cbd5e1;
          border-radius:8px;
          padding:7px 9px;
          font-size:12px;
          outline:none;
        }
        .master-input:focus{ border-color:#3b82f6; }
        .master-textarea{ min-height:34px; resize:vertical; }
        .master-input.readonly{
          background:#f8fafc;
          color:#475569;
        }

        .master-empty{
          padding:12px;
          font-size:12px;
          color:#64748b;
          font-weight:600;
        }

        .master-steps-wrap{ overflow:auto; }
        .master-steps-table{
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }
        .master-steps-table th{
          text-align:left;
          padding:9px 9px;
          background:#f8fafc;
          border-bottom:1px solid #e5e7eb;
          color:#111827;
          font-weight:800;
          white-space:nowrap;
        }
        .master-steps-table td{
          border-bottom:1px solid #f1f5f9;
          padding:7px 9px;
          vertical-align:middle;
        }
        .readonly-cell{
          background:#fafafa;
          color:#475569;
          font-weight:700;
          white-space:nowrap;
        }
        .cell-input{
          width:100%;
          border:1px solid transparent;
          border-radius:8px;
          padding:7px 8px;
          font-size:12px;
          background:#fff;
          outline:none;
        }
        .cell-input:focus{
          border-color:#3b82f6;
          box-shadow:0 0 0 2px rgba(59,130,246,0.10);
        }
        .master-note{
          margin-top:8px;
          font-size:11px;
          color:#64748b;
          font-weight:600;
        }
        .master-note code{
          background:#f1f5f9;
          padding:2px 6px;
          border-radius:8px;
          color:#111827;
        }

        .master-modal-footer{
          padding:10px 16px;
          border-top:1px solid #e5e7eb;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          background:#fff;
        }
        .footer-hint{ font-size:11px; color:#64748b; font-weight:700; }
        .footer-right{ display:flex; gap:10px; }
        .btn-secondary{
          padding:8px 12px;
          border-radius:10px;
          border:1px solid #cbd5e1;
          background:#fff;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }
        .btn-secondary:hover{ background:#f8fafc; transform:translateY(-1px); }
        .btn-primary{
          padding:8px 12px;
          border-radius:10px;
          border:1px solid #3b82f6;
          background:#3b82f6;
          color:#fff;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }
        .btn-primary:hover{ background:#2563eb; transform:translateY(-1px); }
      `}</style>
    </div>
  );
}

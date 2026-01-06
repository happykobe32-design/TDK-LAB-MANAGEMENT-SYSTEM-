export default function Topbar({ onToggle }) {
  return (
    <div className="page-header d-print-none">
      <div className="container-xl d-flex align-items-center">
        <button
          className="navbar-toggler me-3"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        <div className="flex-grow-1 text-center">
          <h2 className="page-title mb-0">
            RELIABILITY TEST SYSTEM
          </h2>
        </div>

        <div style={{ width: 48 }} />
      </div>
    </div>
  );
}

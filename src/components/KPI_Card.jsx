export default function KPI_Card({ title, value, accent = "primary" }) {
  return (
    <div className={`card card-sm border-start border-4 border-${accent}`}>
      <div className="card-body">
        <div className="subheader">{title}</div>
        <div className="h1 m-0">{value}</div>
      </div>
    </div>
  );
}

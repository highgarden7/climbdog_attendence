export default function StatBox({ value, label }) {
  return (
    <div className="stat-box">
      <div className="stat-box__value">{value}</div>
      <div className="stat-box__label">{label}</div>
    </div>
  );
}

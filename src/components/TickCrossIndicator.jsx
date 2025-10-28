// TickCrossIndicator.jsx
const TickCrossIndicator = ({ checked, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.3em" }}>
    <span
      style={{
        color: checked ? "green" : "red",
        fontWeight: "bold",
        fontSize: "1.2em",
        userSelect: "none",
      }}
      aria-label={checked ? "Checked" : "Not checked"}
      role="img"
    >
      {checked ? "✔" : "✖"}
    </span>
    <span>{label}</span>
  </div>
);

export default TickCrossIndicator;

import React from "react";

export default function EstadisticasPage() {
  return (
    <div className="card">
      <div className="card-h">
        <h2>Estadísticas</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>/estadisticas</span>
      </div>
      <div className="card-b" style={{ color: "var(--muted)" }}>
        Siguiente paso: consumir <code>/estadisticas</code> y renderizar cards + gráficos simples.
      </div>
    </div>
  );
}
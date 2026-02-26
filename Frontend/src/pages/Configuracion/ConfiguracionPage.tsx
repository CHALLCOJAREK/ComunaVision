import React from "react";

export default function ConfiguracionPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Configuración</h2>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Panel de configuración del sistema</h3>

        <p style={{ opacity: 0.75, marginTop: 8 }}>
          Aquí podrás administrar parámetros globales del sistema:
        </p>

        <ul style={{ marginTop: 16, opacity: 0.8 }}>
          <li>Gestión de campos dinámicos</li>
          <li>Configuración de roles</li>
          <li>Preferencias del sistema</li>
          <li>Parámetros de empadronamiento</li>
        </ul>

        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 12,
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.3)",
            fontSize: 14,
          }}
        >
          🚧 Esta sección será ampliada en la siguiente fase.
        </div>
      </div>
    </div>
  );
}
// src/components/Tabla/ComunerosTable.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../services/api";

type Comunero = {
  id: number;
  nombre: string;
  documento: string;
  datos_dinamicos: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};

export default function ComunerosTable() {
  const [items, setItems] = useState<Comunero[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");

  const canCreate = useMemo(() => nombre.trim().length > 0 && documento.trim().length > 0, [nombre, documento]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Comunero[]>("/comuneros");
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Error cargando comuneros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    setError(null);
    try {
      await api.post<Comunero>("/comuneros", {
        nombre: nombre.trim(),
        documento: documento.trim(),
        datos_dinamicos: {}, // por ahora vacío; el DynamicForm lo llenará
      });

      setNombre("");
      setDocumento("");
      await load();
    } catch (e: any) {
      if (e instanceof ApiError) {
        // 409 bonito del backend
        if (e.status === 409 && e.payload?.code === "DOCUMENTO_DUPLICADO" && e.payload?.field === "documento") {
          setError("Ese documento ya existe. Usa otro o edita el comunero existente.");
          return;
        }
        if (e.status === 403) {
          setError("No tienes permisos para crear comuneros.");
          return;
        }
        if (e.status === 401) {
          setError("Sesión expirada. Vuelve a iniciar sesión.");
          return;
        }
      }
      setError(e?.message || "Error creando comunero");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0 }}>Comuneros</h2>
      <p style={{ opacity: 0.75, marginTop: 6 }}>Listado + alta rápida (sin romper tu backend 😌)</p>

      <div style={{ display: "flex", gap: 10, margin: "14px 0", flexWrap: "wrap" }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          style={{ padding: 10, minWidth: 220 }}
        />
        <input
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          placeholder="Documento"
          style={{ padding: 10, minWidth: 220 }}
        />
        <button onClick={onCreate} disabled={!canCreate} style={{ padding: "10px 14px" }}>
          Crear
        </button>
        <button onClick={load} style={{ padding: "10px 14px" }}>
          Recargar
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,0,0,.08)", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.15)" }}>ID</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.15)" }}>Nombre</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.15)" }}>Documento</th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.15)" }}>Dinámicos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>{c.id}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>{c.nombre}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>{c.documento}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    <code style={{ opacity: 0.85 }}>{JSON.stringify(c.datos_dinamicos || {})}</code>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 12, opacity: 0.7 }}>
                    No hay comuneros aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
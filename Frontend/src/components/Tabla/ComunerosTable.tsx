import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import DynamicForm from "../DynamicForm";

type Comunero = {
  id: number;
  nombre: string;
  documento: string;
  datos_dinamicos?: Record<string, any> | null;
};

type Toast = { type: "success" | "error" | "info"; msg: string } | null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractError(e: any) {
  const status = e?.status ?? e?.response?.status;
  const payload = e?.payload ?? e?.response?.data;

  let detail: any = payload?.detail ?? e?.message ?? "Error inesperado";
  if (typeof detail !== "string") {
    try {
      detail = JSON.stringify(detail);
    } catch {
      detail = String(detail);
    }
  }

  return { status, payload, detail };
}

function isDocDuplicado(e: any) {
  const { status, payload } = extractError(e);
  return status === 409 && payload?.code === "DOCUMENTO_DUPLICADO" && payload?.field === "documento";
}

/**
 * Update endpoint: puede ser PATCH o PUT según backend.
 * - Intentamos PATCH
 * - Si responde 405 => caemos a PUT
 */
async function updateComuneroSmart(id: number, payload: any) {
  try {
    return await api.patch(`/comuneros/${id}`, payload);
  } catch (e: any) {
    const { status } = extractError(e);
    if (status === 405) return await api.put(`/comuneros/${id}`, payload);
    throw e;
  }
}

function hasValue(v: any) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim() !== "";
  return String(v).trim() !== "";
}

function renderValue(v: any) {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export default function ComunerosTable() {
  const [items, setItems] = useState<Comunero[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // filtro front-only
  const [q, setQ] = useState("");

  // crear
  const [newNombre, setNewNombre] = useState("");
  const [newDocumento, setNewDocumento] = useState("");
  const [newDatos, setNewDatos] = useState<Record<string, any>>({});

  // editar
  const [editing, setEditing] = useState<Comunero | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDocumento, setEditDocumento] = useState("");
  const [editDatos, setEditDatos] = useState<Record<string, any>>({});

  const showToast = async (t: Toast, ms = 2600) => {
    setToast(t);
    await sleep(ms);
    setToast(null);
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/comuneros");
      const list: Comunero[] = Array.isArray(data) ? data : data?.items ?? [];
      setItems(list);
    } catch (e: any) {
      const { status, detail } = extractError(e);
      if (status === 403) showToast({ type: "error", msg: "No autorizado (403). Revisa tu rol." });
      else showToast({ type: "error", msg: detail });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => {
      const n = (c.nombre || "").toLowerCase();
      const d = (c.documento || "").toLowerCase();
      return n.includes(s) || d.includes(s);
    });
  }, [items, q]);

  // ✅ Auto-columnas dinámicas (se generan solas según la data actual)
  const dynamicKeys = useMemo(() => {
    const set = new Set<string>();
    for (const c of filtered) {
      const dd = c.datos_dinamicos || {};
      for (const [k, v] of Object.entries(dd)) {
        if (!hasValue(v)) continue;
        set.add(k);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filtered]);

  const resetCreate = () => {
    setNewNombre("");
    setNewDocumento("");
    setNewDatos({});
  };

  const onCreate = async () => {
    const nombre = newNombre.trim();
    const documento = newDocumento.trim();

    if (!nombre || !documento) {
      return showToast({ type: "info", msg: "Completa Nombre y Documento." });
    }

    setLoading(true);
    try {
      await api.post("/comuneros", {
        nombre,
        documento,
        datos_dinamicos: newDatos || {},
      });
      showToast({ type: "success", msg: "Comunero creado." });
      resetCreate();
      fetchList();
    } catch (e: any) {
      if (isDocDuplicado(e)) {
        showToast({ type: "error", msg: "Documento duplicado: ya existe un comunero con ese documento." });
      } else {
        const { detail } = extractError(e);
        showToast({ type: "error", msg: detail });
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (c: Comunero) => {
    setEditing(c);
    setEditNombre(c.nombre ?? "");
    setEditDocumento(c.documento ?? "");
    setEditDatos(c.datos_dinamicos ?? {});
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditNombre("");
    setEditDocumento("");
    setEditDatos({});
  };

  const onSaveEdit = async () => {
    if (!editing) return;

    const nombre = editNombre.trim();
    const documento = editDocumento.trim();

    if (!nombre || !documento) {
      return showToast({ type: "info", msg: "Nombre y Documento no pueden estar vacíos." });
    }

    setLoading(true);
    try {
      await updateComuneroSmart(editing.id, {
        nombre,
        documento,
        datos_dinamicos: editDatos || {},
      });
      showToast({ type: "success", msg: "Cambios guardados." });
      cancelEdit();
      fetchList();
    } catch (e: any) {
      if (isDocDuplicado(e)) {
        showToast({ type: "error", msg: "Documento duplicado: ya existe un comunero con ese documento." });
      } else {
        const { detail } = extractError(e);
        showToast({ type: "error", msg: detail });
      }
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (c: Comunero) => {
    const ok = window.confirm(`¿Eliminar (soft delete) a "${c.nombre}" con documento "${c.documento}"?`);
    if (!ok) return;

    setLoading(true);
    try {
      await api.del(`/comuneros/${c.id}`);
      showToast({ type: "success", msg: "Comunero eliminado (soft delete)." });
      fetchList();
    } catch (e: any) {
      const { status, detail } = extractError(e);
      if (status === 403) showToast({ type: "error", msg: "No autorizado (403). Revisa tu rol." });
      else showToast({ type: "error", msg: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Comuneros</h2>

      {/* Toast simple */}
      {toast ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,.12)",
            background:
              toast.type === "success"
                ? "rgba(34,197,94,.12)"
                : toast.type === "error"
                ? "rgba(220,38,38,.10)"
                : "rgba(59,130,246,.10)",
          }}
        >
          {toast.msg}
        </div>
      ) : null}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input
          style={{
            flex: "1 1 260px",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,.15)",
          }}
          placeholder="Buscar por nombre o documento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <button
          onClick={fetchList}
          disabled={loading}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
        >
          {loading ? "Cargando…" : "Recargar"}
        </button>
      </div>

      {/* Crear */}
      <div style={{ border: "1px solid rgba(0,0,0,.08)", padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Crear comunero</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <input
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
            placeholder="Nombre"
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
          />
          <input
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
            placeholder="Documento"
            value={newDocumento}
            onChange={(e) => setNewDocumento(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          {/* ✅ No pasar initial={{}} para evitar reset infinito */}
          <DynamicForm onChange={setNewDatos} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            onClick={onCreate}
            disabled={loading}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.15)",
              fontWeight: 600,
            }}
          >
            Crear
          </button>
          <button
            onClick={resetCreate}
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Editar */}
      {editing ? (
        <div style={{ border: "1px solid rgba(0,0,0,.12)", padding: 12, borderRadius: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            Editando: #{editing.id} — <span style={{ opacity: 0.85 }}>{editing.nombre}</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <input
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
              placeholder="Nombre"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
            />
            <input
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
              placeholder="Documento"
              value={editDocumento}
              onChange={(e) => setEditDocumento(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <DynamicForm initial={editing.datos_dinamicos ?? {}} onChange={setEditDatos} />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              onClick={onSaveEdit}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,.15)",
                fontWeight: 600,
              }}
            >
              Guardar
            </button>
            <button
              onClick={cancelEdit}
              disabled={loading}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* Tabla */}
      <div style={{ border: "1px solid rgba(0,0,0,.08)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,.04)" }}>
              <th style={{ textAlign: "left", padding: 10 }}>ID</th>
              <th style={{ textAlign: "left", padding: 10 }}>Nombre</th>
              <th style={{ textAlign: "left", padding: 10 }}>Documento</th>

              {/* ✅ Columnas dinámicas auto */}
              {dynamicKeys.map((k) => (
                <th key={k} style={{ textAlign: "left", padding: 10 }}>
                  {k}
                </th>
              ))}

              <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid rgba(0,0,0,.08)" }}>
                <td style={{ padding: 10 }}>{c.id}</td>
                <td style={{ padding: 10 }}>{c.nombre}</td>
                <td style={{ padding: 10 }}>{c.documento}</td>

                {/* ✅ Celdas dinámicas auto */}
                {dynamicKeys.map((k) => {
                  const v = c.datos_dinamicos?.[k];
                  const show = hasValue(v);
                  return (
                    <td key={k} style={{ padding: 10, opacity: show ? 1 : 0.55 }}>
                      {show ? renderValue(v) : "—"}
                    </td>
                  );
                })}

                <td style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => startEdit(c)}
                    disabled={loading}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    disabled={loading}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {!filtered.length ? (
              <tr>
                <td colSpan={4 + dynamicKeys.length} style={{ padding: 12, opacity: 0.75 }}>
                  No hay resultados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        Nota: el filtro es 100% front-only. Update intenta PATCH y cae a PUT si el backend no soporta PATCH.
      </div>
    </div>
  );
}
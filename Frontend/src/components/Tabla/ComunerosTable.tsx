import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  Plus,
  RefreshCcw,
  Search,
  X,
  Pencil,
  Trash2,
  FileDown,
  FileJson,
} from "lucide-react";

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

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function ComunerosTable() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Comunero[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [q, setQ] = useState("");

  const showToast = async (t: Toast, ms = 2200) => {
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

  const onDelete = async (c: Comunero) => {
    const ok = window.confirm(`¿Eliminar (soft delete) a "${c.nombre}" con documento "${c.documento}"?`);
    if (!ok) return;

    setLoading(true);
    try {
      await api.del(`/comuneros/${c.id}`);
      showToast({ type: "success", msg: "Comunero eliminado." });
      fetchList();
    } catch (e: any) {
      const { status, detail } = extractError(e);
      if (status === 403) showToast({ type: "error", msg: "No autorizado (403). Revisa tu rol." });
      else showToast({ type: "error", msg: detail });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Usa tu endpoint real
  const exportCSV = async () => {
    try {
      setLoading(true);
      const blob = await api.getBlob(
        `/exportaciones/comuneros?formato=csv&include_deleted=false`,
        { logoutOn401: false }
      );
      downloadBlob(blob, "comuneros.csv");
      showToast({ type: "success", msg: "CSV descargado." });
    } catch (e: any) {
      const { detail } = extractError(e);
      showToast({ type: "error", msg: `No se pudo exportar CSV: ${detail}` });
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = async () => {
    try {
      setLoading(true);
      const blob = await api.getBlob(
        `/exportaciones/comuneros?formato=json&include_deleted=false`,
        { logoutOn401: false }
      );
      downloadBlob(blob, "comuneros.json");
      showToast({ type: "success", msg: "JSON descargado." });
    } catch (e: any) {
      const { detail } = extractError(e);
      showToast({ type: "error", msg: `No se pudo exportar JSON: ${detail}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search">
            <Search size={18} />
            <input
              className="input"
              placeholder="Buscar por nombre o documento…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setQ("")} disabled={loading} title="Limpiar">
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/comuneros/nuevo")}
            disabled={loading}
            title="Nuevo comunero"
          >
            <Plus size={18} />
            Nuevo
          </button>

          <button className="btn" onClick={fetchList} disabled={loading} title="Recargar">
            <RefreshCcw size={16} />
            {loading ? "Cargando…" : "Recargar"}
          </button>

          <button className="btn btn-ghost" onClick={exportCSV} disabled={loading} title="Exportar CSV">
            <FileDown size={16} />
            CSV
          </button>

          <button className="btn btn-ghost" onClick={exportJSON} disabled={loading} title="Exportar JSON">
            <FileJson size={16} />
            JSON
          </button>
        </div>
      </div>

      {toast ? <div className={`toast toast-${toast.type}`}>{toast.msg}</div> : null}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Documento</th>
                {dynamicKeys.map((k) => (
                  <th key={k}>{k}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nombre}</td>
                  <td>{c.documento}</td>

                  {dynamicKeys.map((k) => {
                    const v = c.datos_dinamicos?.[k];
                    return <td key={k}>{hasValue(v) ? renderValue(v) : "—"}</td>;
                  })}

                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate(`/comuneros/${c.id}/editar`)}
                        disabled={loading}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onDelete(c)}
                        disabled={loading}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length ? (
                <tr>
                  <td colSpan={4 + dynamicKeys.length} className="table-empty">
                    No hay resultados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

type CampoTipo =
  | "text"
  | "string"
  | "number"
  | "integer"
  | "date"
  | "datetime"
  | "bool"
  | "boolean"
  | "select"
  | "enum"
  | "textarea";

export type Campo = {
  id?: number;
  nombre_campo: string;
  etiqueta?: string;
  tipo: CampoTipo | string;
  obligatorio?: boolean;
  requerido?: boolean;
  placeholder?: string | null;
  opciones?: string[] | null;
  activo?: boolean;
};

type Props = {
  initial?: Record<string, any>;
  onChange: (cleanDatos: Record<string, any>) => void;
  hideTitle?: boolean;
};

function isEmptyValue(v: any) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function pruneEmpty(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!isEmptyValue(v)) out[k] = v;
  }
  return out;
}

function normalizeTipo(tipo: string): CampoTipo {
  const t = (tipo || "").toLowerCase().trim();
  if (["bool", "boolean"].includes(t)) return "boolean";
  if (["int", "integer"].includes(t)) return "integer";
  if (["number", "float", "decimal"].includes(t)) return "number";
  if (["date"].includes(t)) return "date";
  if (["datetime", "date_time"].includes(t)) return "datetime";
  if (["select", "enum"].includes(t)) return "select";
  if (["textarea", "text_area", "multiline"].includes(t)) return "textarea";
  return "text";
}

export default function DynamicForm({ initial, onChange, hideTitle }: Props) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [values, setValues] = useState<Record<string, any>>(() => initial ?? {});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- evita loops por cambios de referencia ---
  const lastInitialSig = useRef<string>("");

  useEffect(() => {
    const next = initial ?? {};
    const sig = JSON.stringify(next);

    if (sig !== lastInitialSig.current) {
      lastInitialSig.current = sig;
      setValues(next);
    }
    // NO llamamos onChange aquí: eso dispara loops en edición
  }, [initial]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr(null);

    api
      .get<any>("/campos")
      .then((data) => {
        if (!mounted) return;
        const list: Campo[] = Array.isArray(data) ? data : data?.items ?? [];
        const active = list.filter((c) => c.activo !== false);
        setCampos(active);
      })
      .catch((e: any) => {
        if (!mounted) return;
        const msg = e?.payload?.detail || e?.message || "No se pudo cargar /campos";
        setErr(msg);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const cleaned = useMemo(() => pruneEmpty(values), [values]);

  // Emitimos SOLO si cambió de verdad
  const lastEmitSig = useRef<string>("");
  useEffect(() => {
    const sig = JSON.stringify(cleaned);
    if (sig !== lastEmitSig.current) {
      lastEmitSig.current = sig;
      onChange(cleaned);
    }
  }, [cleaned, onChange]);

  const setField = (name: string, v: any) => {
    setValues((prev) => ({ ...prev, [name]: v }));
  };

  if (loading) return <div style={{ opacity: 0.8, color: "white" }}>Cargando campos…</div>;
  if (err) return <div style={{ color: "tomato" }}>{err}</div>;
  if (!campos.length) return null;

  return (
    <div style={{ border: "1px solid rgba(0,0,0,.08)", padding: 12, borderRadius: 10 }}>
      {!hideTitle && <h3 style={{ marginTop: 0, color: "white" }}>Datos dinámicos</h3>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {campos.map((c) => {
          const name = c.nombre_campo;
          const label = c.etiqueta || name;
          const tipo = normalizeTipo(String(c.tipo));
          const required = !!(c.obligatorio || c.requerido);
          const v = values?.[name];

          const baseStyle: React.CSSProperties = {
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,.15)",
            outline: "none",
          };

          return (
            <div key={name}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "white" }}>
                {label} {required ? <span style={{ color: "tomato" }}>*</span> : null}
              </label>

              {tipo === "textarea" ? (
                <textarea
                  style={{ ...baseStyle, minHeight: 90, resize: "vertical" }}
                  value={typeof v === "string" ? v : v ?? ""}
                  placeholder={c.placeholder ?? ""}
                  onChange={(e) => setField(name, e.target.value)}
                />
              ) : tipo === "select" ? (
                <select style={baseStyle} value={v ?? ""} onChange={(e) => setField(name, e.target.value)}>
                  <option value="">—</option>
                  {(c.opciones || []).map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              ) : tipo === "boolean" ? (
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "white" }}>
                  <input type="checkbox" checked={!!v} onChange={(e) => setField(name, e.target.checked)} />
                  <span style={{ fontSize: 14, opacity: 0.9 }}>{v ? "Sí" : "No"}</span>
                </label>
              ) : (
                <input
                  style={baseStyle}
                  type={tipo === "date" ? "date" : tipo === "datetime" ? "datetime-local" : "text"}
                  value={v ?? ""}
                  placeholder={c.placeholder ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (tipo === "integer") setField(name, raw === "" ? "" : Number.parseInt(raw, 10));
                    else if (tipo === "number") setField(name, raw === "" ? "" : Number(raw));
                    else setField(name, raw);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
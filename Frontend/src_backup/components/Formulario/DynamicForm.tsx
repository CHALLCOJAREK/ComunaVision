// src/components/Formulario/DynamicForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../services/api";

type RawCampo = Record<string, any>;

type Campo = {
  id?: number | string;
  key: string;         // nombre lógico: "edad", "zona", etc.
  label: string;       // texto UI
  type: string;        // "text" | "number" | "date" | "select" | "checkbox" ...
  required: boolean;
  options?: Array<{ label: string; value: any }> | any[];
};

function normalizeField(x: RawCampo): Campo {
  const key =
    x.key ?? x.nombre ?? x.codigo ?? x.slug ?? x.field_key ?? x.name ?? `campo_${x.id ?? Math.random()}`;

  const label =
    x.label ?? x.titulo ?? x.nombre_label ?? x.nombre ?? x.name ?? String(key);

  const type =
    (x.type ?? x.tipo ?? x.field_type ?? "text").toString().toLowerCase();

  const required =
    Boolean(x.required ?? x.requerido ?? x.is_required ?? false);

  const options = x.options ?? x.opciones ?? x.items ?? undefined;

  return { id: x.id, key: String(key), label: String(label), type, required, options };
}

function toSelectOptions(options: any[] | undefined) {
  if (!options) return [];
  return options.map((o: any) => {
    if (typeof o === "string" || typeof o === "number") return { label: String(o), value: o };
    if (o && typeof o === "object") {
      const label = o.label ?? o.nombre ?? o.text ?? o.value ?? JSON.stringify(o);
      const value = o.value ?? o.codigo ?? o.id ?? o.label ?? label;
      return { label: String(label), value };
    }
    return { label: String(o), value: o };
  });
}

export default function DynamicForm() {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Datos base del comunero
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");

  // Dinámicos
  const [dyn, setDyn] = useState<Record<string, any>>({});

  const canSubmit = useMemo(() => nombre.trim() && documento.trim(), [nombre, documento]);

  const loadCampos = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const raw = await api.get<RawCampo[]>("/campos");
      const normalized = (raw || []).map(normalizeField);
      setCampos(normalized);

      // inicializamos dyn sin campos vacíos obligatorios (solo prepare keys)
      const seed: Record<string, any> = {};
      normalized.forEach((f) => {
        if (seed[f.key] === undefined) seed[f.key] = "";
      });
      setDyn(seed);
    } catch (e: any) {
      setMsg(e?.message || "Error cargando campos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampos();
  }, []);

  const setDynValue = (key: string, value: any) => {
    setDyn((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setMsg(null);
    try {
      // opcional: validar requeridos en front sin romper backend
      for (const f of campos) {
        if (f.required) {
          const v = dyn[f.key];
          const empty = v === null || v === undefined || String(v).trim() === "";
          if (empty) {
            setMsg(`Falta completar: ${f.label}`);
            return;
          }
        }
      }

      // limpiamos valores vacíos para no mandar basura
      const cleaned: Record<string, any> = {};
      Object.entries(dyn).forEach(([k, v]) => {
        const isEmpty = v === null || v === undefined || String(v).trim() === "";
        if (!isEmpty) cleaned[k] = v;
      });

      await api.post("/comuneros", {
        nombre: nombre.trim(),
        documento: documento.trim(),
        datos_dinamicos: cleaned,
      });

      setMsg("✅ Comunero creado correctamente.");
      setNombre("");
      setDocumento("");
      // resetea dinámicos a vacío
      const reset: Record<string, any> = {};
      campos.forEach((f) => (reset[f.key] = ""));
      setDyn(reset);
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 409 && e.payload?.code === "DOCUMENTO_DUPLICADO" && e.payload?.field === "documento") {
          setMsg("⚠️ Ese documento ya existe (DOCUMENTO_DUPLICADO).");
          return;
        }
        if (e.status === 403) {
          setMsg("⛔ No tienes permisos para esta acción.");
          return;
        }
        if (e.status === 401) {
          setMsg("🔒 Sesión expirada. Inicia sesión nuevamente.");
          return;
        }
      }
      setMsg(e?.message || "Error creando comunero");
    }
  };

  const renderField = (f: Campo) => {
    const v = dyn[f.key] ?? "";
    const commonStyle: React.CSSProperties = { padding: 10, width: "100%" };

    if (f.type.includes("select")) {
      const opts = toSelectOptions(Array.isArray(f.options) ? f.options : undefined);
      return (
        <select value={v} onChange={(e) => setDynValue(f.key, e.target.value)} style={commonStyle}>
          <option value="">-- Selecciona --</option>
          {opts.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.type.includes("check") || f.type === "boolean") {
      return (
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={Boolean(v)}
            onChange={(e) => setDynValue(f.key, e.target.checked)}
          />
          <span>{f.label}</span>
        </label>
      );
    }

    const inputType =
      f.type.includes("number") ? "number" :
      f.type.includes("date") ? "date" :
      "text";

    return (
      <input
        type={inputType}
        value={v}
        onChange={(e) => setDynValue(f.key, e.target.value)}
        placeholder={f.label}
        style={commonStyle}
      />
    );
  };

  return (
    <div style={{ padding: 16, maxWidth: 860 }}>
      <h2 style={{ margin: 0 }}>Formulario dinámico</h2>
      <p style={{ opacity: 0.75, marginTop: 6 }}>Campos desde /campos → datos_dinamicos JSONB</p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          style={{ padding: 10 }}
        />
        <input
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          placeholder="Documento"
          style={{ padding: 10 }}
        />
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={submit} disabled={!canSubmit} style={{ padding: "10px 14px" }}>
          Guardar comunero
        </button>
        <button onClick={loadCampos} style={{ padding: "10px 14px" }}>
          Recargar campos
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,.06)" }}>
          {msg}
        </div>
      )}

      <hr style={{ margin: "18px 0", opacity: 0.2 }} />

      {loading ? (
        <div>Cargando campos...</div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {campos.map((f) => (
            <div key={f.key} style={{ padding: 12, borderRadius: 12, background: "rgba(96, 79, 79, 0.04)" }}>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
                {f.label} {f.required ? " *" : ""} <span style={{ opacity: 0.6 }}>({f.type})</span>
              </div>
              {renderField(f)}
            </div>
          ))}
          {campos.length === 0 && (
            <div style={{ opacity: 0.7 }}>
              No hay campos configurados aún. (Crea campos desde tu módulo admin /campos)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
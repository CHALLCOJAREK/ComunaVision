import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DynamicForm from "../../components/DynamicForm";
import { api } from "../../services/api";
import styles from "./ComuneroEditarPage.module.css";

type Comunero = {
  id: number;
  nombre: string;
  documento: string;
  datos_dinamicos?: Record<string, any> | null;
};

type ToastKind = "success" | "error" | "info";
type ToastState = { kind: ToastKind; title: string; message?: string } | null;

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

async function updateComuneroSmart(id: number, payload: any) {
  try {
    return await api.patch(`/comuneros/${id}`, payload);
  } catch (e: any) {
    const { status } = extractError(e);
    if (status === 405) return await api.put(`/comuneros/${id}`, payload);
    throw e;
  }
}

/* =========================
   ICONOS (inline SVG, no libs)
   ========================= */
function Icon({
  name,
  className,
}: {
  name:
    | "back"
    | "x"
    | "save"
    | "edit"
    | "check"
    | "alert"
    | "info"
    | "spinner";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  switch (name) {
    case "back":
      return (
        <svg {...common}>
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "save":
      return (
        <svg {...common}>
          <path
            d="M17 21H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8l4 4v10a2 2 0 0 1-2 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 21v-6h6v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 7h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path
            d="M12 20h9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path
            d="M10.3 4.1a2 2 0 0 1 3.4 0l7.2 12.5A2 2 0 0 1 19.2 20H4.8a2 2 0 0 1-1.7-3.4l7.2-12.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 17h.01"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <path
            d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 10v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 7h.01"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "spinner":
      return (
        <svg {...common}>
          <path
            d="M12 3a9 9 0 1 0 9 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function ComuneroEditarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const comuneroId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [datos, setDatos] = useState<Record<string, any>>({});

  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<number | null>(null);

  const toastIcon = (kind: ToastKind) => {
    if (kind === "success") return "check";
    if (kind === "error") return "alert";
    return "info";
  };

  const showToast = (next: ToastState, ms = 2600) => {
    setToast(next);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ====== Load comunero ======
  useEffect(() => {
    const run = async () => {
      setErr(null);

      if (!Number.isFinite(comuneroId) || comuneroId <= 0) {
        setErr("ID inválido en la URL.");
        setLoadingData(false);
        showToast({ kind: "error", title: "Ruta inválida", message: "Revisa el enlace e intenta de nuevo." });
        return;
      }

      setLoadingData(true);
      try {
        const c = await api.get<Comunero>(`/comuneros/${comuneroId}`);
        setNombre(c?.nombre ?? "");
        setDocumento(c?.documento ?? "");
        setDatos(c?.datos_dinamicos ?? {});
      } catch (e1: any) {
        // Fallback: lista + filtro (manteniendo tu comportamiento)
        try {
          const listRaw = await api.get<any>("/comuneros");
          const list: Comunero[] = Array.isArray(listRaw) ? listRaw : listRaw?.items ?? [];
          const c = list.find((x) => x.id === comuneroId);
          if (!c) throw new Error("Comunero no encontrado.");
          setNombre(c?.nombre ?? "");
          setDocumento(c?.documento ?? "");
          setDatos(c?.datos_dinamicos ?? {});
        } catch (e2: any) {
          const { detail } = extractError(e2);
          setErr(detail);
          showToast({ kind: "error", title: "No se pudo cargar", message: detail });
        }
      } finally {
        setLoadingData(false);
      }
    };

    run();
  }, [comuneroId]);

  const onCancel = () => navigate("/comuneros");

  // ====== Save ======
  const onSave = async () => {
    const n = nombre.trim();
    const d = documento.trim();

    if (!n || !d) {
      const msg = "Nombre y Documento son obligatorios.";
      setErr(msg);
      showToast({ kind: "error", title: "Validación", message: msg });
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      await updateComuneroSmart(comuneroId, {
        nombre: n,
        documento: d,
        datos_dinamicos: datos || {},
      });

      showToast({ kind: "success", title: "Guardado", message: "Cambios actualizados correctamente." });
      window.setTimeout(() => navigate("/comuneros", { replace: true }), 350);
    } catch (e: any) {
      const { detail } = extractError(e);
      setErr(detail);
      showToast({ kind: "error", title: "Error al guardar", message: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Toast premium */}
      {toast ? (
        <div className={styles.toastWrap} role="status" aria-live="polite">
          <div
            className={`${styles.toast} ${
              toast.kind === "success" ? styles.toastSuccess : toast.kind === "error" ? styles.toastError : styles.toastInfo
            }`}
          >
            <div className={styles.toastIcon}>
              <Icon name={toastIcon(toast.kind)} className={styles.icon} />
            </div>

            <div className={styles.toastBody}>
              <div className={styles.toastTitle}>{toast.title}</div>
              {toast.message ? <div className={styles.toastMsg}>{toast.message}</div> : null}
            </div>

            <button className={styles.toastClose} type="button" onClick={() => setToast(null)} aria-label="Cerrar">
              <Icon name="x" className={styles.icon} />
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headLeft}>
            <h2 className={styles.title}>
              <Icon name="edit" className={styles.titleIcon} />
              Editar comunero
            </h2>
            <div className={styles.subtitle}>Actualiza datos básicos y campos dinámicos.</div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={`${styles.btn} ${styles.btnGhost}`}
            >
              <Icon name="back" className={styles.btnIcon} />
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={loading || loadingData}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {loading ? (
                <span className={styles.btnInline}>
                  <span className={styles.spinWrap} aria-hidden="true">
                    <Icon name="spinner" className={styles.spinnerSvg} />
                  </span>
                  Guardando…
                </span>
              ) : (
                <span className={styles.btnInline}>
                  <Icon name="save" className={styles.btnIcon} />
                  Guardar
                </span>
              )}
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className={styles.card} aria-busy="true" aria-label="Cargando comunero">
            <div className={styles.skelTop}>
              <div className={styles.skelLine} />
              <div className={styles.skelLineSm} />
            </div>

            <div className={styles.skelGrid}>
              <div className={styles.skelField}>
                <div className={styles.skelLabel} />
                <div className={styles.skelInput} />
              </div>
              <div className={styles.skelField}>
                <div className={styles.skelLabel} />
                <div className={styles.skelInput} />
              </div>
            </div>

            <div className={styles.skelBlock} />
          </div>
        ) : (
          <div className={styles.card}>
            {err ? (
              <div className={styles.alert} role="alert">
                <div className={styles.alertIcon}>
                  <Icon name="alert" className={styles.icon} />
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertTitle}>Atención</div>
                  <div className={styles.alertMsg}>{err}</div>
                </div>
              </div>
            ) : null}

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <div className={styles.inputWrap}>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre"
                    className={styles.input}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Documento</label>
                <div className={styles.inputWrap}>
                  <input
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="Documento"
                    className={styles.input}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className={styles.dynamicWrap}>
              <div className={styles.sectionTitle}>
              </div>

              {/* IMPORTANTE: initial undefined si no hay datos (evita loops por objetos nuevos) */}
              <DynamicForm initial={datos ?? undefined} onChange={setDatos} />
            </div>

            <div className={styles.footerHint}>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
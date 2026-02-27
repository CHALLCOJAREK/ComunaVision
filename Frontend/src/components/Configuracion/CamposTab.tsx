import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CamposTab.module.css";
import { api } from "../../services/api";
import {
  Plus,
  RefreshCcw,
  Pencil,
  Trash2,
  Save,
  X,
  ListChecks,
  AlertTriangle,
  Loader2,
} from "lucide-react";

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

type Campo = {
  id: number;
  nombre_campo: string;
  etiqueta?: string;
  tipo: CampoTipo | string;
  obligatorio?: boolean;
  requerido?: boolean;
  placeholder?: string | null;
  opciones?: string[] | null;
  activo?: boolean;
};

type Toast = { type: "success" | "error" | "info"; msg: string } | null;

function normalizeTipo(tipo: string) {
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

function extractMsg(e: any) {
  return e?.payload?.detail || e?.message || "Error inesperado";
}

const TIPOS: { value: CampoTipo; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto largo" },
  { value: "integer", label: "Entero" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "datetime", label: "Fecha y hora" },
  { value: "boolean", label: "Sí/No" },
  { value: "select", label: "Lista (Select)" },
];

const emptyDraft: Omit<Campo, "id"> & { id?: number } = {
  nombre_campo: "",
  etiqueta: "",
  tipo: "text",
  placeholder: "",
  opciones: [],
  requerido: false,
  obligatorio: false,
  activo: true,
};

export default function CamposTab() {
  const [rows, setRows] = useState<Campo[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyAction, setBusyAction] = useState<null | "save" | "delete">(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);

  const [pageError, setPageError] = useState<string | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => a.id - b.id), [rows]);

  const pushToast = (t: Toast, autoCloseMs = 3500) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(t);
    if (t && autoCloseMs > 0) {
      toastTimer.current = window.setTimeout(() => setToast(null), autoCloseMs);
    }
  };

  const load = async () => {
    setLoadingList(true);
    setPageError(null);
    try {
      const data = await api.get<any>("/campos");
      const list: Campo[] = Array.isArray(data) ? data : data?.items ?? [];
      setRows(list);
    } catch (e: any) {
      const msg = extractMsg(e);
      setPageError(msg);
      pushToast({ type: "error", msg });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const openCreate = () => {
    setDraft({ ...emptyDraft });
    setModalOpen(true);
    pushToast(null, 0);
  };

  const openEdit = (c: Campo) => {
    setDraft({
      id: c.id,
      nombre_campo: c.nombre_campo,
      etiqueta: c.etiqueta ?? "",
      tipo: normalizeTipo(String(c.tipo)),
      placeholder: c.placeholder ?? "",
      opciones: c.opciones ?? [],
      requerido: !!c.requerido,
      obligatorio: !!c.obligatorio,
      activo: c.activo !== false,
    });
    setModalOpen(true);
    pushToast(null, 0);
  };

  const closeModal = () => {
    if (busyAction === "save") return;
    setModalOpen(false);
  };

  const save = async () => {
    if (!draft.nombre_campo.trim()) {
      pushToast({ type: "error", msg: "nombre_campo es obligatorio." });
      return;
    }

    const tipo = normalizeTipo(String(draft.tipo));
    const payload: any = {
      nombre_campo: draft.nombre_campo.trim(),
      etiqueta: (draft.etiqueta || "").trim() || null,
      tipo,
      placeholder: (draft.placeholder || "").trim() || null,
      requerido: !!draft.requerido,
      obligatorio: !!draft.obligatorio,
      activo: draft.activo !== false,
      opciones:
        tipo === "select"
          ? (draft.opciones || [])
              .map((x) => String(x).trim())
              .filter(Boolean)
          : null,
    };

    setBusyAction("save");
    setBusyId(null);

    try {
      if (draft.id) {
        await api.put(`/campos/${draft.id}`, payload);
        pushToast({ type: "success", msg: "Campo actualizado." });
      } else {
        await api.post(`/campos`, payload);
        pushToast({ type: "success", msg: "Campo creado." });
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      pushToast({ type: "error", msg: extractMsg(e) });
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async (c: Campo) => {
    if (busyAction) return;

    const ok = window.confirm(
      `Eliminar el campo "${c.etiqueta || c.nombre_campo}"?\n\nEsto puede afectar formularios y exportaciones.`
    );
    if (!ok) return;

    setBusyAction("delete");
    setBusyId(c.id);

    try {
      await api.delete(`/campos/${c.id}`);
      pushToast({ type: "success", msg: "Campo eliminado." });
      await load();
    } catch (e: any) {
      pushToast({ type: "error", msg: extractMsg(e) });
    } finally {
      setBusyAction(null);
      setBusyId(null);
    }
  };

  const isSaving = busyAction === "save";
  const disableTopActions = loadingList || !!busyAction;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <div className={styles.badge}>
            <ListChecks size={16} />
            <span>Campos del Formulario</span>
          </div>

          {/* sin meta informativa */}
        </div>

        <div className={styles.right}>
          <button
            className={styles.btnGhost}
            type="button"
            onClick={load}
            disabled={disableTopActions}
          >
            {loadingList ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <RefreshCcw size={16} />
            )}
            <span>Recargar</span>
          </button>

          <button
            className={styles.btnPrimary}
            type="button"
            onClick={openCreate}
            disabled={disableTopActions}
          >
            <Plus size={16} />
            <span>Nuevo campo</span>
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={[
            styles.toast,
            toast.type === "error"
              ? styles.toastErr
              : toast.type === "success"
              ? styles.toastOk
              : styles.toastInfo,
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          <div className={styles.toastBody}>
            {toast.type === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <span className={styles.toastDot} aria-hidden="true" />
            )}
            <span>{toast.msg}</span>
          </div>

          <button
            className={styles.toastX}
            onClick={() => setToast(null)}
            type="button"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {pageError && !loadingList && (
        <div className={styles.errorPanel} role="alert">
          <AlertTriangle size={16} />
          <div className={styles.errorText}>
            <div className={styles.errorTitle}>No se pudo cargar la lista</div>
            <div className={styles.errorMsg}>{pageError}</div>
          </div>
          <button
            className={styles.btnGhost}
            type="button"
            onClick={load}
            disabled={disableTopActions}
          >
            <RefreshCcw size={16} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Etiqueta</th>
              <th>Key</th>
              <th>Tipo</th>
              <th>Requerido</th>
              <th>Activo</th>
              <th className={styles.thActions}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingList ? (
              <tr>
                <td colSpan={6} className={styles.tdMuted}>
                  Cargando…
                </td>
              </tr>
            ) : sorted.length ? (
              sorted.map((c) => {
                const tipo = normalizeTipo(String(c.tipo));
                const label = c.etiqueta || c.nombre_campo;
                const required = !!(c.requerido || c.obligatorio);
                const active = c.activo !== false;
                const rowBusy = busyAction === "delete" && busyId === c.id;

                return (
                  <tr key={c.id} className={rowBusy ? styles.rowBusy : undefined}>
                    <td className={styles.tdStrong}>{label}</td>
                    <td>
                      <span className={styles.code}>{c.nombre_campo}</span>
                    </td>
                    <td>
                      <span className={styles.pill}>{tipo}</span>
                    </td>
                    <td>
                      {required ? (
                        <span className={styles.pillOk}>Sí</span>
                      ) : (
                        <span className={styles.pillMuted}>No</span>
                      )}
                    </td>
                    <td>
                      {active ? (
                        <span className={styles.pillOk}>Sí</span>
                      ) : (
                        <span className={styles.pillMuted}>No</span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => openEdit(c)}
                        aria-label="Editar"
                        disabled={!!busyAction}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className={`${styles.iconBtn} ${styles.iconDanger}`}
                        type="button"
                        onClick={() => remove(c)}
                        aria-label="Eliminar"
                        disabled={!!busyAction}
                      >
                        {rowBusy ? (
                          <Loader2 size={16} className={styles.spin} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>No hay campos aún</div>
                    <div className={styles.emptyMsg}>
                      Crea el primero para que aparezca en tus formularios.
                    </div>
                    <button
                      className={styles.btnPrimary}
                      type="button"
                      onClick={openCreate}
                      disabled={disableTopActions}
                    >
                      <Plus size={16} />
                      <span>Nuevo campo</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                {draft.id ? "Editar campo" : "Nuevo campo"}
              </div>
              <button
                className={styles.iconBtn}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                disabled={isSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Key (nombre_campo)</label>
                <input
                  value={draft.nombre_campo}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, nombre_campo: e.target.value }))
                  }
                  placeholder="ej: sector, edad, direccion"
                  disabled={!!draft.id || isSaving}
                />
                <div className={styles.fieldHint}>
                  Recomendación: sin espacios, minúsculas, estilo snake_case.
                </div>
              </div>

              <div className={styles.field}>
                <label>Etiqueta</label>
                <input
                  value={draft.etiqueta || ""}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, etiqueta: e.target.value }))
                  }
                  placeholder="Texto visible en el formulario"
                  disabled={isSaving}
                />
              </div>

              <div className={styles.field}>
                <label>Tipo</label>
                <select
                  value={normalizeTipo(String(draft.tipo))}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, tipo: e.target.value as any }))
                  }
                  disabled={isSaving}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Placeholder</label>
                <input
                  value={draft.placeholder || ""}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, placeholder: e.target.value }))
                  }
                  placeholder="Texto de ayuda (opcional)"
                  disabled={isSaving}
                />
              </div>

              {normalizeTipo(String(draft.tipo)) === "select" && (
                <div className={styles.fieldWide}>
                  <label>Opciones (una por línea)</label>
                  <textarea
                    value={(draft.opciones || []).join("\n")}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        opciones: e.target.value.split("\n"),
                      }))
                    }
                    placeholder={"A\nB\nC"}
                    disabled={isSaving}
                  />
                </div>
              )}

              <div className={styles.switchRow}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!!(draft.requerido || draft.obligatorio)}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        requerido: e.target.checked,
                        obligatorio: false,
                      }))
                    }
                    disabled={isSaving}
                  />
                  <span>Requerido</span>
                </label>

                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={draft.activo !== false}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, activo: e.target.checked }))
                    }
                    disabled={isSaving}
                  />
                  <span>Activo</span>
                </label>
              </div>
            </div>

            <div className={styles.modalFoot}>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={closeModal}
                disabled={isSaving}
              >
                <X size={16} />
                <span>Cancelar</span>
              </button>

              <button
                className={styles.btnPrimary}
                type="button"
                onClick={save}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 size={16} className={styles.spin} />
                ) : (
                  <Save size={16} />
                )}
                <span>{isSaving ? "Guardando…" : "Guardar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
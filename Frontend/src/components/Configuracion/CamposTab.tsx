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
  Search,
  SlidersHorizontal,
  Hash,
  Type,
  TextCursorInput,
  Calendar,
  CalendarClock,
  ToggleLeft,
  ToggleRight,
  List,
  TextQuote,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

/* =======================
   TYPES
======================= */

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
  placeholder?: string | null;
  opciones?: string[] | null;
  activo?: boolean;
};

type Toast = { type: "success" | "error" | "info"; msg: string } | null;

type Option = { value: string; label: string; icon?: React.ReactNode };

/* =======================
   HELPERS
======================= */

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

const TIPOS: { value: CampoTipo; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Texto", icon: <Type size={16} /> },
  { value: "textarea", label: "Texto largo", icon: <TextQuote size={16} /> },
  { value: "integer", label: "Entero", icon: <Hash size={16} /> },
  { value: "number", label: "Número", icon: <TextCursorInput size={16} /> },
  { value: "date", label: "Fecha", icon: <Calendar size={16} /> },
  { value: "datetime", label: "Fecha y hora", icon: <CalendarClock size={16} /> },
  { value: "boolean", label: "Sí/No", icon: <ToggleRight size={16} /> },
  { value: "select", label: "Lista (Select)", icon: <List size={16} /> },
];

const emptyDraft: Omit<Campo, "id"> & { id?: number } = {
  nombre_campo: "",
  etiqueta: "",
  tipo: "text",
  placeholder: "",
  opciones: [],
  obligatorio: false,
  activo: true,
};

/* =======================
   CUSTOM SELECT (NO BLANCO)
======================= */

function CvSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`${styles.cvSelect} ${disabled ? styles.cvSelectDisabled : ""}`}
    >
      <button
        type="button"
        className={`${styles.cvSelectBtn} ${
          !selected ? styles.cvSelectPlaceholder : ""
        }`}
        onClick={() => !disabled && setOpen((s) => !s)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || "Selector"}
      >
        <span className={styles.cvSelectLeft}>
          <span className={styles.cvSelectIcon}>
            {selected?.icon ?? <SlidersHorizontal size={16} />}
          </span>
          <span
            className={styles.cvSelectText}
            title={selected ? selected.label : placeholder}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span className={styles.cvSelectChevron} aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div className={styles.cvSelectMenu} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${styles.cvSelectItem} ${
                o.value === value ? styles.cvSelectItemActive : ""
              }`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              role="option"
              aria-selected={o.value === value}
              title={o.label}
            >
              <span className={styles.cvSelectIcon}>
                {o.icon ?? <SlidersHorizontal size={16} />}
              </span>
              <span className={styles.cvSelectItemText}>{o.label}</span>
              {o.value === value && (
                <CheckCircle2 size={16} className={styles.cvSelectCheck} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =======================
   SMALL UI PARTS
======================= */

function Switch({
  checked,
  onChange,
  disabled,
  label,
  iconOn,
  iconOff,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchOn : styles.switchOff}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      title={label}
    >
      <span className={styles.switchIcon}>
        {checked ? iconOn ?? <ToggleRight size={16} /> : iconOff ?? <ToggleLeft size={16} />}
      </span>
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{label}</span>
      </span>
      <span className={styles.switchKnob} aria-hidden="true" />
    </button>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const t = normalizeTipo(tipo);
  const item = TIPOS.find((x) => x.value === t);
  return (
    <span className={styles.tipoBadge} title={item?.label || t}>
      <span className={styles.tipoIcon}>
        {item?.icon ?? <SlidersHorizontal size={14} />}
      </span>
      <span className={styles.tipoText}>{item?.label ?? t}</span>
    </span>
  );
}

/* =======================
   COMPONENT
======================= */

export default function CamposTab() {
  const [rows, setRows] = useState<Campo[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [busyAction, setBusyAction] = useState<null | "save" | "delete" | "toggle">(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Campo | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const sorted = useMemo(() => [...rows].sort((a, b) => a.id - b.id), [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return sorted.filter((c) => {
      if (onlyActive && c.activo === false) return false;
      if (!qq) return true;
      const a = (c.nombre_campo || "").toLowerCase();
      const b = (c.etiqueta || "").toLowerCase();
      const t = String(c.tipo || "").toLowerCase();
      return a.includes(qq) || b.includes(qq) || t.includes(qq);
    });
  }, [sorted, q, onlyActive]);

  const pushToast = (t: Toast, autoCloseMs = 3000) => {
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
      pushToast({ type: "error", msg: "Nombre del campo es obligatorio." });
      return;
    }

    const tipo = normalizeTipo(String(draft.tipo));
    const payload: any = {
      nombre_campo: draft.nombre_campo.trim(),
      etiqueta: draft.etiqueta?.trim() || null,
      tipo,
      placeholder: draft.placeholder?.trim() || null,
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
    setBusyId(draft.id ?? null);

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
      setBusyId(null);
    }
  };

  const askDelete = (c: Campo) => {
    setToDelete(c);
    setConfirmOpen(true);
    pushToast(null, 0);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusyAction("delete");
    setBusyId(toDelete.id);

    try {
      await api.delete(`/campos/${toDelete.id}`);
      pushToast({ type: "success", msg: "Campo eliminado." });
      setConfirmOpen(false);
      setToDelete(null);
      await load();
    } catch (e: any) {
      pushToast({ type: "error", msg: extractMsg(e) });
    } finally {
      setBusyAction(null);
      setBusyId(null);
    }
  };

  const toggleActivo = async (c: Campo) => {
    const next = !(c.activo !== false);
    setBusyAction("toggle");
    setBusyId(c.id);

    try {
      await api.put(`/campos/${c.id}`, { activo: next });
      setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: next } : x)));
      pushToast({ type: "info", msg: next ? "Campo activado." : "Campo desactivado." }, 2200);
    } catch (e: any) {
      pushToast({ type: "error", msg: extractMsg(e) });
    } finally {
      setBusyAction(null);
      setBusyId(null);
    }
  };

  const isSaving = busyAction === "save";
  const isDeleting = busyAction === "delete";
  const isToggling = busyAction === "toggle";

  const toastIcon =
    toast?.type === "success" ? (
      <CheckCircle2 size={16} />
    ) : toast?.type === "error" ? (
      <XCircle size={16} />
    ) : (
      <Info size={16} />
    );

  return (
    <div className={styles.wrap}>
      {/* HEADER */}
      <div className={styles.toolbar}>
        <div className={styles.badge}>
          <ListChecks size={16} />
          <span>Campos del Formulario</span>
          <span className={styles.counter} title="Total de campos">
            {rows.length}
          </span>
        </div>

        <div className={styles.right}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={styles.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, etiqueta o tipo…"
              aria-label="Buscar campos"
            />
            {q && (
              <button
                className={styles.clearBtn}
                onClick={() => setQ("")}
                type="button"
                aria-label="Limpiar"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={styles.btnGhost}
            type="button"
            onClick={() => setOnlyActive((s) => !s)}
            aria-pressed={onlyActive}
            title="Filtrar activos"
          >
            <SlidersHorizontal size={16} />
            <span>{onlyActive ? "Solo activos" : "Todos"}</span>
          </button>

          <button className={styles.btnGhost} type="button" onClick={load} disabled={loadingList}>
            {loadingList ? <Loader2 size={16} className={styles.spin} /> : <RefreshCcw size={16} />}
            <span>Recargar</span>
          </button>

          <button className={styles.btnPrimary} type="button" onClick={openCreate}>
            <Plus size={16} />
            <span>Nuevo campo</span>
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "success"
              ? styles.toastOk
              : toast.type === "error"
              ? styles.toastBad
              : styles.toastInfo
          }`}
          role="status"
        >
          <span className={styles.toastIcon}>{toastIcon}</span>
          <span className={styles.toastMsg}>{toast.msg}</span>
          <button className={styles.toastClose} onClick={() => setToast(null)} aria-label="Cerrar" type="button">
            <X size={16} />
          </button>
        </div>
      )}

      {/* CONTENT */}
      <div className={styles.card}>
        {pageError ? (
          <div className={styles.state}>
            <div className={styles.stateIconBad}>
              <AlertTriangle size={18} />
            </div>
            <div className={styles.stateText}>
              <div className={styles.stateTitle}>No se pudo cargar</div>
              <div className={styles.stateSub}>{pageError}</div>
            </div>
            <button className={styles.btnPrimary} onClick={load} type="button">
              <RefreshCcw size={16} />
              <span>Reintentar</span>
            </button>
          </div>
        ) : loadingList ? (
          <div className={styles.skeletonList} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.state}>
            <div className={styles.stateIconInfo}>
              <ListChecks size={18} />
            </div>
            <div className={styles.stateText}>
              <div className={styles.stateTitle}>Sin resultados</div>
              <div className={styles.stateSub}>{q ? "Sin coincidencias." : "Aún no hay campos."}</div>
            </div>
            <button className={styles.btnPrimary} onClick={openCreate} type="button">
              <Plus size={16} />
              <span>Crear campo</span>
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <div>Campo</div>
              <div>Tipo</div>
              <div>Flags</div>
              <div>Estado</div>
              <div className={styles.thActions}>Acciones</div>
            </div>

            <div className={styles.tableBody}>
              {filtered.map((c) => {
                const activo = c.activo !== false;
                const busy = busyId === c.id && (isDeleting || isToggling);
                return (
                  <div key={c.id} className={`${styles.row} ${!activo ? styles.rowOff : ""}`}>
                    <div className={styles.colName}>
                      <span className={styles.namePill} title={c.nombre_campo}>
                        <Hash size={14} />
                        <span className={styles.nameText}>{c.nombre_campo}</span>
                      </span>
                      {c.placeholder ? (
                        <span className={styles.smallHint} title={c.placeholder}>
                          {c.placeholder}
                        </span>
                      ) : (
                        <span className={styles.smallHintMuted} />
                      )}
                    </div>

                    <div className={styles.colTipo}>
                      <TipoBadge tipo={String(c.tipo)} />
                    </div>

                    <div className={styles.colFlags}>
                      <span className={`${styles.flag} ${c.obligatorio ? styles.flagOn : styles.flagOff}`} title="Obligatorio">
                        <ShieldCheck size={14} />
                        <span>Obl</span>
                      </span>
                      <span
                        className={`${styles.flag} ${
                          normalizeTipo(String(c.tipo)) === "select" ? styles.flagOn : styles.flagOff
                        }`}
                        title="Lista (select)"
                      >
                        <List size={14} />
                        <span>Sel</span>
                      </span>
                    </div>

                    <div className={styles.colState}>
                      <button
                        className={`${styles.stateBtn} ${activo ? styles.stateBtnOn : styles.stateBtnOff}`}
                        onClick={() => !busy && toggleActivo(c)}
                        disabled={busy}
                        type="button"
                        aria-label={activo ? "Desactivar" : "Activar"}
                        title={activo ? "Desactivar" : "Activar"}
                      >
                        {busy ? (
                          <Loader2 size={16} className={styles.spin} />
                        ) : activo ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                        <span>{activo ? "Activo" : "Inactivo"}</span>
                      </button>
                    </div>

                    <div className={styles.colActions}>
                      <button className={styles.iconBtn} onClick={() => openEdit(c)} type="button" title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => askDelete(c)}
                        type="button"
                        title="Eliminar"
                        disabled={busyId === c.id && isDeleting}
                      >
                        {busyId === c.id && isDeleting ? (
                          <Loader2 size={16} className={styles.spin} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREATE/EDIT */}
      {modalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <span className={styles.modalTitleIcon}>
                  {draft.id ? <Pencil size={18} /> : <Plus size={18} />}
                </span>
                <span>{draft.id ? "Editar campo" : "Nuevo campo"}</span>
              </div>

              <button
                className={styles.iconBtn}
                onClick={closeModal}
                disabled={isSaving}
                type="button"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>
                  <span className={styles.labelIcon}>
                    <Hash size={14} />
                  </span>
                  Nombre
                </label>

                <div className={styles.inputWrap}>
                  <Hash size={16} className={styles.inputIcon} />
                  <input
                    value={draft.nombre_campo}
                    onChange={(e) => setDraft((p) => ({ ...p, nombre_campo: e.target.value }))}
                    placeholder="sector, edad, direccion…"
                    disabled={!!draft.id || isSaving}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>
                  <span className={styles.labelIcon}>
                    <Type size={14} />
                  </span>
                  Etiqueta
                </label>

                <div className={styles.inputWrap}>
                  <Type size={16} className={styles.inputIcon} />
                  <input
                    value={draft.etiqueta || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, etiqueta: e.target.value }))}
                    placeholder="Texto visible en el formulario…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>
                  <span className={styles.labelIcon}>
                    <SlidersHorizontal size={14} />
                  </span>
                  Tipo
                </label>

                <CvSelect
                  value={normalizeTipo(String(draft.tipo))}
                  onChange={(v) => setDraft((p) => ({ ...p, tipo: v as any }))}
                  options={TIPOS.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
                  placeholder="Selecciona un tipo…"
                  disabled={isSaving}
                  ariaLabel="Tipo de campo"
                />
              </div>

              <div className={styles.field}>
                <label>
                  <span className={styles.labelIcon}>
                    <TextCursorInput size={14} />
                  </span>
                  Placeholder
                </label>

                <div className={styles.inputWrap}>
                  <TextCursorInput size={16} className={styles.inputIcon} />
                  <input
                    value={draft.placeholder || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, placeholder: e.target.value }))}
                    placeholder="Ej: Ingrese el nombre del sector…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className={styles.fieldWide}>
                <div className={styles.switchGrid}>
                  <Switch
                    checked={!!draft.activo}
                    onChange={(v) => setDraft((p) => ({ ...p, activo: v }))}
                    disabled={isSaving}
                    label="Activo"
                    iconOn={<ToggleRight size={16} />}
                    iconOff={<ToggleLeft size={16} />}
                  />

                  <Switch
                    checked={!!draft.obligatorio}
                    onChange={(v) => setDraft((p) => ({ ...p, obligatorio: v }))}
                    disabled={isSaving}
                    label="Obligatorio"
                    iconOn={<ShieldCheck size={16} />}
                    iconOff={<ShieldCheck size={16} />}
                  />
                </div>
              </div>

              {normalizeTipo(String(draft.tipo)) === "select" && (
                <div className={styles.fieldWide}>
                  <label>
                    <span className={styles.labelIcon}>
                      <List size={14} />
                    </span>
                    Opciones (una por línea)
                  </label>

                  <div className={styles.textareaWrap}>
                    <List size={16} className={styles.textareaIcon} />
                    <textarea
                      value={(draft.opciones || []).join("\n")}
                      onChange={(e) => setDraft((p) => ({ ...p, opciones: e.target.value.split("\n") }))}
                      placeholder={"A\nB\nC"}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFoot}>
              <button className={styles.btnGhost} onClick={closeModal} disabled={isSaving} type="button">
                <X size={16} />
                <span>Cancelar</span>
              </button>

              <button className={styles.btnPrimary} onClick={save} disabled={isSaving} type="button">
                {isSaving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
                <span>{isSaving ? "Guardando…" : "Guardar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.confirm}>
            <div className={styles.confirmHead}>
              <div className={styles.confirmIcon}>
                <AlertTriangle size={18} />
              </div>
              <div className={styles.confirmTitle}>Eliminar campo</div>
              <button
                className={styles.iconBtn}
                onClick={() => !isDeleting && setConfirmOpen(false)}
                disabled={isDeleting}
                type="button"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.confirmBody}>
              <div className={styles.confirmText}>
                Eliminar <span className={styles.confirmStrong}>{toDelete?.nombre_campo}</span>.
              </div>
            </div>

            <div className={styles.confirmFoot}>
              <button className={styles.btnGhost} onClick={() => setConfirmOpen(false)} disabled={isDeleting} type="button">
                <X size={16} />
                <span>Cancelar</span>
              </button>

              <button className={styles.btnDanger} onClick={doDelete} disabled={isDeleting} type="button">
                {isDeleting ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                <span>{isDeleting ? "Eliminando…" : "Eliminar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
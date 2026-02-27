import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

import {
  Plus,
  Users,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Braces,
  Globe,
  Github,
  Linkedin,
  Instagram,
  Facebook,
  Clock,
  LayoutGrid,
} from "lucide-react";

import styles from "./HomePage.module.css";

type Toast = { type: "success" | "error" | "info"; msg: string } | null;

export default function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [expFormat, setExpFormat] = useState<"csv" | "json">("csv");
  const [expIncludeDeleted, setExpIncludeDeleted] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const dateTimeLabel = useMemo(() => {
    const date = now.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} • ${time}`;
  }, [now]);

  const pushToast = (t: Toast, ms = 1800) => {
    setToast(t);
    if (!t) return;
    window.setTimeout(() => setToast(null), ms);
  };

  const refresh = async () => {
    setLoading(true);
    setToast(null);
    try {
      await api.get("/comuneros");
      pushToast({ type: "success", msg: "Actualizado" });
    } catch {
      pushToast({ type: "error", msg: "Sin conexión" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doExport = async () => {
    setExporting(true);
    setToast(null);
    try {
      const url = `/exportaciones/comuneros?formato=${expFormat}&include_deleted=${
        expIncludeDeleted ? "true" : "false"
      }`;

      const res = await api.get(url, { responseType: "blob" as any });
      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data ?? ""]);

      const ext = expFormat === "csv" ? "csv" : "json";
      const filename = `comuneros_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.${ext}`;

      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      pushToast({ type: "success", msg: "Exportado" }, 2000);
    } catch {
      pushToast({ type: "error", msg: "Error al exportar" }, 2200);
    } finally {
      setExporting(false);
    }
  };

  const statusClass = token ? styles.good : styles.bad;

  const quickActions = [
    { label: "Registrar", icon: Plus, onClick: () => navigate("/comuneros/nuevo"), primary: true },
    { label: "Comuneros", icon: Users, onClick: () => navigate("/comuneros") },
    { label: "Configuración", icon: Settings, onClick: () => navigate("/configuracion") },
  ] as const;

  return (
    <div className={styles.home}>
      {/* HEADER / HERO + ACCIONES (sin repetir) */}
      <section className={`${styles.widget} ${styles.hero}`}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTitle}>ComunaVision</div>
          <div className={styles.heroSub}>Panel operativo</div>

          <div className={styles.actions}>
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={`${styles.btn} ${a.primary ? styles.primary : ""}`}
                  type="button"
                >
                  <Icon size={18} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.meta}>
            <div className={`${styles.status} ${statusClass}`}>
              {token ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {token ? "Sesión activa" : "Sin sesión"}
            </div>

            <div className={styles.pill}>
              <Clock size={16} />
              <span className="muted">{dateTimeLabel}</span>
            </div>

            <button
              className={styles.refresh}
              onClick={refresh}
              aria-label="Actualizar"
              title="Actualizar"
              disabled={loading}
              type="button"
            >
              <RefreshCw size={16} />
            </button>
          </div>

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
              aria-live="polite"
            >
              <span>{toast.msg}</span>
            </div>
          )}
        </div>
      </section>

      {/* GRID */}
      <section className={styles.grid}>
        {/* EXPORTACIONES (integrado en una sola barra) */}
        <div className={`${styles.widget} ${styles.widgetWide}`}>
          <div className={styles.widgetTop}>
            <div className={styles.widgetTitle}>Exportaciones</div>

            <div className={styles.exportBar}>
              <div className={styles.segment}>
                <button
                  className={`${styles.segBtn} ${expFormat === "csv" ? styles.segActive : ""}`}
                  onClick={() => setExpFormat("csv")}
                  type="button"
                  aria-pressed={expFormat === "csv"}
                >
                  <FileText size={16} />
                  CSV
                </button>

                <button
                  className={`${styles.segBtn} ${expFormat === "json" ? styles.segActive : ""}`}
                  onClick={() => setExpFormat("json")}
                  type="button"
                  aria-pressed={expFormat === "json"}
                >
                  <Braces size={16} />
                  JSON
                </button>
              </div>

              <div className={styles.switchWrap} title="Incluir eliminados">
                <span className={styles.switchLabel}>Incluir eliminados</span>

                <button
                  type="button"
                  className={`${styles.switch} ${expIncludeDeleted ? styles.switchOn : ""}`}
                  onClick={() => setExpIncludeDeleted((v) => !v)}
                  role="switch"
                  aria-checked={expIncludeDeleted}
                  aria-label="Alternar incluir eliminados"
                >
                  <span className={styles.switchThumb} />
                </button>
              </div>

              <button
                className={`${styles.btn} ${styles.primary} ${styles.exportBtn}`}
                onClick={doExport}
                disabled={exporting}
                type="button"
                title="Descargar"
              >
                <Download size={18} />
                {exporting ? "Exportando…" : "Descargar"}
              </button>
            </div>
          </div>
        </div>

        {/* PERFIL / LINKS (solo botones, sin ExternalLink) */}
        <div className={styles.widget}>
          <div className={styles.widgetTop}>
            <div className={styles.widgetTitle}>Jarek</div>
          </div>

          <div className={styles.links}>
            <a className={styles.linkBtn} href="https://jarekchallco.netlify.app/" target="_blank" rel="noreferrer">
              <Globe size={18} />
              Web
            </a>

            <a className={styles.linkBtn} href="https://github.com/CHALLCOJAREK" target="_blank" rel="noreferrer">
              <Github size={18} />
              GitHub
            </a>

            <a
              className={styles.linkBtn}
              href="https://www.linkedin.com/in/jarek-angelo-challco-juarez-70a029249/"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin size={18} />
              LinkedIn
            </a>

            <a className={styles.linkBtn} href="https://www.instagram.com/jarek_challco21/" target="_blank" rel="noreferrer">
              <Instagram size={18} />
              Instagram
            </a>

            <a className={styles.linkBtn} href="https://www.facebook.com/jarek.challco.22" target="_blank" rel="noreferrer">
              <Facebook size={18} />
              Facebook
            </a>
          </div>
        </div>

        {/* ACCESO RÁPIDO (sin repetir: aquí es “vista” compacta) */}
        <div className={styles.widget}>
          <div className={styles.widgetTop}>
            <div className={styles.widgetTitle}>Acceso rápido</div>
          </div>

          <div className={styles.quickGrid}>
            <button className={styles.quickBtn} onClick={() => navigate("/comuneros/nuevo")} type="button">
              <Plus size={18} />
              Nuevo
            </button>

            <button className={styles.quickBtn} onClick={() => navigate("/comuneros")} type="button">
              <LayoutGrid size={18} />
              Listado
            </button>

            <button className={styles.quickBtn} onClick={() => navigate("/configuracion")} type="button">
              <Settings size={18} />
              Ajustes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
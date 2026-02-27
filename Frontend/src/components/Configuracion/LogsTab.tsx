import React from "react";
import styles from "./ConfiguracionTabs.module.css";
import { ShieldAlert, RefreshCcw } from "lucide-react";

export default function LogsTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.badge}>
            <ShieldAlert size={16} />
            <span>Logs / Auditoría</span>
          </div>
          <p className={styles.hint}>
            Revisión rápida de actividad y eventos del sistema.
          </p>
        </div>

        <div className={styles.toolbarRight}>
          <button className={styles.btnGhost} type="button">
            <RefreshCcw size={16} />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Pendiente de conexión a /logs</div>
          <div className={styles.emptyText}>
            Lo siguiente es renderizar tabla con filtros (fecha/usuario/acción).
          </div>
        </div>
      </div>
    </div>
  );
}
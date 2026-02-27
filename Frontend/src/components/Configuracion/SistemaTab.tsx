import React from "react";
import styles from "./ConfiguracionTabs.module.css";
import { Activity } from "lucide-react";

export default function SistemaTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.badge}>
            <Activity size={16} />
            <span>Sistema</span>
          </div>
          <p className={styles.hint}>
            Estado del backend y parámetros globales.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Health + preferencias</div>
          <div className={styles.emptyText}>
            Conectamos GET /health y dejamos panel para branding y defaults del sistema.
          </div>
        </div>
      </div>
    </div>
  );
}
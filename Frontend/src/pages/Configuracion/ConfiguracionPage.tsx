import React, { useState } from "react";
import { Settings2, Layers, ArrowRight, ArrowLeft } from "lucide-react";
import CamposTab from "../../components/Configuracion/CamposTab";
import styles from "./ConfiguracionPage.module.css";

export default function ConfiguracionPage() {
  const [view, setView] = useState<"home" | "campos">("home");

  return (
    <div className="page">
      <div className={styles.header}>
        <div className={styles.meta}>
          <Settings2 size={16} />
          <span>Panel administrativo</span>
        </div>

        <p className={styles.subtitle}>
          Centraliza la configuración clave del sistema. Cambios aquí impactan formularios y flujos.
        </p>
      </div>

      {view === "home" ? (
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon} aria-hidden="true">
              <Layers size={22} />
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>Campos dinámicos</div>
              <div className={styles.cardDesc}>
                Define, edita o elimina campos personalizados usados en formularios.
              </div>
            </div>

            <button
              className={styles.cardBtn}
              type="button"
              onClick={() => setView("campos")}
            >
              <span>Gestionar</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.sectionBar}>
            <button
              className={styles.backBtn}
              type="button"
              onClick={() => setView("home")}
            >
              <ArrowLeft size={16} />
              <span>Volver</span>
            </button>

            <div className={styles.hint}>
              Gestión de campos dinámicos
            </div>
          </div>

          <CamposTab />
        </div>
      )}
    </div>
  );
}
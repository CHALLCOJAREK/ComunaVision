// C:\Proyectos\ComunaVision\Frontend\src\pages\Comuneros\ComunerosPage.tsx
import React from "react";
import ComunerosTable from "../../components/Tabla/ComunerosTable";
import styles from "./ComunerosPage.module.css";

export default function ComunerosPage() {
  return (
    <section className={styles.scope} aria-label="Comuneros">
      <ComunerosTable />
    </section>
  );
}
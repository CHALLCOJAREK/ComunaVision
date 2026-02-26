import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DynamicForm from "../../components/DynamicForm";
import { api } from "../../services/api";
import styles from "./ComuneroNuevoPage.module.css";

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

export default function ComuneroNuevoPage() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canSubmit = useMemo(() => {
    return nombre.trim().length > 0 && documento.trim().length > 0 && !loading;
  }, [nombre, documento, loading]);

  const onCreate = async () => {
    const n = nombre.trim();
    const d = documento.trim();

    if (!n || !d) {
      setToast({
        type: "error",
        message: "Nombre y Documento son obligatorios.",
      });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      await api.post("/comuneros", {
        nombre: n,
        documento: d,
        datos_dinamicos: datos || {},
      });

      setToast({
        type: "success",
        message: "Comunero registrado correctamente.",
      });

      setTimeout(() => {
        navigate("/comuneros");
      }, 800);
    } catch (e: any) {
      const { detail } = extractError(e);
      setToast({
        type: "error",
        message: detail,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className={styles.wrapper}>

        {toast && (
          <div
            className={`${styles.toast} ${
              toast.type === "success"
                ? styles.toastSuccess
                : styles.toastError
            }`}
            role="alert"
          >
            {toast.message}
          </div>
        )}

        <div className={`${styles.card}`}>
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>Nuevo Comunero</h2>
              <p className={styles.subtitle}>
                Registro de datos básicos y campos personalizados
              </p>
            </div>

            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigate("/comuneros")}
                disabled={loading}
              >
                Cancelar
              </button>

              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={onCreate}
                disabled={!canSubmit}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre</label>
              <input
                className={styles.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese el nombre completo"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Documento</label>
              <input
                className={styles.input}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Número de documento"
              />
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.dynamicSection}>
            <h3 className={styles.sectionTitle}>Campos adicionales</h3>
            <DynamicForm onChange={setDatos} />
          </div>
        </div>
      </div>
    </div>
  );
}
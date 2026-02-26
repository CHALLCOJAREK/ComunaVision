import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./Login.module.css";
import logoCv from "../../assets/logo-comunavision.svg";

function IconEye({ open }: { open: boolean }) {
  // SVG inline (0 deps), color heredado por currentColor
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M12 5c5.5 0 9.7 4.5 10.9 6.2.2.3.2.7 0 1C21.7 14 17.5 19 12 19S2.3 14 1.1 12.2c-.2-.3-.2-.7 0-1C2.3 9.5 6.5 5 12 5Zm0 2C7.8 7 4.4 10.3 3.2 12 4.4 13.7 7.8 17 12 17s7.6-3.3 8.8-5C19.6 10.3 16.2 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M3.2 2.8 21.2 20.8l-1.4 1.4-2.6-2.6C15.8 20.2 14 20.6 12 20.6c-6 0-10.4-5-11.6-6.9a1 1 0 0 1 0-1.1c.8-1.2 2.4-3.2 4.6-4.8L1.8 4.2 3.2 2.8Zm3.4 5.9C4.8 10 3.6 11.4 2.8 12.6c1.3 1.6 4.8 6 9.2 6 .9 0 1.8-.1 2.6-.4l-2-2A4.5 4.5 0 0 1 7.8 12c0-1 .3-2 .8-2.8l-2-2ZM12 7.4c6 0 10.4 5 11.6 6.9.2.3.2.8 0 1.1a17.7 17.7 0 0 1-3.8 4.2l-1.4-1.4c1.5-1.2 2.6-2.7 3.2-3.6-1.3-1.6-4.8-6-9.6-6-.7 0-1.4.1-2 .2L8.6 7.4c1-.1 2.1 0 3.4 0Zm0 2.6a2 2 0 0 1 2 2c0 .3-.1.6-.2.9l-2.7-2.7c.3-.1.6-.2.9-.2Zm-2 2c0-.3.1-.6.2-.9l2.7 2.7c-.3.1-.6.2-.9.2a2 2 0 0 1-2-2Z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span className={styles.spinner} aria-hidden="true">
      <svg viewBox="0 0 24 24" className={styles.spinnerSvg}>
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 10 10h-2A8 8 0 1 1 12 4V2Z"
        />
      </svg>
    </span>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !loading && !!username.trim() && !!password,
    [loading, username, password]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.noise} />

      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.head}>
          <div
            className={styles.logo}
            style={{ ["--logo-url" as any]: `url(${logoCv})` }}
          />
          <div className={styles.brand}>
            <h2>ComunaVision</h2>
            <p>Inicia sesión para continuar</p>
          </div>
        </div>

        <div className={styles.body}>
          <label className={styles.field}>
            
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario o correo"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            

            <div className={styles.passWrap}>
              <input
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
              />

              <button
                type="button"
                className={styles.passToggle}
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <IconEye open={showPass} />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn primary ${styles.loginBtn}`}
          >
            <span className={styles.btnInner}>
              {loading ? (
                <>
                  <Spinner />
                  <span>Ingresando…</span>
                </>
              ) : (
                <>
                  <span className={styles.btnSpark} aria-hidden="true" />
                  <span>Ingresar</span>
                </>
              )}
            </span>
          </button>

          {err && (
            <div className={styles.error} role="alert" aria-live="polite">
              {err}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
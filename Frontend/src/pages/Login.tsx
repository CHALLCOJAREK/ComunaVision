import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      // luego de login, iremos a / (por ahora recargamos simple)
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={onSubmit} style={{ width: 380, padding: 18, borderRadius: 14, background: "rgba(0,0,0,.06)" }}>
        <h2 style={{ margin: 0 }}>ComunaVision</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>Inicia sesión para continuar</p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            type="password"
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.15)" }}
          />

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{ padding: 12, borderRadius: 10, cursor: "pointer" }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {err && (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,0,0,.08)" }}>
              {err}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
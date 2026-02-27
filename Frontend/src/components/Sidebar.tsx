import React, { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Users, Settings2, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo-comunavision.svg";

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const lockRef = useRef<number | null>(null);

  // Mini siempre (auto)
  useEffect(() => {
    const shell = document.querySelector(".cv-shell");
    if (!shell) return;
    shell.classList.add("cv-shell-mini");
    return () => shell.classList.remove("cv-shell-mini");
  }, []);

  const lockCollapse = () => {
    // “corta” hover/focus para que colapse incluso si el mouse sigue encima
    document.documentElement.classList.add("cv-sb-locked");

    if (lockRef.current) window.clearTimeout(lockRef.current);
    lockRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove("cv-sb-locked");
      lockRef.current = null;
    }, 450); // ajusta: 350–650ms va fino
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `cv-link${isActive ? " active" : ""}`;

  const doLogout = () => {
    lockCollapse();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="cv-sidebar cv-mini cv-auto" onMouseLeave={lockCollapse}>
      <div className="cv-brand">
        <img src={logo} alt="ComunaVision" className="cv-logo" />
        <div className="cv-brandText">
          <h1>ComunaVision</h1>
        </div>
      </div>

      <nav className="cv-nav">
        <div className="cv-navMain">
          <NavLink to="/home" className={linkClass} onClick={lockCollapse} title="Home">
            <Home size={18} /> <span className="cv-label">Home</span>
          </NavLink>

          <NavLink to="/comuneros" className={linkClass} onClick={lockCollapse} title="Comuneros">
            <Users size={18} /> <span className="cv-label">Comuneros</span>
          </NavLink>

          {/*
          <NavLink to="/estadisticas" className={linkClass} onClick={lockCollapse} title="Estadísticas">
            <BarChart3 size={18} /> <span className="cv-label">Estadísticas</span>
          </NavLink>
          */}
        </div>

        <div className="cv-navBottom">
          <div className="hr" />

          <NavLink
            to="/configuracion"
            className={linkClass}
            onClick={lockCollapse}
            title="Configuración"
          >
            <Settings2 size={18} /> <span className="cv-label">Configuración</span>
          </NavLink>

          <button className="btn danger" onClick={doLogout} type="button" title="Salir">
            <LogOut size={18} /> <span className="cv-label">Salir</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
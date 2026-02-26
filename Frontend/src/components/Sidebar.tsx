import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Users, BarChart3, Settings, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ReactComponent as Logo } from "../assets/logo-comunavision.svg";

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `cv-link${isActive ? " active" : ""}`;

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="cv-sidebar">
      <div className="cv-brand">
        <Logo className="cv-logo" />
        <div>
          <h1>ComunaVision</h1>
          <p>Empadronamiento moderno</p>
        </div>
      </div>

      <nav className="cv-nav">
        <NavLink to="/home" className={linkClass}>
          <Home size={18} /> Home
        </NavLink>

        {/* ✅ antes era "/" y te mandaba a Home por el redirect */}
        <NavLink to="/comuneros" className={linkClass}>
          <Users size={18} /> Comuneros
        </NavLink>

        <NavLink to="/estadisticas" className={linkClass}>
          <BarChart3 size={18} /> Estadísticas
        </NavLink>

        <NavLink to="/configuracion" className={linkClass}>
          <Settings size={18} /> Configuración
        </NavLink>

        <div className="hr" />

        <button className="btn danger" onClick={doLogout} type="button">
          <LogOut size={18} /> Salir
        </button>
      </nav>
    </aside>
  );
}
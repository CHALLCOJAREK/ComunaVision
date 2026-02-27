import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";

function titleFromPath(path: string) {
  if (path === "/" || path.startsWith("/comuneros")) return "Comuneros";
  if (path.startsWith("/home")) return "Home";

  if (path.startsWith("/configuracion")) return "Configuración";
  return "ComunaVision";
}

export default function Header() {
  const loc = useLocation();
  const title = useMemo(() => titleFromPath(loc.pathname), [loc.pathname]);

  return (
    <header className="cv-titlebar">
      {/* key para animar al cambiar de ruta */}
      <div key={loc.pathname} className="cv-titlebar-inner">
        <div className="cv-titlebar-title">{title}</div>
      </div>
      <div className="cv-titlebar-underline" />
    </header>
  );
}
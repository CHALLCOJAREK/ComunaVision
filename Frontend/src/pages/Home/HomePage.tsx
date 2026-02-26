import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

import {
  Plus,
  Users,
  BarChart3,
  Settings,
  Clock,
  MapPin,
  Wind,
  RefreshCw,
  CheckCircle,
  XCircle,
  UserPlus,
  Trash2,
  Thermometer,
} from "lucide-react";

import styles from "./HomePage.module.css";

type Comunero = {
  id: number;
  deleted_at?: string | null;
  created_at?: string | null;
};

export default function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());

  const [total, setTotal] = useState<number | null>(null);
  const [today, setToday] = useState<number | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);

  const [city, setCity] = useState<string>("Detectando...");
  const [temp, setTemp] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const clockLabel = useMemo(
    () => `${now.toLocaleDateString()} • ${now.toLocaleTimeString()}`,
    [now]
  );

  const loadKpis = async () => {
    setLoadingKpis(true);
    try {
      const res = await api.get("/comuneros");
      const rows: Comunero[] = res?.data ?? res ?? [];

      const activos = rows.filter((c) => !c.deleted_at);
      const eliminados = rows.filter((c) => !!c.deleted_at);

      setTotal(activos.length);
      setDeleted(eliminados.length);

      const todayStr = new Date().toISOString().slice(0, 10);
      const hoy = activos.filter((c) => c.created_at?.slice(0, 10) === todayStr).length;

      setToday(hoy);
    } catch {
      setTotal(null);
      setToday(null);
      setDeleted(null);
    } finally {
      setLoadingKpis(false);
    }
  };

  const loadWeather = async () => {
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&timezone=auto`
        );

        const j = await r.json();

        setTemp(j?.current?.temperature_2m ?? null);
        setWind(j?.current?.wind_speed_10m ?? null);
        setCity("Tu ubicación");
      });
    } catch {
      setCity("No disponible");
    }
  };

  useEffect(() => {
    loadKpis();
    loadWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = (v: number | null) => (loadingKpis ? "…" : v ?? "—");

  const statusClass = token ? styles.good : styles.bad;

  return (
    <div className={styles.home}>
      {/* HERO / ACCIONES */}
      <section className={`${styles.widget} ${styles.hero}`}>
        <div className={styles.actions}>
          <button
            onClick={() => navigate("/comuneros/nuevo")}
            className={`${styles.btn} ${styles.primary}`}
          >
            <Plus size={18} />
            Registrar
          </button>

          <button onClick={() => navigate("/comuneros")} className={styles.btn}>
            <Users size={18} />
            Comuneros
          </button>

          <button onClick={() => navigate("/estadisticas")} className={styles.btn}>
            <BarChart3 size={18} />
            Estadísticas
          </button>

          <button onClick={() => navigate("/configuracion")} className={styles.btn}>
            <Settings size={18} />
            Configuración
          </button>
        </div>

        <div className={styles.meta}>
          <div className={`${styles.status} ${statusClass}`}>
            {token ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {token ? "Sesión activa" : "Sin sesión"}
          </div>

          <div className={styles.clockMini}>
            <Clock size={16} />
            <span className="muted">{clockLabel}</span>
          </div>

          <button
            className={styles.refresh}
            onClick={() => {
              loadKpis();
              loadWeather();
            }}
            aria-label="Sincronizar datos"
          >
            <RefreshCw size={16} />
            Sync
          </button>
        </div>
      </section>

      {/* GRID INFERIOR */}
      <section className={styles.grid}>
        {/* RELOJ */}
        <div className={styles.widget}>
          <Clock size={28} className={styles.iconTop} />
          <div className={styles.clockBig}>{now.toLocaleTimeString()}</div>
          <div className={`${styles.clockSmall} muted`}>{now.toLocaleDateString()}</div>
        </div>

        {/* CLIMA */}
        <div className={styles.widget}>
          <Thermometer size={28} className={styles.iconTop} />
          <div className={styles.weatherMain}>
            {temp !== null ? `${Math.round(temp)}°C` : "—"}
          </div>
          <div className={styles.weatherSub}>
            <MapPin size={14} />
            <span className="muted">{city}</span>
          </div>
          <div className={styles.weatherSub}>
            <Wind size={14} />
            <span className="muted">{wind !== null ? `${wind} km/h` : "—"}</span>
          </div>
        </div>

        {/* KPIs */}
        <div className={styles.widget}>
          <Users size={28} className={styles.iconTop} />

          <div className={styles.kpi}>
            <span className={styles.kpiLeft}>
              <Users size={14} />
              <span className="muted">Activos</span>
            </span>
            <span className={styles.kpiValue}>{value(total)}</span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLeft}>
              <UserPlus size={14} />
              <span className="muted">Hoy</span>
            </span>
            <span className={styles.kpiValue}>{value(today)}</span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLeft}>
              <Trash2 size={14} />
              <span className="muted">Eliminados</span>
            </span>
            <span className={styles.kpiValue}>{value(deleted)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
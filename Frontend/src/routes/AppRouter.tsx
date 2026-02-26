import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login from "../pages/Login/Login";
import Layout from "../components/Layout";

import HomePage from "../pages/Home/HomePage";
import ComunerosPage from "../pages/Comuneros/ComunerosPage";
import ComuneroNuevoPage from "../pages/ComuneroNuevo/ComuneroNuevoPage";
import ComuneroEditarPage from "../pages/ComuneroEditar/ComuneroEditarPage";
import EstadisticasPage from "../pages/Estadisticas/EstadisticasPage";
import ConfiguracionPage from "../pages/Configuracion/ConfiguracionPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />}
      />

      {/* Root */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Home */}
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Layout>
              <HomePage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Comuneros - listado */}
      <Route
        path="/comuneros"
        element={
          <PrivateRoute>
            <Layout>
              <ComunerosPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Comuneros - nuevo */}
      <Route
        path="/comuneros/nuevo"
        element={
          <PrivateRoute>
            <Layout>
              <ComuneroNuevoPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Comuneros - editar */}
      <Route
        path="/comuneros/:id/editar"
        element={
          <PrivateRoute>
            <Layout>
              <ComuneroEditarPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Estadísticas */}
      <Route
        path="/estadisticas"
        element={
          <PrivateRoute>
            <Layout>
              <EstadisticasPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Configuración */}
      <Route
        path="/configuracion"
        element={
          <PrivateRoute>
            <Layout>
              <ConfiguracionPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
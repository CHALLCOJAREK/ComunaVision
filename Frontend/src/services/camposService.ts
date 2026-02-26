import { api } from "./api";

export type CampoFormulario = {
  id: number;
  nombre_campo: string;
  tipo: string;
  obligatorio: boolean;
  activo: boolean;

  // opcionales si tu schema los trae
  label?: string;
  placeholder?: string;
  help_text?: string;
  opciones?: string[]; // si manejas select
  orden?: number;
};

export const camposService = {
  listar: () => api.get<CampoFormulario[]>("/campos"),
};
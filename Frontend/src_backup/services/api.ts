// src/services/api.ts
// Cliente HTTP mínimo (fetch wrapper) + Bearer token + manejo 401/403/409

export type ApiErrorPayload = {
  detail?: string;
  code?: string;
  field?: string;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const DEFAULT_BASE_URL = "http://localhost:8000";

function getBaseUrl(): string {
  // Vite: import.meta.env.VITE_API_URL
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  return (envUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function getToken(): string | null {
  return localStorage.getItem("cv_token");
}

function buildUrl(path: string): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    auth?: boolean; // default true
    signal?: AbortSignal;
  }
): Promise<T> {
  const url = buildUrl(path);
  const auth = options?.auth ?? true;

  const headers: Record<string, string> = {
    ...(options?.headers || {}),
  };

  // JSON by default when body is object (except FormData / URLSearchParams)
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const isUrlParams = typeof URLSearchParams !== "undefined" && options?.body instanceof URLSearchParams;

  if (!isFormData && !isUrlParams && options?.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body:
      options?.body === undefined
        ? undefined
        : isFormData || isUrlParams
          ? options.body
          : JSON.stringify(options.body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const data = await parseResponse(res);
    const payload: ApiErrorPayload | undefined =
      typeof data === "object" && data !== null ? data : undefined;

    // Si 401: token muerto => forzamos logout global
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    const msg =
      payload?.detail ||
      (typeof data === "string" ? data : `HTTP ${res.status} - ${res.statusText}`);

    throw new ApiError(res.status, msg, payload);
  }

  return (await parseResponse(res)) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<Parameters<typeof request<T>>[2], "body">) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof request<T>>[2], "body">) =>
    request<T>("POST", path, { ...(opts || {}), body }),
  put: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof request<T>>[2], "body">) =>
    request<T>("PUT", path, { ...(opts || {}), body }),
  patch: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof request<T>>[2], "body">) =>
    request<T>("PATCH", path, { ...(opts || {}), body }),
  del: <T>(path: string, opts?: Omit<Parameters<typeof request<T>>[2], "body">) =>
    request<T>("DELETE", path, opts),
};
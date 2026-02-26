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
  if (contentType.includes("application/json")) return await res.json();

  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

/** ✅ NUEVO: opciones extendidas */
type RequestOptions = {
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;

  /** fuerza el tipo de respuesta */
  responseType?: "json" | "text" | "blob";

  /** evita logout automático en 401 cuando tú lo indiques */
  logoutOn401?: boolean;
};

async function request<T>(
  method: string,
  path: string,
  options?: RequestOptions
): Promise<T> {
  const url = buildUrl(path);
  const auth = options?.auth ?? true;

  const headers: Record<string, string> = { ...(options?.headers || {}) };

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
    let data: any;
    try { data = await parseResponse(res); } catch { data = undefined; }

    const payload: ApiErrorPayload | undefined =
      typeof data === "object" && data !== null ? data : undefined;

    const logoutOn401 = options?.logoutOn401 ?? true;
    if (res.status === 401 && logoutOn401) window.dispatchEvent(new CustomEvent("auth:logout"));

    const msg =
      payload?.detail ||
      (typeof data === "string" ? data : `HTTP ${res.status} - ${res.statusText}`);

    throw new ApiError(res.status, msg, payload);
  }

  /** ✅ NUEVO: devolver blob/text/json según se pida */
  const rt = options?.responseType ?? "json";
  if (rt === "blob") return (await res.blob()) as unknown as T;
  if (rt === "text") return (await res.text()) as unknown as T;

  return (await parseResponse(res)) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: any, opts?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...(opts || {}), body }),
  put: <T>(path: string, body?: any, opts?: Omit<RequestOptions, "body">) =>
    request<T>("PUT", path, { ...(opts || {}), body }),
  patch: <T>(path: string, body?: any, opts?: Omit<RequestOptions, "body">) =>
    request<T>("PATCH", path, { ...(opts || {}), body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "body">) =>
    request<T>("DELETE", path, opts),

  /** ✅ NUEVO: helper para descargas */
  getBlob: (path: string, opts?: Omit<RequestOptions, "body">) =>
    request<Blob>("GET", path, { ...(opts || {}), responseType: "blob" }),
};
/** База URL API: пустая строка = относительные пути (прокси Next.js → backend в dev). */
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw === undefined || raw.trim() === "") {
    return "";
  }
  return raw.replace(/\/$/, "");
}

export const API_URL = getApiBaseUrl();

/** Публичный URL для статики backend (`/uploads/...`) или абсолютный URL → значение для `<img src>`. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export type ApiError = {
  detail?: string;
  message?: string;
};

const NETWORK_ERROR_HINT =
  "Не удалось связаться с сервером API. Запустите backend (например: из корня проекта `docker compose up api` или PHP-сервер на порту из `API_PORT` / 8000).";

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof TypeError)) {
    return false;
  }
  const m = err.message;
  return m === "Failed to fetch" || m === "Load failed" || m.includes("NetworkError");
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function buildAuthHeaders(token?: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function tryRefreshFromCookie(): Promise<string | null> {
  const stored = getRefreshToken();
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(stored ? { refresh_token: stored } : {}),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token) return null;
    setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? "",
    });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  let res: Response;
  try {
    const method = opts.method ?? "GET";
    const token = opts.token ?? getAccessToken();
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    if (isNetworkFetchError(err)) {
      throw new Error(NETWORK_ERROR_HINT);
    }
    throw err;
  }

  if (
    res.status === 401 &&
    path !== "/api/auth/refresh" &&
    path !== "/api/auth/login" &&
    path !== "/api/auth/register"
  ) {
    const refreshedAccess = await tryRefreshFromCookie();
    if (refreshedAccess) {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(refreshedAccess),
        },
        credentials: "include",
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const detail = data?.detail || data?.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (text === "") {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * GET-запрос: при ответе 404 возвращает null (без исключения).
 * Остальные коды ошибок — как у apiFetch.
 */
export async function apiGetOr404<T>(path: string, opts: { token?: string | null } = {}): Promise<T | null> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  async function doFetch(access: string | null): Promise<Response> {
    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(access ?? undefined),
      },
      credentials: "include",
    });
  }

  let res: Response;
  try {
    const token = opts.token ?? getAccessToken();
    res = await doFetch(token);
  } catch (err) {
    if (isNetworkFetchError(err)) {
      throw new Error(NETWORK_ERROR_HINT);
    }
    throw err;
  }

  if (
    res.status === 401 &&
    path !== "/api/auth/refresh" &&
    path !== "/api/auth/login" &&
    path !== "/api/auth/register"
  ) {
    const refreshedAccess = await tryRefreshFromCookie();
    if (refreshedAccess) {
      res = await doFetch(refreshedAccess);
    }
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const detail = data?.detail || data?.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  const text = await res.text();
  if (text === "") {
    return null;
  }

  return JSON.parse(text) as T;
}

/** Скачивание бинарного ответа (CSV, PDF) с Bearer-токеном. */
export async function apiFetchBlob(
  path: string,
  opts: { token?: string | null } = {}
): Promise<Blob> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  let res: Response;
  try {
    const token = opts.token ?? getAccessToken();
    res = await fetch(url, {
      method: "GET",
      headers: {
        ...buildAuthHeaders(token),
      },
      credentials: "include",
    });
  } catch (err) {
    if (isNetworkFetchError(err)) {
      throw new Error(NETWORK_ERROR_HINT);
    }
    throw err;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const detail = data?.detail || data?.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  return res.blob();
}

export async function apiFetchForm<T>(
  path: string,
  opts: { token?: string | null; body: FormData }
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  let res: Response;
  try {
    const token = opts.token ?? getAccessToken();
    res = await fetch(url, {
      method: "POST",
      headers: {
        ...buildAuthHeaders(token),
      },
      credentials: "include",
      body: opts.body,
    });
  } catch (err) {
    if (isNetworkFetchError(err)) {
      throw new Error(NETWORK_ERROR_HINT);
    }
    throw err;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const detail = data?.detail || data?.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  return (await res.json()) as T;
}

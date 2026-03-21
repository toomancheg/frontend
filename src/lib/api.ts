export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export type ApiError = {
  detail?: string;
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: "GET" | "POST";
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const detail = data?.detail || data?.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  return (await res.json()) as T;
}


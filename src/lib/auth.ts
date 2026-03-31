export const ACCESS_TOKEN_KEY = "phystr_access_token";
export const REFRESH_TOKEN_KEY = "phystr_refresh_token";

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

const AUTH_CHANGED_EVENT = "phystr:auth-changed";
let accessToken: string | null = null;
let refreshToken: string | null = null;

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setTokens(tokens: Tokens) {
  accessToken = tokens.access_token || null;
  refreshToken = tokens.refresh_token || null;
  if (typeof window !== "undefined") {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  emitAuthChanged();
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    const s = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (s) {
      accessToken = s;
      return s;
    }
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  if (typeof window !== "undefined") {
    const s = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (s) {
      refreshToken = s;
      return s;
    }
  }
  return null;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  emitAuthChanged();
}

export function subscribeAuthChanges(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_CHANGED_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

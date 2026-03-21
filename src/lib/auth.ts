export const ACCESS_TOKEN_KEY = "phystr_access_token";
export const REFRESH_TOKEN_KEY = "phystr_refresh_token";

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export function setTokens(tokens: Tokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}


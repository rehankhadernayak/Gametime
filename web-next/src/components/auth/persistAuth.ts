const AUTH_KEY = "gametime_auth";

export type GametimeAuth = {
  token: string;
  role: "parent" | "child" | "";
  user: unknown;
};

export function saveAuth(next: GametimeAuth) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(next));
}

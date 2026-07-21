// Manejo de la Gemini API Key del lado del cliente.
// Cada usuario guarda SU propia key en el navegador (localStorage),
// para consumir su propio RPM/RPD — igual que el Apps Script.

const STORAGE_KEY = "gemini_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Enmascara la key para mostrarla: "AIza…3f9a"
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return key;
  return key.slice(0, 4) + "…" + key.slice(-4);
}

export function pareceKeyValida(key: string): boolean {
  return key.trim().startsWith("AIza");
}

// A published build must never silently serve local simulation data.
export const LIVE_MODE = import.meta.env.PROD || import.meta.env.VITE_DATA_MODE === "aws";
const configuredBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const base = import.meta.env.DEV ? "" : configuredBase;
let accessToken = "";
let tokenProvider: (() => Promise<string>) | undefined;
export function setTokenProvider(provider: () => Promise<string>) {
  tokenProvider = provider;
}
export function setAccessToken(token: string) {
  accessToken = token.trim();
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  if (!configuredBase || configuredBase.includes("REPLACE"))
    throw new Error(
      "Set VITE_API_BASE_URL in the root .env before using AWS mode.",
    );
  const token =
    path.split("?")[0] === "/public"
      ? ""
      : tokenProvider
        ? await tokenProvider()
        : accessToken;
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      throw new Error("AWS request timed out (25s). Check your connection and retry.");
    }
    throw new Error(err?.message || "Failed to connect to AWS services. Check network connection.");
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`Service returned an unreadable response (${response.status}). Please retry.`); }
  if (!response.ok)
    throw new Error(
      result?.message || result?.error || `Request failed (${response.status})`,
    );
  return result;
}

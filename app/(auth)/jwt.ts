// src/auth/jwt.ts
import { Account, Client } from "appwrite";

// Very small, safe decoder for JWT payload (no external deps)
function decodeExp(jwt: string): number | undefined {
  try {
    const [, payload] = jwt.split(".");
    const json = JSON.parse(atob(payload));
    return typeof json.exp === "number" ? json.exp : undefined;
  } catch {
    return undefined;
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Creates a fresh JWT, sets it on the client, and schedules the next refresh
 * ~2 minutes before expiration. Safe to call repeatedly.
 */
export async function attachFreshJWT(account: Account, client: Client) {
  // Get fresh JWT from Appwrite
  const res = await account.createJWT(); // { jwt: string }
  client.setJWT(res.jwt);

  // Clear any prior timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  // Schedule next refresh ~2m before exp, minimum 30s guard
  const exp = decodeExp(res.jwt);
  if (exp) {
    const msUntilExpiry = exp * 1000 - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 2 * 60_000, 30_000);
    refreshTimer = setTimeout(() => {
      attachFreshJWT(account, client).catch(() => {
        // swallow — next privileged call can re-attach
      });
    }, refreshIn);
  }
}

/**
 * Force-refresh right now (e.g., before a critical write).
 */
export async function ensureFreshJWT(account: Account, client: Client) {
  await attachFreshJWT(account, client);
}

/**
 * Stop scheduled refreshes (on logout).
 */
export function clearJwtScheduler() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

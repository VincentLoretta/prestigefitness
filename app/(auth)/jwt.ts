import { Account, Client } from "appwrite";
import { decode as atob } from "base-64"; // ✅ works on Hermes/release

function decodeExp(jwt: string): number | undefined {
  try {
    const [, payload] = jwt.split(".");
    const obj = JSON.parse(atob(payload));
    return typeof obj.exp === "number" ? obj.exp : undefined;
  } catch {
    return undefined;
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

export async function attachFreshJWT(account: Account, client: Client) {
  if (stopped) return;
  const res = await account.createJWT();      // { jwt }
  client.setJWT(res.jwt);

  if (refreshTimer) clearTimeout(refreshTimer);
  const exp = decodeExp(res.jwt);
  if (!exp) return;

  const msUntil = exp * 1000 - Date.now();
  const refreshIn = Math.max(msUntil - 120_000, 30_000);
  refreshTimer = setTimeout(() => {
    if (!stopped) attachFreshJWT(account, client).catch(() => {});
  }, refreshIn);
}

export async function ensureFreshJWT(account: Account, client: Client) {
  if (stopped) return;
  await attachFreshJWT(account, client);
}

export function clearJwtScheduler() {
  stopped = true;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

export function resumeJwtScheduler() {
  stopped = false;
}

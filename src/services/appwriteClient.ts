// src/services/appwriteClient.ts
import { Account, Client, Databases } from "appwrite";

export const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
export const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;
export const DB_ID = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;

if (__DEV__) {
  console.log("[APPWRITE] endpoint:", endpoint);
  console.log("[APPWRITE] project:", projectId);
}

export const client = new Client().setProject(projectId).setEndpoint(endpoint);
export const account = new Account(client);
export const databases = new Databases(client);

/** Hit the public health endpoint (no auth). */
export async function probeAppwritePublic(): Promise<boolean> {
  try {
    const r = await fetch(`${endpoint}/health/version`);
    if (!r.ok) throw new Error(String(r.status));
    const v = await r.json();
    if (__DEV__) console.log("[APPWRITE] /health/version:", v);
    return true;
  } catch (e) {
    console.warn("[APPWRITE] public probe failed:", e);
    return false;
  }
}

/** Mint a fresh JWT from current cookie session and set it on the client. */
export async function refreshJWT(): Promise<void> {
  const { jwt } = await account.createJWT(); // 401 if no cookie session
  if (!jwt || jwt.split(".").length !== 3) throw new Error("Invalid JWT");
  client.setJWT(jwt);
}

/**
 * Wrap any Appwrite call and auto-retry once if the JWT is missing/expired.
 * Use this for all database writes (and reads, if you want).
 */
export async function runWithFreshJWT<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const code = e?.code;
    const isJwtIssue =
      code === 401 ||
      /invalid token|failed to verify jwt|unauthorized/i.test(msg);

    if (isJwtIssue) {
      // refresh then retry once
      await refreshJWT();
      return await op();
    }
    throw e;
  }
}

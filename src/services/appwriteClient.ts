// src/services/appwriteClient.ts
import { Account, Client, Databases, Functions } from "appwrite";

export const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
export const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;

export const client = new Client().setProject(PROJECT_ID).setEndpoint(ENDPOINT);
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

/** Brutally clear any auth from the client (JWT/session header). */
export function clearClientAuth() {
  try {
    // Preferred way on newer SDKs:
   
    client.setJWT(null);
  } catch {}
  try {
    // Some SDK versions keep an internal headers bag
    // @ts-ignore private-ish API; best-effort cleanup
    if (client.headers) {
      delete client.headers["x-appwrite-jwt"];
      delete client.headers["X-Appwrite-JWT"];
      delete client.headers["cookie"];
    }
  } catch {}
  try {
    // Extra nuke for internal config fields some SDKs keep
    // @ts-ignore private-ish
    if (client.clientConfig) {
      // @ts-ignore
      client.clientConfig.jwt = undefined;
      // @ts-ignore
      client.clientConfig.session = undefined;
    }
  } catch {}
}

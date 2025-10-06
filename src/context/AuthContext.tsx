// src/context/AuthContext.tsx
import { attachFreshJWT, clearJwtScheduler, ensureFreshJWT } from "@/(auth)/jwt";
import { Account, Client, Models } from "appwrite";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;

const client = new Client().setProject(PROJECT_ID).setEndpoint(ENDPOINT);
const account = new Account(client);

type AuthCtx = {
  user: Models.User<Models.Preferences> | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  getClient: () => Client;
  ensureFresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Restore session on boot; attach JWT only after we confirm a session exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sess = await account.getSession("current"); // throws if none
        if (cancelled) return;
        await attachFreshJWT(account, client);
        const me = await account.get();
        if (cancelled) return;
        setUser(me);
      } catch {
        // no session; user stays null
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    await attachFreshJWT(account, client);
    const me = await account.get();
    setUser(me);
    setAuthReady(true);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    await account.create(email, password, name ?? undefined);
    await account.createEmailPasswordSession(email, password);
    await attachFreshJWT(account, client);
    const me = await account.get();
    setUser(me);
    setAuthReady(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession("current");
    } catch {}
    clearJwtScheduler();
    setUser(null);
    // Optional: clear client JWT to avoid accidental “ghost” calls
   
    client.headers["x-appwrite-jwt"] = undefined;
    setAuthReady(true);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user,
    authReady,
    login,
    register,
    logout,
    getClient: () => client,
    ensureFresh: () => ensureFreshJWT(account, client),
  }), [user, authReady, login, register, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

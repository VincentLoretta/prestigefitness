// src/context/AuthContext.tsx
import {
  attachFreshJWT,
  clearJwtScheduler,
  ensureFreshJWT as ensureFreshJWTImpl,
  resumeJwtScheduler,
} from "@/(auth)/jwt";
import { Models } from "appwrite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { account, clearClientAuth, client } from "src/services/appwriteClient";

type AuthCtx = {
  user: Models.User<Models.Preferences> | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  ensureFresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Restore session on app start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await account.getSession("current"); // throws if none
        if (cancelled) return;
        resumeJwtScheduler();
        await attachFreshJWT(account, client);
        const me = await account.get();
        if (!cancelled) setUser(me);
      } catch {
        clearClientAuth();
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
    resumeJwtScheduler();
    await attachFreshJWT(account, client);
    const me = await account.get();
    setUser(me);
    setAuthReady(true);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      await account.create(email, password, name ?? undefined);
      await account.createEmailPasswordSession(email, password);
      resumeJwtScheduler();
      await attachFreshJWT(account, client);
      const me = await account.get();
      setUser(me);
      setAuthReady(true);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore: if no server session, still clear local auth
    }
    clearJwtScheduler();
    clearClientAuth();
    setUser(null);
    setAuthReady(true);
  }, []);

  const ensureFresh = useCallback(
    () => ensureFreshJWTImpl(account, client),
    []
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      authReady,
      login,
      register,
      logout,
      ensureFresh,
    }),
    [user, authReady, login, register, logout, ensureFresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

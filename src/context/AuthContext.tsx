import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { getToken, setToken } from "../api/client";
import type { Credentials, User } from "../api/types";

/**
 * 인증 컨텍스트. 토큰은 localStorage(capimate.token), 사용자는 메모리에만 둔다.
 * 첫 렌더에 토큰이 있으면 GET /auth/me 로 세션을 복원하고, 실패하면 토큰을 지운다.
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** 토큰은 있지만 /auth/me 응답을 아직 못 받은 상태. ProtectedRoute가 이 동안 기다린다. */
  checkingSession: boolean;
  login: (credentials: Credentials) => Promise<User>;
  signup: (credentials: Credentials) => Promise<User>;
  logout: () => Promise<void>;
  /** 탈퇴처럼 서버 세션이 이미 사라진 뒤 로컬만 정리할 때. */
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(() => !!getToken());

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let current = true;
    authApi.me()
      .then(me => { if (current && getToken() === token) setUser(me); })
      .catch(() => { if (current && getToken() === token) { setToken(null); setUser(null); } })
      .finally(() => { if (current) setCheckingSession(false); });
    return () => { current = false; };
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const session = await authApi.login(credentials);
    setToken(session.token);
    setUser(session.user);
    setCheckingSession(false);
    return session.user;
  }, []);

  const signup = useCallback(async (credentials: Credentials) => {
    const session = await authApi.signup(credentials);
    setToken(session.token);
    setUser(session.user);
    setCheckingSession(false);
    return session.user;
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setCheckingSession(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, checkingSession, login, signup, logout, clearSession }),
    [user, checkingSession, login, signup, logout, clearSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있다.");
  return ctx;
}

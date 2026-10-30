import { request } from "./client";
import type { Credentials, PasswordChangeRequest, Session, User } from "./types";

/** 가입·로그인·세션·계정 설정(tags auth·me). WP5 소유. */
export const authApi = {
  signup: (credentials: Credentials) => request<Session>("/auth/signup", { method: "POST", body: credentials }),
  login: (credentials: Credentials) => request<Session>("/auth/login", { method: "POST", body: credentials }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  changePassword: (body: PasswordChangeRequest) => request<void>("/me/password", { method: "PUT", body }),
  deleteAccount: () => request<void>("/me", { method: "DELETE" }),
};

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Fast, edge-level redirect for UX (keeps unauthenticated users off private
// pages before they even render). This is a convenience layer, not the
// security boundary — every private page/layout also verifies the session
// server-side via auth() as the actual access-control check.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  // API routes are excluded entirely — they each verify the session
  // themselves via auth() and return proper 401 JSON, not a redirect.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

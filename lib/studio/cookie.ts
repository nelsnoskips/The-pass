/**
 * The session cookie's name, and nothing else.
 *
 * Middleware runs on the edge runtime, which has no node:crypto and no
 * TCP sockets. Importing it from session.ts — which needs both — pulls
 * the whole module into the edge bundle and fails the build. One
 * constant in its own file is the cheapest way to share this between
 * the two runtimes.
 */
export const SESSION_COOKIE = "pass-studio";

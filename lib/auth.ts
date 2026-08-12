import { cookies } from "next/headers";
import { USERS } from "./data/seed";
import type { User } from "./types";

/**
 * Demo authentication.
 *
 * The Pass ships with seeded demo users covering each role so that
 * role/location authorization is real and testable end to end. The current
 * demo user is selected in Settings and stored in a cookie; every server
 * component and API route resolves the user here and passes it into the data
 * layer, which enforces location scope.
 *
 * Production replaces this module with a real session provider (e.g.
 * Auth.js/NextAuth or Clerk) returning the same `User` shape. Nothing outside
 * this file changes.
 */

export const DEMO_USER_COOKIE = "pass-demo-user";

export function getUserById(id: string | undefined): User {
  return USERS.find((u) => u.id === id) ?? USERS[0];
}

export async function getCurrentUser(): Promise<User> {
  const store = await cookies();
  return getUserById(store.get(DEMO_USER_COOKIE)?.value);
}

export function canEditCalendar(user: User): boolean {
  return user.role === "admin" || user.role === "marketer" || user.role === "location_manager";
}

export function canManageIntegrations(user: User): boolean {
  return user.role === "admin";
}

export function canSeeInternalNotes(user: User): boolean {
  return user.role === "marketer";
}

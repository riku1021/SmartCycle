export const ADMIN_EMAIL = "admin@mail.com" as const;
export const ADMIN_PASSWORD = "admin1234" as const;
export const DEV_EMAIL = "dev@mail.com" as const;
export const DEV_PASSWORD = "dev1234" as const;
export const USER_EMAIL = "user@mail.com" as const;
export const USER_PASSWORD = "user1234" as const;
export const OPERATOR_EMAIL = "operator@mail.com" as const;
export const OPERATOR_PASSWORD = "operator1234" as const;
export const USER_ROLE_STORAGE_KEY = "smartcycle_user_role" as const;

export type UserRole = "admin" | "dev" | "operator" | "user";

export function isAdminCredential(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function isDevCredential(email: string, password: string): boolean {
  return email === DEV_EMAIL && password === DEV_PASSWORD;
}

export function isGeneralUserCredential(email: string, password: string): boolean {
  return email === USER_EMAIL && password === USER_PASSWORD;
}

export function isOperatorCredential(email: string, password: string): boolean {
  return email === OPERATOR_EMAIL && password === OPERATOR_PASSWORD;
}

export function resolveRoleByCredential(email: string, password: string): UserRole {
  if (isAdminCredential(email, password)) {
    return "admin";
  }
  if (isDevCredential(email, password)) {
    return "dev";
  }
  if (isOperatorCredential(email, password)) {
    return "operator";
  }
  if (isGeneralUserCredential(email, password)) {
    return "user";
  }
  return "user";
}

export function setUserRole(role: UserRole): void {
  localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
}

export function getUserRole(): UserRole {
  const storedRole = localStorage.getItem(USER_ROLE_STORAGE_KEY);
  if (
    storedRole === "admin" ||
    storedRole === "dev" ||
    storedRole === "operator" ||
    storedRole === "user"
  ) {
    return storedRole;
  }
  return "user";
}

export function isAdminUser(): boolean {
  return getUserRole() === "admin";
}

export function isDevUser(): boolean {
  return getUserRole() === "dev";
}

export function isOperatorUser(): boolean {
  return getUserRole() === "operator";
}

export function isAdminOrDevUser(): boolean {
  const role = getUserRole();
  return role === "admin" || role === "dev";
}

export function isDashboardUser(): boolean {
  const role = getUserRole();
  return role === "admin" || role === "dev" || role === "operator";
}

export function clearUserRole(): void {
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);
}

export type RoleBearingUser = {
  globalRol?: string | null;
  roller?: Array<{ rol: string }>;
} | null | undefined;

export function getRoleNames(user: RoleBearingUser): string[] {
  if (!user) return [];
  const branchRoles = Array.isArray(user.roller)
    ? user.roller.map((role) => role.rol)
    : [];
  return [...new Set([
    ...(user.globalRol ? [user.globalRol] : []),
    ...branchRoles,
  ])];
}

export function hasGlobalSystemAdminRole(user: RoleBearingUser): boolean {
  return user?.globalRol === "Sistem Yöneticisi";
}

export function canAccessBranchManagement(user: RoleBearingUser): boolean {
  return hasGlobalSystemAdminRole(user) || getRoleNames(user).includes("Kurucu");
}

"use client";

import React, { createContext, useContext } from "react";

export interface PermissionsContextType {
  accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER";
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  can: (permissionCode: string) => boolean;
  hasAny: (permissionCodes: string[]) => boolean;
  hasAll: (permissionCodes: string[]) => boolean;
  hasModule: (moduleName: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  accessLevel: "USER",
  roles: [],
  permissions: [],
  isSuperAdmin: false,
  isAdmin: false,
  can: () => false,
  hasAny: () => false,
  hasAll: () => false,
  hasModule: () => false,
});

export interface PermissionsProviderProps {
  user: {
    accessLevel?: "SUPER_ADMIN" | "ADMIN" | "USER";
    roles?: string[];
    permissions?: string[];
  };
  children: React.ReactNode;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ user, children }) => {
  const accessLevel = user.accessLevel || (user.roles?.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : user.roles?.includes("ADMIN") ? "ADMIN" : "USER");
  const roles = user.roles || [];
  const permissions = user.permissions || [];

  const isSuperAdmin = accessLevel === "SUPER_ADMIN" || roles.includes("SUPER_ADMIN");
  const isAdmin = isSuperAdmin || accessLevel === "ADMIN" || roles.includes("ADMIN");

  const can = (permissionCode: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    return permissions.includes(permissionCode);
  };

  const hasAny = (permissionCodes: string[]): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    return permissionCodes.some((code) => permissions.includes(code));
  };

  const hasAll = (permissionCodes: string[]): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    return permissionCodes.every((code) => permissions.includes(code));
  };

  const hasModule = (moduleName: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    const prefix = moduleName.toLowerCase() + ":";
    return permissions.some((p) => p.startsWith(prefix) || p.includes(moduleName.toLowerCase()));
  };

  return (
    <PermissionsContext.Provider
      value={{
        accessLevel,
        roles,
        permissions,
        isSuperAdmin,
        isAdmin,
        can,
        hasAny,
        hasAll,
        hasModule,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);

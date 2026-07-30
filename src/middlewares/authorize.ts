import type { RequestHandler } from "express";

export const ROLES = {
  ADMIN: "FLYPACKADMIN",
  MIAMI: "FLYPACKMIAMI",
  JDG: "FLYPACKJDG",
  CLIENT: "CLIENTFLYPACK",
  USER: "USER",
} as const;

export const ROLE_GROUPS = {
  admin: [ROLES.ADMIN],
  adminJdg: [ROLES.ADMIN, ROLES.JDG],
  operations: [ROLES.ADMIN, ROLES.MIAMI, ROLES.JDG],
  authenticated: [ROLES.ADMIN, ROLES.MIAMI, ROLES.JDG, ROLES.CLIENT, ROLES.USER],
};

const authorize = (...allowedRoles: string[]): RequestHandler => {
  return (req, res, next) => {
    const role = (req as any).user?.role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
        mensaje: "No tienes permisos para realizar esta accion",
        data: null,
      });
    }

    next();
  };
};

export { authorize };

import { Request, Response, NextFunction } from "express";

export const authorizeRole = (requiredRoles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!requiredRoles.includes(req.user?.role ?? "")) {
      return res.status(403).json({ message: "Access denied: Insufficient role" });
    }
    next();
  };
};

export const authorizeAnyPermission = (permissions: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user info" });
    }
    const { role, permissions: userPermissions } = req.user;

    if (role === "admin" || role === "manager") {
      return next();
    }

    // Nếu là user thì kiểm tra permission
    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ message: "Access denied: Missing required permission(s)" });
    }

    next();
  };
};

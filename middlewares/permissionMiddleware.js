export const authorizeRole = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!requiredRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient role" });
    }
    next();
  };
};

export const authorizeAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    const { role, permissions: userPermissions } = req.user;

    if (role === "admin" || role === "manager") {
      return next();
    }

    // Nếu là user thì kiểm tra permission
    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: "Access denied: Missing required permission(s)" });
    }

    next();
  };
};

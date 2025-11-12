"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAnyPermission = exports.authorizeRole = void 0;
const authorizeRole = (requiredRoles = []) => {
    return (req, res, next) => {
        if (!requiredRoles.includes(req.user?.role ?? "")) {
            return res.status(403).json({ message: "Access denied: Insufficient role" });
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
const authorizeAnyPermission = (permissions = []) => {
    return (req, res, next) => {
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
exports.authorizeAnyPermission = authorizeAnyPermission;
//# sourceMappingURL=permissionMiddleware.js.map
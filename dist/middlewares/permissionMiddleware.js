"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAnyPermission = exports.authorizeAccess = exports.authorizeRole = void 0;
const authorizeRole = (requiredRoles = []) => {
    return (req, res, next) => {
        if (!requiredRoles.includes(req.user?.role ?? "")) {
            return res.status(403).json({ message: "Access denied: Insufficient role" });
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
/**
 * Middleware phân quyền thông minh:
 * 1. Admin: Luôn luôn được qua.
 * 2. requireDepartment = true: Bắt buộc user phải thuộc phòng ban quản lý (chặn người xem chéo can thiệp sửa/xóa).
 * 3. Manager thuộc đúng phòng ban sở tại (departments): Luôn được qua.
 * 4. User nội bộ HOẶC Người xem chéo từ phòng ban khác (khi requireDepartment = false): Phải có permission tương ứng.
 */
const authorizeAccess = ({ departments = [], permissions = [], requireDept = false, }) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user info" });
        }
        const { role, department, permissions: userPermissions = [] } = req.user;
        // 1. Admin luôn có toàn quyền
        if (role === "admin") {
            return next();
        }
        const userDept = (department ?? "").toLowerCase();
        const isBelongToDept = departments.some((dept) => dept.toLowerCase() === userDept);
        // 2. Chặn nếu route bắt buộc phải thuộc phòng ban sở tại (thường dùng cho các thao tác Thêm/Sửa/Xóa)
        if (requireDept && !isBelongToDept) {
            return res.status(403).json({
                message: "Access denied: Chức năng này chỉ dành cho nhân sự thuộc phòng ban quản lý",
                errorCode: "DEPARTMENT_RESTRICTED",
            });
        }
        // 3. Manager của đúng phòng ban sở tại -> Tự động có quyền quản lý phòng mình
        if (role === "manager" && isBelongToDept) {
            return next();
        }
        // 4. User nội bộ hoặc Người xem chéo: Kiểm tra danh sách permissions
        if (permissions.length > 0) {
            const hasPermission = permissions.some((p) => userPermissions.includes(p));
            if (hasPermission) {
                return next();
            }
        }
        // 5. Nếu không đáp ứng điều kiện trên -> Từ chối 403
        return res.status(403).json({
            message: "Access denied: Bạn không có quyền truy cập chức năng này",
            errorCode: "ACCESS_DENIED",
        });
    };
};
exports.authorizeAccess = authorizeAccess;
const authorizeAnyPermission = (permissions = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user info" });
        }
        const { role, permissions: userPermissions = [] } = req.user;
        // 1. Admin luôn có toàn quyền
        if (role === "admin") {
            return next();
        }
        // 2. Nếu trong permissions có chỉ định role (ví dụ: ["admin", "manager"])
        if (permissions.includes(role)) {
            return next();
        }
        // 3. Nếu là user/manager thì kiểm tra permission
        const hasPermission = permissions.some((p) => userPermissions.includes(p));
        if (!hasPermission) {
            return res.status(403).json({
                message: "Access denied: Missing required permission(s)",
                errorCode: "ACCESS_DENIED",
            });
        }
        next();
    };
};
exports.authorizeAnyPermission = authorizeAnyPermission;
//# sourceMappingURL=permissionMiddleware.js.map
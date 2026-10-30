export type ScopeType = "ALL" | "DEPARTMENT" | "CROSS_VIEW" | "PERSONAL";

export interface DataScope {
  scope: ScopeType;
  filterUserId?: number; // Dùng để gán vào whereCondition nếu là PERSONAL
  isReadOnly: boolean;   // true nếu là người xem chéo (CROSS_VIEW)
}

export const getEffectiveScope = ({
  user,
  targetDepartment,
  crossPermissions = [],
}: {
  user: {
    userId: number;
    role: string;
    department?: string;
    permissions?: string[];
  };
  targetDepartment: string;
  crossPermissions?: string[];
}): DataScope => {
  const role = user.role?.toLowerCase();
  const userDept = (user.department ?? "").toLowerCase();
  const targetDept = targetDepartment.toLowerCase();
  const userPerms = user.permissions ?? [];

  // 1. Admin: Toàn quyền hệ thống
  if (role === "admin") {
    return { scope: "ALL", isReadOnly: false };
  }

  // 2. Manager của đúng phòng ban sở tại: Toàn quyền phòng ban mình
  if (role === "manager" && userDept === targetDept) {
    return { scope: "DEPARTMENT", isReadOnly: false };
  }

  // 3. Người xem chéo từ phòng ban khác (được Admin cấp permission tương ứng)
  const hasCrossPerm = crossPermissions.some((p) => userPerms.includes(p));
  if (userDept !== targetDept && hasCrossPerm) {
    return { scope: "CROSS_VIEW", isReadOnly: true };
  }

  // 4. User nội bộ phòng ban hoặc người chỉ có quyền cá nhân
  return {
    scope: "PERSONAL",
    filterUserId: user.userId,
    isReadOnly: false,
  };
};

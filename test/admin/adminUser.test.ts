import bcrypt from "bcrypt";
import { adminRepository } from "../../repository/adminRepository";
import { adminService } from "../../service/adminService";

jest.mock("../../repository/adminRepository", () => ({
  adminRepository: {
    getAllUser: jest.fn(),
    getUserByName: jest.fn(),
    getUserByPhone: jest.fn(),
    getUserByPk: jest.fn(),
  },
}));

jest.mock("bcrypt");

describe("Admin User Service", () => {
  beforeEach(() => jest.clearAllMocks());

  const mockUser = (data = {}) => {
    const base = {
      userId: 1,
      role: "user",
      permissions: ["read"],
      fullName: "chanh",
      email: "vanchanh0730@gmail.com",
      password: "oldpass",
      get: jest.fn(function () {
        return { ...this };
      }),
      toJSON: jest.fn(function () {
        return { ...this };
      }),
      save: jest.fn(),
      destroy: jest.fn(),
    };

    return Object.assign(base, data);
  };

  // 1. getAllUsers
  it("get all users except admin", async () => {
    const u1 = mockUser({ role: "admin" });
    const u2 = mockUser({ role: "user" });

    (adminRepository.getAllUser as jest.Mock).mockResolvedValue([u1, u2]);

    const res = await adminService.getAllUsers();

    expect(res.data.length).toBe(1);
    expect(res.data[0].role).toBe("user");
  });

  // 2. getUserByName
  it("throw Name Required", async () => {
    await expect(adminService.getUserByName("")).rejects.toThrow("Name is required");
  });

  it("throw NotFound when no user found by name", async () => {
    (adminRepository.getUserByName as jest.Mock).mockResolvedValue([]);

    await expect(adminService.getUserByName("john")).rejects.toThrow("User not found");
  });

  it("return users filtered by role != admin", async () => {
    const u1 = mockUser({ role: "admin" });
    const u2 = mockUser({ role: "user" });

    (adminRepository.getUserByName as jest.Mock).mockResolvedValue([u1, u2]);

    const res = await adminService.getUserByName("john");

    expect(res.data.length).toBe(1);
    expect(res.data[0].role).toBe("user");
  });

  // 3. getUserByPhone
  it("throw Phone Required", async () => {
    await expect(adminService.getUserByPhone("")).rejects.toThrow("Phone number is required");
  });

  it("throw NotFound when no user found by phone", async () => {
    (adminRepository.getUserByPhone as jest.Mock).mockResolvedValue([]);

    await expect(adminService.getUserByPhone("123")).rejects.toThrow("User not found");
  });

  it("return users filtered by role != admin (phone)", async () => {
    const u1 = mockUser({ role: "admin" });
    const u2 = mockUser({ role: "user" });
    const u3 = mockUser({ role: "manager" });

    console.log(u1.role);
    console.log(u2.role);
    console.log(u3.role);

    (adminRepository.getUserByPhone as jest.Mock).mockResolvedValue([u1, u2, u3]);

    const res = await adminService.getUserByPhone("123");

    expect(res.data.length).toBe(2);
    expect(res.data[0].role).toBe("user");
  });

  // 4. getUserByPermission
  it("throw Permission Required", async () => {
    await expect(adminService.getUserByPermission("")).rejects.toThrow("Permission is required");
  });

  it("return users that match permission", async () => {
    const u1 = mockUser({ permissions: ["read"] });
    const u2 = mockUser({ permissions: ["HR", "read"] });
    const u3 = mockUser({ permissions: ["manager"] });

    (adminRepository.getAllUser as jest.Mock).mockResolvedValue([u1, u2, u3]);

    const res = await adminService.getUserByPermission("read");

    expect(res.data.length).toBe(2);
    expect(res.data[0].permissions).toContain("read");
  });

  // 5. updateUserRole
  it("throw Invalid Role", async () => {
    await expect(adminService.updateUserRole(1, "invalid" as any)).rejects.toThrow(
      "Invalid role provided"
    );
  });

  it("throw User Not Found (updateUserRole)", async () => {
    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(null);

    await expect(adminService.updateUserRole(1, "user")).rejects.toThrow("User not found");
  });

  it("update role & permissions v1", async () => {
    const u = mockUser();

    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(u);

    const res = await adminService.updateUserRole(1, "admin");

    expect(u.role).toBe("admin"); //tobe = so sánh tuyệt đối
    expect(u.permissions).toContain("all"); //toContain = check array có chứa item
    expect(u.save).toHaveBeenCalled(); //toHaveBeenCalled = check mock đã được gọi hay chưa

    expect(res.data.role).toBe("admin");
  });

  it("update role & permissions v2", async () => {
    const u = mockUser();

    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(u);

    const res = await adminService.updateUserRole(1, "manager");

    expect(u.role).toBe("manager"); //tobe = so sánh tuyệt đối
    expect(u.permissions).toContain("manager"); //toContain = check array có chứa item
    expect(u.save).toHaveBeenCalled(); //toHaveBeenCalled = check mock đã được gọi hay chưa

    expect(res.data.role).toBe("manager");
  });

  // 6. updatePermissions
  it("throw invalid permissions format", async () => {
    await expect(adminService.updatePermissions(1, "invalid" as any)).rejects.toThrow(
      "Invalid permissions format"
    );
  });

  it("throw invalid permission list", async () => {
    await expect(adminService.updatePermissions(1, ["no_exist"])).rejects.toThrow(
      "Invalid permissions"
    );
  });

  it("update permissions", async () => {
    const u = mockUser();
    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(u);

    const valid = ["read"];
    const res = await adminService.updatePermissions(1, valid);

    expect(u.permissions).toEqual(valid);
    expect(u.save).toHaveBeenCalled();
  });

  // 7. deleteUserById
  it("throw User Not Found (deleteUser)", async () => {
    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(null);

    await expect(adminService.deleteUserById(1)).rejects.toThrow("User not found");
  });

  it("delete user successfully", async () => {
    const u = mockUser();
    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(u);

    const res = await adminService.deleteUserById(1);

    expect(u.destroy).toHaveBeenCalled();
    expect(res.message).toBe("User deleted successfully");
  });

  // 8. resetPassword
  it("throw invalid input for reset password", async () => {
    await expect(adminService.resetPassword([], "")).rejects.toMatchObject({
      message: "userIds must be a non-empty array and newPassword is required",
      errorCode: "INVALID_INPUT",
    });
  });

  it("throw user not found to update", async () => {
    (adminRepository.getUserByPk as jest.Mock).mockResolvedValue(null);

    await expect(adminService.resetPassword([1], "123")).rejects.toMatchObject({
      message: "users not found to update",
      errorCode: "USER_NOT_FOUND",
    });
  });

  it("reset password for multiple users", async () => {
    const u1 = mockUser();
    const u2 = mockUser({ userId: 2 });

    (adminRepository.getUserByPk as jest.Mock).mockResolvedValueOnce(u1).mockResolvedValueOnce(u2);

    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed123");

    const res = await adminService.resetPassword([1, 2], "123");

    expect(res.message).toBe("Passwords reset successfully");
    expect(u1.save).toHaveBeenCalled();
    expect(u2.save).toHaveBeenCalled();
  });
});

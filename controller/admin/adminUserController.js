import bcrypt from "bcrypt";
import User from "../../models/user/user.js";
import cloudinary from "../../configs/connectCloudinary.js";
import { col, fn, Op, where } from "sequelize";
import { validPermissions } from "../../configs/machineLabels.js";
import { getCloudinaryPublicId } from "../../utils/image/converToWebp.js";

//get all users
export const getAllUsers = async (req, res) => {
  try {
    const data = await User.findAll();

    const sanitizedData = data
      .map((user) => {
        const { password, ...sanitizedUser } = user.toJSON();
        return sanitizedUser;
      })
      .filter((user) => user.role.toLowerCase() !== "admin"); // Loại bỏ role:admin

    res.status(200).json({
      message: "Get all users successfully (excluding admin)",
      data: sanitizedData,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get user by name
export const getUserByName = async (req, res) => {
  const { name } = req.query;
  const nameLower = name.toLowerCase();

  if (!nameLower) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const users = await User.findAll({
      where: where(fn("LOWER", col("fullName")), {
        [Op.like]: `%${nameLower}%`,
      }),
    });
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const sanitizedUsers = users
      .map((user) => {
        const { password, ...rest } = user.toJSON();
        return rest;
      })
      .filter((user) => user.role.toLowerCase() !== "admin");

    res.status(200).json({
      message: "Get all users from DB",
      data: sanitizedUsers,
    });
  } catch (error) {
    console.error("Error fetching user by name:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get user by phone
export const getUserByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    const users = await User.findAll({
      where: { phone: phone },
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const sanitizedUsers = users
      .map((user) => {
        const { password, ...rest } = user.toJSON();
        return rest;
      })
      .filter((user) => user.role.toLowerCase() !== "admin");

    res.status(200).json({
      message: "Get user by phone from DB",
      data: sanitizedUsers,
    });
  } catch (error) {
    console.error("Error fetching user by phone:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//get user by permission
export const getUserByPermission = async (req, res) => {
  let { permission } = req.query;

  if (!permission) {
    return res.status(400).json({ message: "Permission is required" });
  }

  try {
    if (!Array.isArray(permission)) {
      permission = [permission]; // chuyển về dạng mảng nếu chỉ có 1
    }

    const lowerPermissions = permission.map((p) => p.toLowerCase());

    const users = await User.findAll();

    const matchedUsers = users.filter((user) => {
      const perms = Array.isArray(user.permissions)
        ? user.permissions
        : JSON.parse(user.permissions || "[]");

      return perms.some((perm) => lowerPermissions.includes(perm.toLowerCase()));
    });

    const sanitizedUsers = matchedUsers
      .map((user) => {
        const { password, ...rest } = user.toJSON();
        return rest;
      })
      .filter((user) => user.role.toLowerCase() !== "admin");

    return res.status(200).json({
      message: "Get users by permission from DB",
      data: sanitizedUsers,
    });
  } catch (error) {
    console.error("Error fetching users by permission:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

//update role of user
export const updateUserRole = async (req, res) => {
  const { userId, newRole } = req.query;

  if (!userId || !newRole) {
    return res.status(400).json({ message: "Missing userId or newRole" });
  }

  try {
    const validRoles = ["admin", "manager", "user"];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = newRole;

    if (newRole === "admin") {
      user.permissions = ["all"];
    } else if (newRole === "manager") {
      user.permissions = ["manager"];
    } else {
      user.permissions = ["read"];
    }

    await user.save();

    const sanitizedData = user.toJSON();
    delete sanitizedData.password;

    res.status(200).json({
      message: "User role updated successfully",
      data: sanitizedData,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//update permissions of user
export const updatePermissions = async (req, res) => {
  const { userId } = req.query;
  const { permissions } = req.body;

  // Validate permissions input
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ message: "Invalid permissions format" });
  }

  // check valid permissions
  const invalid = permissions.filter((p) => !validPermissions.includes(p));
  if (invalid.length > 0) {
    return res.status(400).json({
      message: `Invalid permissions: ${invalid.join(", ")}`,
    });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's permissions
    user.permissions = permissions;
    await user.save();

    res.status(200).json({
      message: "Permissions updated successfully",
      userId: user.userId,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//delete user
export const deleteUserById = async (req, res) => {
  const { userId } = req.query;
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const imageName = user.avatar;

    await user.destroy();

    if (imageName && imageName.includes("cloudinary.com")) {
      const publicId = getCloudinaryPublicId(imageName);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//reset-password
export const resetPassword = async (req, res) => {
  const { userIds } = req.body;
  const { newPassword } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
    return res.status(400).json({
      message: "userIds must be a non-empty array and newPassword is required",
    });
  }

  try {
    const saltPassword = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltPassword);

    // Tìm và cập nhật tất cả user
    const updatedUserIds = [];
    for (const id of userIds) {
      const user = await User.findByPk(id);
      if (user) {
        user.password = hashedPassword;
        await user.save();
        updatedUserIds.push(user.userId);
      }
    }

    if (updatedUserIds.length === 0) {
      return res.status(404).json({ message: "users not found to update" });
    }

    res.status(200).json({
      message: "Passwords reset successfully",
    });
  } catch (error) {
    console.error("Error resetting passwords:", error);
    res.status(500).json({ message: "Server error" });
  }
};

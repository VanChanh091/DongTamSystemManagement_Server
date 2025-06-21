import Redis from "ioredis";
import User from "../../models/user/user.js";
import bcrypt from "bcrypt";
import { col, Op, where } from "sequelize";
import { getCloudinaryPublicId } from "../../utils/image/converToWebp.js";
import cloudinary from "../../configs/connectCloudinary.js";

const redisCache = new Redis();

//get all users
export const getAllUsers = async (req, res) => {
  try {
    const cacheKey = "users:all";

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Users from Redis");

      const parsedData = JSON.parse(cachedData);

      // Lọc bỏ admin
      const filteredData = parsedData.filter(
        (user) => user.role.toLowerCase() !== "admin"
      );

      return res.status(200).json({
        message: "Get all users from cache (excluding admin)",
        data: filteredData,
      });
    }

    const data = await User.findAll();

    const sanitizedData = data
      .map((user) => {
        const { password, ...sanitizedUser } = user.toJSON();
        return sanitizedUser;
      })
      .filter((user) => user.role.toLowerCase() !== "admin"); // Loại bỏ admin

    await redisCache.set(cacheKey, JSON.stringify(sanitizedData), "EX", "3600");

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
    const cacheKey = "users:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((item) =>
        item.fullName.toLowerCase().includes(nameLower)
      );

      return res.json({
        message: `get all cache user by fullName`,
        data: filteredData,
      });
    }

    const users = await User.findAll({
      where: where(fn("LOWER", col("fullName")), {
        [Op.like]: `%${nameLower}%`,
      }),
    });
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const sanitizedUsers = users.map((user) => {
      const { password, ...rest } = user.toJSON();
      return rest;
    });

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
    const cacheKey = "users:all";
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const filteredData = parsedData.filter((item) => item.phone === phone);

      return res.status(200).json({
        message: `Users found from cache by phone`,
        data: filteredData,
      });
    }

    const users = await User.findAll({
      where: { phone: phone },
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const sanitizedUsers = users.map((user) => {
      const { password, ...rest } = user.toJSON();
      return rest;
    });

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

  try {
    // Normalize permission: nếu chỉ truyền 1 chuỗi thì convert thành mảng
    if (!permission) {
      return res.status(400).json({ message: "Permission is required" });
    }

    if (!Array.isArray(permission)) {
      permission = [permission]; // chuyển về dạng mảng nếu chỉ có 1
    }

    const lowerPermissions = permission.map((p) => p.toLowerCase());

    const cacheKey = "users:all";
    const cachedData = await redisCache.get(cacheKey);

    // Lấy từ cache nếu có
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);

      const filteredData = parsedData.filter((user) => {
        const perms = Array.isArray(user.permissions)
          ? user.permissions
          : JSON.parse(user.permissions || "[]");

        return perms.some((perm) =>
          lowerPermissions.includes(perm.toLowerCase())
        );
      });

      return res.status(200).json({
        message: "Get users by permission from cache",
        data: filteredData,
      });
    }

    // Nếu không có cache → lấy từ DB rồi lọc
    const users = await User.findAll();

    const matchedUsers = users.filter((user) => {
      const perms = Array.isArray(user.permissions)
        ? user.permissions
        : JSON.parse(user.permissions || "[]");

      return perms.some((perm) =>
        lowerPermissions.includes(perm.toLowerCase())
      );
    });

    const sanitizedUsers = matchedUsers.map((user) => {
      const { password, ...rest } = user.toJSON();
      return rest;
    });

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
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = newRole;

    if (newRole.toLowerCase() === "admin") {
      user.permission = ["all"];
    } else if (newRole.toLowerCase() === "manager") {
      user.permission = ["manager"];
    } else {
      user.permission = [];
    }

    await user.save();

    await redisCache.del("users:all");

    res.status(200).json({
      message: "User role updated successfully",
      data: user,
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

  const validPermissions = [
    "all",
    "manager",
    "sale",
    "plan",
    "HR",
    "accountant",
    "marketing",
    "design",
    "production",
  ];

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

    // Clear cache
    await redisCache.del("users:all");

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
    await redisCache.del("users:all");

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
  const { userId } = req.query;
  const { newPassword } = req.body;

  if (!userId || !newPassword) {
    return res
      .status(400)
      .json({ message: "User ID and new password are required" });
  }
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const saltPassword = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltPassword);

    user.password = hashedPassword;
    await user.save();

    await redisCache.del("users:all");

    res.status(200).json({
      message: "Password reset successfully",
      userId: user.userId,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

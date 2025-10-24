import Redis from "ioredis";
import EmployeeBasicInfo from "../../../models/employee/employeeBasicInfo.js";
import EmployeeCompanyInfo from "../../../models/employee/employeeCompanyInfo.js";

const redisCache = new Redis();

//get all
export const getAllEmployees = async (req, res) => {
  const { page = 1, pageSize = 20, refresh = false } = req.query;

  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);

  const cacheKey = `employees:all:page:${currentPage}`;

  try {
    if (refresh === "true") {
      const keys = await redisCache.keys("employees:all:page:*");
      if (keys.length > 0) {
        await redisCache.del(...keys);
      }
    }

    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Employees from Redis");
      const parsed = JSON.parse(cachedData);
      return res.status(200).json({ ...parsed, message: "Get all employees from cache" });
    }

    const totalEmployees = await EmployeeBasicInfo.count();
    const totalPages = Math.ceil(totalEmployees / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;

    const data = await EmployeeBasicInfo.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      offset,
      limit: currentPageSize,
      //   order: [["dayReport", "DESC"]],
    });

    const responseData = {
      message: "get all employees successfully",
      data,
      totalEmployees,
      totalPages,
      currentPage,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("get all employees failed:", err);
    return res.status(500).json({ message: "Server error", error });
  }
};

//get by field
export const getEmployeesByField = async (req, res) => {
  try {
  } catch (error) {
    console.error(`Failed to get employees by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//add
export const createEmployee = async (req, res) => {
  try {
  } catch (error) {
    console.error("create employees failed:", err);
    return res.status(500).json({ message: "Server error", error });
  }
};

//update
export const updateEmployee = async (req, res) => {
  try {
  } catch (error) {
    console.error("update employees failed:", err);
    return res.status(500).json({ message: "Server error", error });
  }
};

//delete
export const deleteEmployee = async (req, res) => {
  try {
  } catch (error) {
    console.error("delete employees failed:", err);
    return res.status(500).json({ message: "Server error", error });
  }
};

//export excel
export const exportExcelEmployee = async (req, res) => {
  try {
  } catch (error) {
    console.error("export excel employee failed:", err);
    return res.status(500).json({ message: "Server error", error });
  }
};

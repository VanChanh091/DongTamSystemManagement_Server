import Redis from "ioredis";
import { Op } from "sequelize";
import EmployeeBasicInfo from "../../../models/employee/employeeBasicInfo.js";
import EmployeeCompanyInfo from "../../../models/employee/employeeCompanyInfo.js";
import { filterDataFromCache } from "../../../utils/helper/modelHelper/orderHelpers.js";
import { exportExcelResponse } from "../../../utils/helper/excelExporter.js";
import {
  employeeColumns,
  mappingEmployeeRow,
} from "../../../utils/mapping/employeeRowAndColumn.js";
import { CacheManager } from "../../../utils/helper/cacheManager.js";

const redisCache = new Redis();

//get all
export const getAllEmployees = async (req, res) => {
  const { page = 1, pageSize = 20, noPaging = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const noPagingMode = noPaging === "true";

  const { employee } = CacheManager.keys;
  const cacheKey = noPaging === "true" ? employee.all : employee.page(currentPage);

  try {
    const { isChanged } = await CacheManager.check(EmployeeBasicInfo, "employee");

    if (isChanged) {
      await CacheManager.clearEmployee();
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Employees from Redis");
        const parsed = JSON.parse(cachedData);
        return res.status(200).json({ ...parsed, message: "Get all employees from cache" });
      }
    }

    let data, totalPages;
    const totalEmployees = await EmployeeBasicInfo.count();

    if (noPagingMode) {
      totalPages = 1;
      data = await EmployeeBasicInfo.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: EmployeeCompanyInfo,
            as: "companyInfo",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      });
    } else {
      totalPages = Math.ceil(totalEmployees / currentPageSize);
      data = await EmployeeBasicInfo.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [
          {
            model: EmployeeCompanyInfo,
            as: "companyInfo",
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
        offset: (currentPage - 1) * currentPageSize,
        limit: currentPageSize,
      });
    }

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
  const { field, keyword, page, pageSize } = req.query;

  const fieldMap = {
    employeeId: (e) => e.employeeId,
    fullName: (e) => e.fullName,
    phoneNumber: (e) => e.phoneNumber,
    employeeCode: (e) => e.companyInfo?.employeeCode,
    department: (e) => e.companyInfo.department,
    status: (e) => e.companyInfo.status,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  const { employee } = CacheManager.keys;

  try {
    const result = await filterDataFromCache({
      model: EmployeeBasicInfo,
      cacheKey: employee.search,
      keyword: keyword,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
      totalKey: "totalEmployees",
      fetchFunction: async () => {
        return await EmployeeBasicInfo.findAll({
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: [
            {
              model: EmployeeCompanyInfo,
              as: "companyInfo",
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        });
      },
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get employees by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//add employee
export const createEmployee = async (req, res) => {
  const { companyInfo, ...basicInfo } = req.body;

  const transaction = await EmployeeBasicInfo.sequelize.transaction();

  try {
    const newBasicInfo = await EmployeeBasicInfo.create(basicInfo, { transaction });

    await EmployeeCompanyInfo.create(
      {
        employeeId: newBasicInfo.employeeId,
        ...companyInfo,
      },
      { transaction }
    );

    await transaction.commit();

    const createdEmployee = await EmployeeBasicInfo.findOne({
      where: { employeeId: newBasicInfo.employeeId },
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
    });

    return res.status(201).json({
      message: "create new employee successfully",
      data: createdEmployee,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("create employee failed:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//update
export const updateEmployee = async (req, res) => {
  const { employeeId } = req.query;
  const { companyInfo, ...basicInfo } = req.body;

  const transaction = await EmployeeBasicInfo.sequelize.transaction();
  try {
    const employee = await EmployeeBasicInfo.findByPk(employeeId, {
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
      transaction,
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (basicInfo) {
      await employee.update(basicInfo, { transaction });
    }

    if (companyInfo && employee.companyInfo) {
      await employee.companyInfo.update(companyInfo, { transaction });
    } else if (companyInfo) {
      await EmployeeCompanyInfo.create(
        { employeeId: employee.employeeId, ...companyInfo },
        { transaction }
      );
    }

    await transaction.commit();

    const updatedEmployee = await EmployeeBasicInfo.findOne({
      where: { employeeId: employeeId },
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
    });

    return res.status(200).json({
      message: "Cập nhật nhân viên thành công",
      data: updatedEmployee,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("update employees failed:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//delete
export const deleteEmployee = async (req, res) => {
  const { employeeId } = req.query;

  const transaction = await EmployeeBasicInfo.sequelize.transaction();

  try {
    const employee = await EmployeeBasicInfo.findByPk(employeeId, {
      include: [{ model: EmployeeCompanyInfo, as: "companyInfo" }],
      transaction,
    });
    if (!employee) {
      return res.json(404).status({ message: "Employee not found" });
    }

    if (employee.companyInfo) {
      await employee.companyInfo.destroy({ transaction });
    }

    // Xóa bản ghi chính
    await employee.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      message: "delete employee successfully",
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("delete employees failed:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//export excel
export const exportExcelEmployee = async (req, res) => {
  const { status, joinDate, all = false } = req.body;

  try {
    let whereCondition = {};
    if (all === "true") {
    } else if (status) {
      const normalizedStatus = status.toLowerCase().trim();
      whereCondition["$companyInfo.status$"] = normalizedStatus;
    } else if (joinDate) {
      const start = new Date(joinDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      whereCondition["$companyInfo.joinDate$"] = { [Op.between]: [start, end] };
    }

    const data = await EmployeeBasicInfo.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: EmployeeCompanyInfo,
          where: whereCondition,
          as: "companyInfo",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    await exportExcelResponse(res, {
      data: data,
      sheetName: "Danh sách nhân viên",
      fileName: "employee",
      columns: employeeColumns,
      rows: mappingEmployeeRow,
    });
  } catch (error) {
    console.error("export excel employee failed:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

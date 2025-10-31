import Redis from "ioredis";
import Customer from "../../../models/customer/customer.js";
import { Op, Sequelize } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId.js";
import { sequelize } from "../../../configs/connectDB.js";
import { exportExcelResponse } from "../../../utils/helper/excelExporter.js";
import { filterDataFromCache } from "../../../utils/helper/modelHelper/orderHelpers.js";
import {
  customerColumns,
  mappingCustomerRow,
} from "../../../utils/mapping/customerRowAndColumn.js";
import { checkLastChange } from "../../../utils/helper/checkLastChangeHelper.js";

const redisClient = new Redis();

//get all
export const getAllCustomer = async (req, res) => {
  const { page = 1, pageSize = 20, noPaging = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const noPagingMode = noPaging === "true";

  const cacheKey = noPaging === "true" ? "customers:all" : `customers:all:page:${currentPage}`;

  try {
    const { isChanged } = await checkLastChange(Customer, "customer:lastUpdated");

    console.log(`customer: ${isChanged}`);

    if (isChanged) {
      if (noPaging === "true") {
        await redisClient.del(cacheKey);
      } else {
        const keys = await redisClient.keys("customers:all:page:*");
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        redisClient.del("customers:search:all");
      }
    } else {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log("✅ Data Customer from Redis");
        const parsed = JSON.parse(cachedData);
        return res.status(200).json({ ...parsed, message: "Get all customers from cache" });
      }
    }

    let data, totalPages;
    const totalCustomers = await Customer.count();

    //noPagingMode to find customer for order
    if (noPagingMode) {
      totalPages = 1;
      data = await Customer.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
    } else {
      totalPages = Math.ceil(totalCustomers / currentPageSize);
      data = await Customer.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        offset: (currentPage - 1) * currentPageSize,
        limit: currentPageSize,
        order: [
          //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
          [Sequelize.literal(`CAST(RIGHT(\`Customer\`.\`customerId\`, 4) AS UNSIGNED)`), "ASC"],
        ],
      });
    }

    const responseData = {
      message: "get all customers successfully",
      data,
      totalCustomers,
      totalPages,
      currentPage: noPagingMode ? 1 : currentPage,
    };

    await redisClient.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    res.status(200).json(responseData);
  } catch (err) {
    console.error("get all customer failed:", err);
    res.status(500).json({ message: "get all customers failed", err });
  }
};

//get by field
export const getCustomerByField = async (req, res) => {
  const { field, keyword, page, pageSize } = req.query;

  const fieldMap = {
    customerId: (customer) => customer?.customerId,
    customerName: (customer) => customer?.customerName,
    cskh: (customer) => customer?.cskh,
    phone: (customer) => customer?.phone,
  };

  if (!fieldMap[field]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  try {
    const result = await filterDataFromCache({
      model: Customer,
      cacheKey: "customers:search:all",
      keyword: keyword,
      getFieldValue: fieldMap[field],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
      totalKey: "totalCustomers",
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get customers by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//create customer
export const createCustomer = async (req, res) => {
  const { prefix = "CUSTOM", ...customerData } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const customers = await Customer.findAll({
      attributes: ["customerId"],
      transaction,
    });

    const allCustomerIds = customers.map((c) => c.customerId);
    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "").toUpperCase();
    const newCustomerId = generateNextId(allCustomerIds, sanitizedPrefix, 4);

    const newCustomer = await Customer.create(
      {
        customerId: newCustomerId,
        ...customerData,
      },
      { transaction }
    );

    await transaction.commit();

    // const keys = await redisClient.keys("customers:*");
    // if (keys.length > 0) {
    //   await redisClient.del(...keys);
    // }

    res.status(201).json({ message: "Customer created successfully", data: newCustomer });
  } catch (err) {
    await transaction.rollback();
    console.error("Update customer failed:", err);
    res.status(500).json({ message: "Failed to create customer", err });
  }
};

// update
export const updateCustomer = async (req, res) => {
  const { customerId } = req.query;
  const { ...customerData } = req.body;

  try {
    const customer = await Customer.findOne({ where: { customerId: customerId } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update(customerData);

    // const keys = await redisClient.keys("customers:*");
    // if (keys.length > 0) {
    //   await redisClient.del(...keys);
    // }

    res.status(201).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (err) {
    console.error("Update customer failed:", err);
    res.status(500).json({
      message: "Update customer failed",
      err,
    });
  }
};

// delete
export const deleteCustomer = async (req, res) => {
  const { customerId } = req.query;

  try {
    const deletedCustomer = await Customer.destroy({
      where: { customerId: customerId },
    });

    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const keys = await redisClient.keys("customers:*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer failed:", err);
    res.status(500).json({ message: "Delete customer failed", err });
  }
};

//export excel
export const exportExcelCustomer = async (req, res) => {
  const { fromDate, toDate, all = false } = req.body;

  try {
    let whereCondition = {};

    if (all === "true") {
      // xuất toàn bộ -> để whereCondition = {}
    } else if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      whereCondition.timePayment = { [Op.between]: [start, end] };
    }

    const data = await Customer.findAll({
      where: whereCondition,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [
        //lấy 4 số cuối -> ép chuỗi thành số để so sánh -> sort
        [Sequelize.literal(`CAST(RIGHT(\`Customer\`.\`customerId\`, 4) AS UNSIGNED)`), "ASC"],
      ],
    });

    await exportExcelResponse(res, {
      data: data,
      sheetName: "Danh sách khách hàng",
      fileName: "customer",
      columns: customerColumns,
      rows: mappingCustomerRow,
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};

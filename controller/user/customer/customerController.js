import Redis from "ioredis";
import Customer from "../../../models/customer/customer.js";
import { Op } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId.js";
import { sequelize } from "../../../configs/connectDB.js";
import { filterCustomersFromCache } from "../../../utils/helper/orderHelpers.js";

const redisClient = new Redis();

// get all
export const getAllCustomer = async (req, res) => {
  const { page = 1, pageSize = 20, refresh = false, noPaging = false } = req.query;
  const currentPage = Number(page);
  const currentPageSize = Number(pageSize);
  const noPagingMode = noPaging === "true";

  const cacheKey = noPaging === "true" ? "customers:all" : `customers:all:page:${currentPage}`;

  try {
    if (refresh === "true") {
      if (noPaging === "true") {
        await redisClient.del(cacheKey);
      } else {
        const keys = await redisClient.keys("customers:all:page:*");
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
    }

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Customer from Redis");
      const parsed = JSON.parse(cachedData);
      return res.status(200).json({ ...parsed, message: "Get all customers from cache" });
    }

    let data, totalPages;
    const totalCustomers = await Customer.count();

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

// get by id
export const getById = async (req, res) => {
  const { customerId, page, pageSize } = req.query;

  try {
    const result = await filterCustomersFromCache({
      keyword: customerId,
      getFieldValue: (customer) => customer?.customerId,
      page,
      pageSize,
      message: "get all customerName from cache",
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to get customer by customerId:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//get by name
export const getByCustomerName = async (req, res) => {
  const { name, page, pageSize } = req.query;
  try {
    const result = await filterCustomersFromCache({
      keyword: name,
      getFieldValue: (customer) => customer?.customerName,
      page,
      pageSize,
      message: "get all customerName from cache",
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to get customer by name:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//get by cskh
export const getByCSKH = async (req, res) => {
  const { cskh, page, pageSize } = req.query;
  try {
    const result = await filterCustomersFromCache({
      keyword: cskh,
      getFieldValue: (customer) => customer?.cskh,
      page,
      pageSize,
      message: "get all customerName from cache",
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to get customer by cskh:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//get by sdt
export const getBySDT = async (req, res) => {
  const { phone, page, pageSize } = req.query;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;
  const targetPhone = phone?.trim();
  const cacheKey = "customers:search:all";

  try {
    let allCustomers;
    let fromCache = true;

    let cached = await redisClient.get(cacheKey);

    if (!cached) {
      fromCache = false;

      // Query đúng SDT
      const customersFromDB = await Customer.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        where: { phone: { [Op.eq]: phone } },
      });

      // Cache toàn bộ customers để lần sau filter
      const fullCustomers = await Customer.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      await redisClient.set(cacheKey, JSON.stringify(fullCustomers), "EX", 600);

      allCustomers = customersFromDB;
    } else {
      allCustomers = JSON.parse(cached).filter(
        (customer) => customer?.phone?.trim() === targetPhone
      );
    }

    const totalCustomers = allCustomers.length;
    const totalPages = Math.ceil(totalCustomers / currentPageSize);
    const offset = (currentPage - 1) * currentPageSize;
    const paginatedCustomers = allCustomers.slice(offset, offset + currentPageSize);

    return res.status(200).json({
      message: fromCache
        ? "Get customer by SDT from filtered cache"
        : "Get customer by SDT from DB",
      data: paginatedCustomers,
      totalCustomers,
      totalPages,
      currentPage,
    });
  } catch (err) {
    console.error("Failed to get customer by phone:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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
    await redisClient.del("customers:all");
    await redisClient.del("customers:search:all");

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

    const keys = await redisClient.keys("customers:all:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    await redisClient.del("customers:search:all");

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

    const keys = await redisClient.keys("customers:all:page:*");
    if (keys.length > 0) {
      keyword;
      await redisClient.del(keys);
    }
    await redisClient.del("customers:search:all");

    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer failed:", err);
    res.status(500).json({ message: "Delete customer failed", err });
  }
};

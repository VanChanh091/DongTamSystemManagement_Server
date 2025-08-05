import Redis from "ioredis";
import Customer from "../../../models/customer/customer.js";
import { Op, fn, col, where } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId.js";
import { sequelize } from "../../../configs/connectDB.js";

const redisClient = new Redis();

const cacheRedis = async (colData, params) => {
  const cacheKey = "customers:all";
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    const product = parsedData.filter((item) =>
      item[colData]?.toLowerCase().includes(params.toLowerCase())
    );

    if (product.length > 0) {
      return product;
    }
  }

  return null;
};

// get all
export const getAllCustomer = async (req, res) => {
  const { refresh = false } = req.query;
  try {
    const cacheKey = "customers:all";

    if (refresh == "true") {
      await redisClient.del(cacheKey);
    }

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Customer from Redis");
      return res.status(200).json({
        message: "Get all customers from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Customer.findAll();

    await redisClient.set(cacheKey, JSON.stringify(data), "EX", 3600);

    res.status(200).json({ message: "get all customers successfully", data });
  } catch (err) {
    console.error("get all customer failed:", err);
    res.status(500).json({ message: "get all customers failed", err });
  }
};

// get by id
export const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const cachedResult = await cacheRedis("customerId", id);

    if (cachedResult) {
      console.log("✅ Get customer from cache");
      return res.status(200).json({
        message: "Get customer from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const customer = await Customer.findAll({
      where: where(fn("LOWER", col("customerId")), {
        [Op.like]: `%${id.toLowerCase()}%`,
      }),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Get customer from DB",
      data: customer,
    });
  } catch (err) {
    console.error("Failed to get customer by customerId:", err);
    res.status(500).json({
      message: "Failed to get customer by customerId",
      err,
    });
  }
};

//get by name
export const getByCustomerName = async (req, res) => {
  const { name } = req.params;
  try {
    const cachedResult = await cacheRedis("customerName", name);

    if (cachedResult) {
      console.log("✅ Get customer from cache");
      return res.status(200).json({
        message: "Get customer from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const customer = await Customer.findAll({
      where: where(fn("LOWER", col("customerName")), {
        [Op.like]: `%${name.toLowerCase()}%`,
      }),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ customer });
  } catch (err) {
    console.error("Failed to get customer by name:", err);
    res.status(500).json({
      message: "Failed to get customers by name",
      err,
    });
  }
};

//get by cskh
export const getByCSKH = async (req, res) => {
  const { cskh } = req.params;
  try {
    const cachedResult = await cacheRedis("cskh", cskh);

    if (cachedResult) {
      console.log("✅ Get customer from cache");
      return res.status(200).json({
        message: "Get customer from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const customer = await Customer.findAll({
      where: where(fn("LOWER", col("cskh")), {
        [Op.like]: `%${cskh.toLowerCase()}%`,
      }),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ customer });
  } catch (err) {
    console.error("Failed to get customer by cskh:", err);
    res.status(500).json({
      message: "Failed to get customers by cskh",
      err,
    });
  }
};

//get by sdt
export const getBySDT = async (req, res) => {
  const { sdt } = req.params;
  try {
    const cachedResult = await cacheRedis("phone", sdt);

    if (cachedResult) {
      console.log("✅ Get customer from cache");
      return res.status(200).json({
        message: "Get customer from cache",
        data: cachedResult,
      });
    }

    // Nếu không có cache thì lấy từ DB
    const customer = await Customer.findOne({
      where: {
        phone: {
          [Op.eq]: sdt,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ customer });
  } catch (err) {
    console.error("Failed to get customer by phone:", err);
    res.status(500).json({
      message: "Failed to get customers by phone",
      err,
    });
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

    res
      .status(201)
      .json({ message: "Customer created successfully", data: newCustomer });
  } catch (err) {
    await transaction.rollback();
    console.error("Update customer failed:", err);
    res.status(500).json({ message: "Failed to create customer", err });
  }
};

// update
export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { ...customerData } = req.body;
  try {
    const customer = await Customer.findOne({ where: { customerId: id } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update(customerData);

    await redisClient.del("customers:all");

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
  try {
    const { id } = req.params;
    const deletedCustomer = await Customer.destroy({
      where: { customerId: id },
    });

    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await redisClient.del("customers:all");

    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer failed:", err);
    res.status(500).json({ message: "Delete customer failed", err });
  }
};

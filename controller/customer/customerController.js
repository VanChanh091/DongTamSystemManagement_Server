import Redis from "ioredis";
import Customer from "../../models/customer/customer.js";
import { Op, fn, col, where } from "sequelize";

const redisClient = new Redis();

// get all
export const getAllCustomer = async (req, res) => {
  try {
    const cacheKey = "customers:all";
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("✅ Data Customer from Redis");
      return res.status(200).json({
        message: "Get all customers from cache",
        data: JSON.parse(cachedData),
      });
    }

    const data = await Customer.findAll();

    //save in 2h
    await redisClient.set(cacheKey, JSON.stringify(data), "EX", 3600);
    res.status(201).json({ message: "get all customers successfully", data });
  } catch (e) {
    res.status(404).json({ message: "get all customers failed" });
  }
};

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

    if (!customer || customer.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Get customer from DB",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customer",
      error: error.message,
    });
  }
};

// get by name
export const getByCustomerName = async (req, res) => {
  const { name } = req.query;

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

    if (!customer || customer.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Get customer from DB",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by name",
      error: error.message,
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by cskh",
      error: error.message,
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by phone",
      error: error.message,
    });
  }
};

// create
export const createCustomer = async (req, res) => {
  try {
    const { prefix = "CUSTOM", ...customerData } = req.body;

    const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");

    // Generate customerId manually
    const lastCustomer = await Customer.findOne({
      where: {
        customerId: {
          [Op.like]: `${sanitizedPrefix}%`,
        },
      },
      order: [["customerId", "DESC"]],
    });

    let newNumber = 1;
    if (lastCustomer && lastCustomer.customerId) {
      const lastNumber = parseInt(
        lastCustomer.customerId.slice(sanitizedPrefix.length),
        10
      );
      if (!isNaN(lastNumber)) {
        newNumber = lastNumber + 1;
      }
    }

    const formattedNumber = String(newNumber).padStart(4, "0");
    const newCustomerId = `${sanitizedPrefix}${formattedNumber}`;

    const newCustomer = await Customer.create({
      customerId: newCustomerId,
      ...customerData,
    });

    await redisClient.del("customers:all");

    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(404).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
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
      return res.status(404).json({ message: "Customer deleted failed" });
    }

    await redisClient.del("customers:all");

    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

import Redis from "ioredis";
import Customer from "../models/customer/customer.js";
import { Op, fn, col, where } from "sequelize";

const redisClient = new Redis();

// get all
export const getAllCustomer = async (req, res) => {
  try {
    const data = await Customer.findAll();
    res.status(201).json({ message: "get all customers successfully", data });
  } catch (e) {
    res.status(404).json({ message: "get all customers failed" });
  }
};

// get by id
export const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await Customer.findAll({
      where: where(fn("LOWER", col("customerId")), {
        [Op.like]: `%${id.toLowerCase()}%`,
      }),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ customer });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customer",
      error: error.message,
    });
  }
};

// get by name
export const getByName = async (req, res) => {
  const { name } = req.params;

  try {
    const customer = await Customer.findAll({
      where: where(fn("LOWER", col("customerName")), {
        [Op.like]: `%${name.toLowerCase()}%`,
      }),
    });

    res.status(200).json({ customer });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get customers by name",
      error: error.message,
    });
  }
};

// create
export const createCustomer = async (req, res) => {
  try {
    const { prefix = "CUSTOM", ...customerData } = req.body;

    // Generate customerId manually
    const lastCustomer = await Customer.findOne({
      where: {
        customerId: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["customerId", "DESC"]],
    });

    let newNumber = 1;
    if (lastCustomer && lastCustomer.customerId) {
      const lastNumber = parseInt(
        lastCustomer.customerId.slice(prefix.length),
        10
      );
      if (!isNaN(lastNumber)) {
        newNumber = lastNumber + 1;
      }
    }

    const formattedNumber = String(newNumber).padStart(3, "0");
    const customerId = `${prefix}${formattedNumber}`;

    const newCustomer = await Customer.create({
      customerId,
      ...customerData,
    });

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

    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// renew
// export const renewCustomer = async (req, res) => {};

import { Customer } from "../../../models/customer/customer";
import { Op, Sequelize } from "sequelize";
import { generateNextId } from "../../../utils/helper/generateNextId";
import { exportExcelResponse } from "../../../utils/helper/excelExporter";
import { filterDataFromCache } from "../../../utils/helper/modelHelper/orderHelpers";
import { Order } from "../../../models/order/order";
import { customerColumns, mappingCustomerRow } from "../../../utils/mapping/customerRowAndColumn";
import { CacheManager } from "../../../utils/helper/cacheManager";
import { Request, Response } from "express";
import { customerService } from "../../../service/customerService";
import dotenv from "dotenv";
dotenv.config();

const devEnvironment = process.env.NODE_ENV !== "production";

//get all
export const getAllCustomer = async (req: Request, res: Response) => {
  const {
    page = 1,
    pageSize = 20,
    noPaging = false,
  } = req.query as { page?: string; pageSize?: string; noPaging?: string | boolean };

  try {
    const response = await customerService.getAllCustomers({
      page: Number(page),
      pageSize: Number(pageSize),
      noPaging,
      devEnvironment,
    });

    res.status(200).json({
      ...response,
      message: response.fromCache
        ? "Get all customers from cache"
        : "Get all customers successfully",
    });
  } catch (err: any) {
    console.error("get all customer failed:", err.message);
    res.status(500).json({ message: "get all customers failed", err });
  }
};

//get by field
export const getCustomerByField = async (req: Request, res: Response) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  const fieldMap = {
    customerId: (customer: Customer) => customer.customerId,
    customerName: (customer: Customer) => customer.customerName,
    cskh: (customer: Customer) => customer.cskh,
    phone: (customer: Customer) => customer.phone,
  } as const;

  const key = field as keyof typeof fieldMap;

  if (!key || !fieldMap[key]) {
    return res.status(400).json({ message: "Invalid field parameter" });
  }

  const { customer } = CacheManager.keys;

  try {
    const result = await filterDataFromCache({
      model: Customer,
      cacheKey: customer.search,
      keyword: keyword,
      getFieldValue: fieldMap[key],
      page,
      pageSize,
      message: `get all by ${field} from filtered cache`,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get customers by ${field}:`, error);
    return res.status(500).json({ message: "Server error", error });
  }
};

//get customerId in orders //unfinished
export const checkCustomerInOrders = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };

  try {
    const orderCount = await Order.count({ where: { customerId: customerId } });

    res.status(200).json({ hasOrders: orderCount > 0, orderCount });
  } catch (error) {
    console.error("Check customer in orders failed:", error);
    res.status(500).json({ message: "Check customer in orders failed", error });
  }
};

//create customer
export const createCustomer = async (req: Request, res: Response) => {
  const { prefix = "CUSTOM", ...customerData } = req.body;
  const transaction = await Customer.sequelize?.transaction();

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

    await transaction?.commit();

    res.status(201).json({ message: "Customer created successfully", data: newCustomer });
  } catch (err) {
    await transaction?.rollback();
    console.error("Update customer failed:", err);
    res.status(500).json({ message: "Failed to create customer", err });
  }
};

// update
export const updateCustomer = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };
  const { ...customerData } = req.body;

  const transaction = await Customer.sequelize?.transaction();

  try {
    const customer = await Customer.findOne({ where: { customerId: customerId }, transaction });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update(customerData, { transaction });

    await transaction?.commit();

    res.status(201).json({ message: "Customer updated successfully", customer });
  } catch (err) {
    await transaction?.rollback();
    console.error("Update customer failed:", err);
    res.status(500).json({ message: "Update customer failed", err });
  }
};

// delete
export const deleteCustomer = async (req: Request, res: Response) => {
  const { customerId } = req.query as { customerId: string };

  const transaction = await Customer.sequelize?.transaction();

  try {
    const deletedCustomer = await Customer.destroy({
      where: { customerId: customerId },
      transaction,
    });

    if (!deletedCustomer) {
      await transaction?.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    await transaction?.commit();
    res.status(201).json({ message: "Customer deleted successfully" });
  } catch (err) {
    await transaction?.rollback();
    console.error("Delete customer failed:", err);
    res.status(500).json({ message: "Delete customer failed", err });
  }
};

//export excel
export const exportExcelCustomer = async (req: Request, res: Response) => {
  const { fromDate, toDate, all = false } = req.body;

  try {
    let whereCondition: any = {};

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
        [Sequelize.literal("CAST(RIGHT(`Customer`.`customerId`, 4) AS UNSIGNED)"), "ASC"],
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

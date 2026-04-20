import { Op, Transaction } from "sequelize";
import { Customer } from "../../../models/customer/customer";
import { Product } from "../../../models/product/product";
import { Order } from "../../../models/order/order";
import { orderRepository } from "../../../repository/orderRepository";

export const validateCustomerAndProduct = async (customerId: string, productId: string) => {
  const customer = await Customer.findOne({ where: { customerId } });
  if (!customer) {
    return { success: false, message: "Customer not found" };
  }

  const product = await Product.findOne({ where: { productId } });
  if (!product) {
    return { success: false, message: "Product not found" };
  }

  return { success: true };
};

export const generateOrderId = async (prefix: string) => {
  const sanitizedPrefix = prefix.trim().replace(/\s+/g, "");

  const lastOrder = await Order.findOne({
    where: { orderId: { [Op.like]: `${sanitizedPrefix}%` } },
    order: [["orderId", "DESC"]],
  });

  let number = 1;
  let existingCustomerId: string | null = null;

  if (lastOrder && lastOrder.orderId) {
    existingCustomerId = lastOrder.customerId;
    const lastNumber = parseInt(lastOrder.orderId.slice(sanitizedPrefix.length), 10);
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }

  const formattedNumber = number.toString().padStart(3, "0");
  return {
    newOrderId: `${sanitizedPrefix}${formattedNumber}`,
    existingCustomerId,
  };
};

const calculateFlutePaper = (fields: any) => {
  const { day, matE, matB, matC, matE2, songE, songB, songC, songE2 } = fields;

  // 1. Đếm tổng số lớp có dữ liệu
  const allFields = [day, matE, matB, matC, matE2, songE, songB, songC, songE2];
  const layersCount = allFields.filter((f) => f && f.trim().length > 0).length;

  // 2. Thu thập các loại sóng hiện có
  const flutesRaw = [];
  if (songE?.trim()) flutesRaw.push("E");
  if (songB?.trim()) flutesRaw.push("B");
  if (songC?.trim()) flutesRaw.push("C");
  if (songE2?.trim()) flutesRaw.push("E");

  // 3. Sắp xếp sóng theo thứ tự ưu tiên: E -> B -> C
  const fluteOrder = ["E", "B", "C"];

  const sortedFlutes: any[] = [];
  for (const f of fluteOrder) {
    flutesRaw.forEach((raw) => {
      if (raw === f) sortedFlutes.push(f);
    });
  }

  // Kết quả dạng: "5EB" hoặc "3E"
  return `${layersCount}${sortedFlutes.join("")}`;
};

export const calculateOrderMetrics = async (data: any) => {
  const qty = parseInt(data.quantityCustomer) || 0;
  const length = parseFloat(data.lengthPaperCustomer) || 0;
  const size = parseFloat(data.paperSizeCustomer) || 0;
  const price = parseFloat(data.price) || 0;
  const pricePaper = parseFloat(data.pricePaper) || 0;
  const vat = parseInt(data.vat) || 0;

  // flute
  const flute = calculateFlutePaper(data);

  // acreage
  const acreage = Math.round((length * size * qty) / 10000);

  // price paper
  let totalPricePaper = 0;
  if (data.dvt === "M2" || data.dvt === "Tấm") {
    totalPricePaper = Math.round((length * size * price) / 10000);
  } else if (data.dvt === "Tấm Bao Khổ") {
    totalPricePaper = pricePaper;
  } else {
    totalPricePaper = Math.round(price);
  }

  // total price & vat
  const totalPrice = Math.round(qty * totalPricePaper);
  const totalPriceVAT = Math.round(totalPrice * (1 + vat / 100));

  const volume = await calculateVolume({
    flute,
    lengthCustomer: length,
    sizeCustomer: size,
    quantity: qty,
  });

  const responseData = {
    flute,
    acreage,
    pricePaper: totalPricePaper,
    totalPrice,
    totalPriceVAT,
    volume,
  };

  return responseData;
};

export const calculateVolume = async ({
  flute,
  lengthCustomer,
  sizeCustomer,
  quantity,
}: {
  flute: string;
  lengthCustomer: number;
  sizeCustomer: number;
  quantity: number;
}) => {
  const ratioData = await orderRepository.findOneFluteRatio(flute);
  const ratio = ratioData?.ratio ?? 1;

  const baseVolume = (lengthCustomer * sizeCustomer) / 10000;
  const totalVolume = baseVolume * quantity * ratio * 1.3;
  const volumeRaw = Number(Math.round(totalVolume * 100) / 100); //làm tròn, lấy 2 số sau dấu phẩy
  return volumeRaw;
};

export const createDataTable = async ({
  model,
  data,
  transaction,
}: {
  model: any;
  data: Record<string, any>;
  transaction?: Transaction;
}) => {
  try {
    if (data) {
      await model.create(data, { transaction });
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
    throw error;
  }
};

export const updateChildTable = async ({
  model,
  data,
  where,
  transaction,
}: {
  model: any;
  data: Record<string, any>;
  where: Record<string, any>;
  transaction?: Transaction;
}) => {
  try {
    if (!data || Object.keys(data).length === 0) return;

    const existingRecord = await model.findOne({ where, transaction });

    if (existingRecord) {
      return await model.update(data, { where, transaction });
    } else {
      return await model.create({ ...where, ...data }, { transaction });
    }
  } catch (error) {
    console.error(`Create table ${model} error:`, error);
  }
};

export const cachedStatus = async (
  parsed: any,
  prop1: string,
  prop2: string,
  userId: number | string,
  role: string,
) => {
  // Nếu redis lưu thẳng mảng thì parsed là array
  // Nếu redis lưu object {data: [...]}, thì lấy parsed.data
  const ordersArray = Array.isArray(parsed) ? parsed : parsed?.data;

  if (!Array.isArray(ordersArray)) {
    return null;
  }

  let data;
  if (role === "admin" || role === "manager") {
    data = ordersArray.filter((order) => [prop1, prop2].includes(order.status));
  } else {
    data = ordersArray.filter(
      (order) => [prop1, prop2].includes(order.status) && order.userId === userId,
    );
  }

  return data.length > 0 ? data : null;
};

export function formatterStructureOrder(cell: Record<string, any>) {
  const parts = [
    cell.dayReplace || cell.day,
    cell.songEReplace || cell.songE,
    cell.matEReplace || cell.matE,
    cell.songBReplace || cell.songB,
    cell.matBReplace || cell.matB,
    cell.songCReplace || cell.songC,
    cell.matCReplace || cell.matC,
    cell.songE2Replace || cell.songE2,
  ];

  const formattedParts = [];
  for (const part of parts) {
    if (part && String(part).trim() !== "") {
      formattedParts.push(part);
    }
  }

  return formattedParts.join("/");
}

export const getOrderByStatus = async ({
  statusList,
  userId,
  role,
  ownOnly,
}: {
  statusList: string[];
  userId: number;
  role: string;
  ownOnly?: string;
}) => {
  let whereCondition: any = { status: { [Op.in]: statusList } };

  if ((role !== "admin" && role !== "manager") || ownOnly === "true") {
    whereCondition.userId = userId;
  }

  const queryOptions = orderRepository.buildQueryOptions(whereCondition);

  const rows = await Order.findAll(queryOptions);
  return { data: rows };
};

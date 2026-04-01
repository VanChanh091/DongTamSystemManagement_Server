import { NextFunction, Request, Response } from "express";
import {
  parseCustomerData,
  parseOrderData,
  parseProductData,
} from "../../service/processingData/processingData";
import { Customer } from "../../models/customer/customer";
import { Product } from "../../models/product/product";
import { Order } from "../../models/order/order";
import { runInTransaction } from "../../utils/helper/transactionHelper";
import { Inventory } from "../../models/warehouse/inventory";
import { CustomerPayment } from "../../models/customer/customerPayment";
import { User } from "../../models/user/user";
import { AppError } from "../../utils/appError";

const getDebugInfo = (str: string) => {
  const s = str || "";
  return {
    text: `${s}`,
    len: s.length,
    codes: s
      .split("")
      .map((c) => c.charCodeAt(0))
      .join(","),
  };
};

// Helper để tính toán sort value
const calculateOrderSortValue = (orderId: string) => {
  if (!orderId) return 0;
  const parts = orderId.split("/");
  if (parts.length >= 4) {
    const po = parseInt(parts[0], 10) || 0;
    const month = parseInt(parts[1], 10) || 0;
    const year = parseInt(parts[2], 10) || 0;
    const suffix = parseInt(parts[3].replace(/\D/g, ""), 10) || 0;
    return year * 100000000000 + month * 1000000000 + po * 10000 + suffix;
  }
  return 0;
};

export const bulkImportOrdersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ordersFromExcel = parseOrderData(req.file!.buffer);

    const [customers, products, users] = await Promise.all([
      Customer.findAll({ attributes: ["customerId", "customerName", "companyName", "cskh"] }),
      Product.findAll({ attributes: ["productId", "productName"] }),
      User.findAll({ attributes: ["userId", "fullName"] }), // Lấy danh sách user để map
    ]);

    const validOrders: any[] = [];
    const validInventories: any[] = [];
    const logs = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of ordersFromExcel) {
      const rawExcelCust = (item._rawCustomerName || "").toString();
      const normExcelCust = rawExcelCust.normalize("NFC").toLowerCase().trim();

      const rawExcelProd = (item._rawProductName || "").toString();
      const normExcelProd = rawExcelProd.normalize("NFC").toLowerCase().trim();

      // "3B" -> tách ra để so sánh linh hoạt
      const excelFlute = (item.flute || "").toString().toLowerCase().trim();

      // console.log(`\n--- KIỂM TRA DÒNG: ${item.orderId || "N/A"} ---`);
      // console.log(`Excel Customer:`, getDebugInfo(rawExcelCust));
      // console.log(`Excel Product:`, getDebugInfo(rawExcelProd));

      // 2. Tìm Customer
      const customer = customers.find(
        (c) => (c.customerName || "").normalize("NFC").toLowerCase().trim() === normExcelCust,
      );

      // 3. Tìm Product (Tìm kiếm tương đối + Lọc theo Flute)
      const filteredProducts = products.filter((p) => {
        const dbProdName = (p.productName || "").normalize("NFC").toLowerCase().trim();

        // Điều kiện 1: Tên DB chứa mã SP (ví dụ: "2 lớp 1N/1X" chứa "1n/1x")
        const isMatchName = dbProdName.includes(normExcelProd);

        // Điều kiện 2: Xử lý Flute (Ví dụ: "3B" phải tìm thấy "3" và "B" trong DB)
        let isMatchFlute = true;
        if (excelFlute) {
          const fluteLetter = excelFlute.replace(/[0-9]/g, ""); // Lấy chữ (B, E, C)
          const fluteNumber = excelFlute.replace(/\D/g, ""); // Lấy số (3, 5, 2)

          // DB phải chứa chữ cái sóng VÀ số lớp (không cần đứng sát nhau)
          const hasLetter = fluteLetter ? dbProdName.includes(fluteLetter) : true;
          const hasNumber = fluteNumber ? dbProdName.includes(fluteNumber) : true;

          isMatchFlute = hasLetter && hasNumber;
        }

        return isMatchName && isMatchFlute;
      });

      // Lấy record đầu tiên nếu tìm thấy nhiều cái sau khi lọc
      const product = filteredProducts.length > 0 ? filteredProducts[0] : null;

      // 4. Kiểm tra và tạo Key
      if (!customer || !product) {
        logs.failed++;
        let errorMsg = `Dòng ${item.orderId || "N/A"}:`;

        if (!customer) errorMsg += ` Không tìm thấy KH: ${item._rawCustomerName}`;
        if (!product)
          errorMsg += ` Không tìm thấy SP: ${item._rawProductName} (Flute: ${item.flute || "N/A"})`;

        logs.errors.push(errorMsg);
        continue;
      }

      //show err
      if (!customer || !product) {
        logs.failed++;

        let errorMsg = `Đơn ${item.orderId || "không ID"}:`;
        if (!customer) errorMsg += ` Không tìm thấy KH (${item._rawCustomerName}).`;
        if (!product) errorMsg += ` Không tìm thấy SP (${item._rawProductName}).`;

        logs.errors.push(errorMsg);
        continue;
      }

      // --- LOGIC MỚI: TÌM USERID DỰA TRÊN CSKH ---
      let targetUserId = null;
      const rawCskh = (customer.cskh || "").toString().toLowerCase().trim();

      const cleanString = (str: string) =>
        (str || "").toString().trim().toLowerCase().normalize("NFC");

      const specialCskhMap: Record<string, string> = {
        "công ty": "huỳnh thị thuận",
        nhân: "trương dương mỹ chi",
      };

      if (rawCskh) {
        const normCskh = cleanString(rawCskh);
        const searchName = normCskh.replace(/^(ms|mr|mrs|anh|chị|em|dì|cô|chú)\s+/g, "").trim();

        let userMatched = null;

        // Trường hợp từ khóa đặc biệt: "công ty" hoặc "nhân"
        if (specialCskhMap[searchName]) {
          const fullNameToFind = specialCskhMap[searchName];
          userMatched = users.find((u) => cleanString(u.fullName).includes(fullNameToFind));
        } else {
          userMatched = users.find((u) => cleanString(u.fullName).includes(searchName));
        }

        if (!userMatched) {
          throw AppError.BadRequest(
            `Không tìm thấy nhân viên phù hợp trong hệ thống cho CSKH: "${rawCskh}"`,
            "USER_CSKH_NOT_FOUND",
          );
        }

        targetUserId = userMatched.userId;
      }

      // Nếu không tìm thấy User phù hợp, có thể fallback về userId của người đang login
      // hoặc báo lỗi tùy bạn. Ở đây tôi để mặc định là userId người login nếu không tìm thấy.
      const finalUserId = targetUserId || req.user.userId;

      validOrders.push({
        ...item,
        customerId: customer.customerId,
        productId: product.productId,
        userId: finalUserId,
        status: item.status,
        statusPriority: item.status === "planning" ? 4 : 2,
        orderSortValue: calculateOrderSortValue(item.orderId),
      });

      validInventories.push({
        ...item.inventoryFields,
        orderId: item.orderId,
      });

      // console.log(validOrders);

      logs.success++;
    }

    if (validOrders.length > 0) {
      await runInTransaction(async (transaction) => {
        await Order.bulkCreate(validOrders, { transaction });
        await Inventory.bulkCreate(validInventories, { transaction });
      });
    }

    res.json({
      success: true,
      summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
      errors: logs.errors,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customersFromExcel = parseCustomerData(req.file!.buffer);

    const validCustomers: any[] = [];
    const validPayments: any[] = [];
    const logs = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of customersFromExcel) {
      validCustomers.push({ ...item });
      validPayments.push({ ...item.payments, customerId: item.customerId });

      logs.success++;
    }

    if (validCustomers.length > 0) {
      await runInTransaction(async (transaction) => {
        await Customer.bulkCreate(validCustomers, { transaction });
        await CustomerPayment.bulkCreate(validPayments, { transaction });
      });
    }

    res.json({
      success: true,
      summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
      errors: logs.errors,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productsFromExcel = parseProductData(req.file!.buffer);

    const validProducts: any[] = [];
    const logs = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of productsFromExcel) {
      validProducts.push({ ...item });
      logs.success++;
    }

    if (validProducts.length > 0) {
      await runInTransaction(async (transaction) => {
        await Product.bulkCreate(validProducts, { transaction });
      });
    }

    res.json({
      success: true,
      summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
      errors: logs.errors,
    });
  } catch (error) {
    next(error);
  }
};

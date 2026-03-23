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

export const bulkImportOrdersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.user;
    const ordersFromExcel = parseOrderData(req.file!.buffer);

    const [customers, products] = await Promise.all([
      Customer.findAll({ attributes: ["customerId", "customerName", "cskh"] }),
      Product.findAll({ attributes: ["productId", "productName"] }),
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

      validOrders.push({
        ...item,
        customerId: customer.customerId,
        productId: product.productId,
        userId: userId,
        status: "planning",
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

    const validOrders: any[] = [];
    const logs = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of customersFromExcel) {
      validOrders.push({ ...item });
      logs.success++;
    }

    if (validOrders.length > 0) {
      await runInTransaction(async (transaction) => {
        await Customer.bulkCreate(validOrders, { transaction });
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

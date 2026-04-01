"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportProducts = exports.bulkImportCustomers = exports.bulkImportOrdersController = void 0;
const processingData_1 = require("../../service/processingData/processingData");
const customer_1 = require("../../models/customer/customer");
const product_1 = require("../../models/product/product");
const order_1 = require("../../models/order/order");
const transactionHelper_1 = require("../../utils/helper/transactionHelper");
const inventory_1 = require("../../models/warehouse/inventory");
const customerPayment_1 = require("../../models/customer/customerPayment");
const user_1 = require("../../models/user/user");
const appError_1 = require("../../utils/appError");
const getDebugInfo = (str) => {
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
const calculateOrderSortValue = (orderId) => {
    if (!orderId)
        return 0;
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
const bulkImportOrdersController = async (req, res, next) => {
    try {
        const ordersFromExcel = (0, processingData_1.parseOrderData)(req.file.buffer);
        const [customers, products, users] = await Promise.all([
            customer_1.Customer.findAll({ attributes: ["customerId", "customerName", "companyName", "cskh"] }),
            product_1.Product.findAll({ attributes: ["productId", "productName"] }),
            user_1.User.findAll({ attributes: ["userId", "fullName"] }), // Lấy danh sách user để map
        ]);
        const validOrders = [];
        const validInventories = [];
        const logs = { success: 0, failed: 0, errors: [] };
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
            const customer = customers.find((c) => (c.customerName || "").normalize("NFC").toLowerCase().trim() === normExcelCust);
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
                if (!customer)
                    errorMsg += ` Không tìm thấy KH: ${item._rawCustomerName}`;
                if (!product)
                    errorMsg += ` Không tìm thấy SP: ${item._rawProductName} (Flute: ${item.flute || "N/A"})`;
                logs.errors.push(errorMsg);
                continue;
            }
            //show err
            if (!customer || !product) {
                logs.failed++;
                let errorMsg = `Đơn ${item.orderId || "không ID"}:`;
                if (!customer)
                    errorMsg += ` Không tìm thấy KH (${item._rawCustomerName}).`;
                if (!product)
                    errorMsg += ` Không tìm thấy SP (${item._rawProductName}).`;
                logs.errors.push(errorMsg);
                continue;
            }
            // --- LOGIC MỚI: TÌM USERID DỰA TRÊN CSKH ---
            let targetUserId = null;
            const rawCskh = (customer.cskh || "").toString().toLowerCase().trim();
            const cleanString = (str) => (str || "").toString().trim().toLowerCase().normalize("NFC");
            const specialCskhMap = {
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
                }
                else {
                    userMatched = users.find((u) => cleanString(u.fullName).includes(searchName));
                }
                if (!userMatched) {
                    throw appError_1.AppError.BadRequest(`Không tìm thấy nhân viên phù hợp trong hệ thống cho CSKH: "${rawCskh}"`, "USER_CSKH_NOT_FOUND");
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
            await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                await order_1.Order.bulkCreate(validOrders, { transaction });
                await inventory_1.Inventory.bulkCreate(validInventories, { transaction });
            });
        }
        res.json({
            success: true,
            summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
            errors: logs.errors,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkImportOrdersController = bulkImportOrdersController;
const bulkImportCustomers = async (req, res, next) => {
    try {
        const customersFromExcel = (0, processingData_1.parseCustomerData)(req.file.buffer);
        const validCustomers = [];
        const validPayments = [];
        const logs = { success: 0, failed: 0, errors: [] };
        for (const item of customersFromExcel) {
            validCustomers.push({ ...item });
            validPayments.push({ ...item.payments, customerId: item.customerId });
            logs.success++;
        }
        if (validCustomers.length > 0) {
            await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                await customer_1.Customer.bulkCreate(validCustomers, { transaction });
                await customerPayment_1.CustomerPayment.bulkCreate(validPayments, { transaction });
            });
        }
        res.json({
            success: true,
            summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
            errors: logs.errors,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkImportCustomers = bulkImportCustomers;
const bulkImportProducts = async (req, res, next) => {
    try {
        const productsFromExcel = (0, processingData_1.parseProductData)(req.file.buffer);
        const validProducts = [];
        const logs = { success: 0, failed: 0, errors: [] };
        for (const item of productsFromExcel) {
            validProducts.push({ ...item });
            logs.success++;
        }
        if (validProducts.length > 0) {
            await (0, transactionHelper_1.runInTransaction)(async (transaction) => {
                await product_1.Product.bulkCreate(validProducts, { transaction });
            });
        }
        res.json({
            success: true,
            summary: `Thành công: ${logs.success}, Thất bại: ${logs.failed}`,
            errors: logs.errors,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkImportProducts = bulkImportProducts;
//# sourceMappingURL=processingDataController.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRepository = void 0;
const box_1 = require("../models/order/box");
const user_1 = require("../models/user/user");
const order_1 = require("../models/order/order");
const product_1 = require("../models/product/product");
const customer_1 = require("../models/customer/customer");
const orderImage_1 = require("../models/order/orderImage");
const customerPayment_1 = require("../models/customer/customerPayment");
const supplierPaperCodes_1 = require("../models/admin/paperClassifications/supplierPaperCodes");
const suppliers_1 = require("../models/admin/paperClassifications/suppliers");
const paperTypes_1 = require("../models/admin/paperClassifications/paperTypes");
const paperClassifications_1 = require("../models/admin/paperClassifications/paperClassifications");
const paperBasisWeights_1 = require("../models/admin/paperClassifications/paperBasisWeights");
exports.adminRepository = {
    //===============================ADMIN ORDER=====================================
    findOrderPending: async () => {
        return await order_1.Order.findAll({
            where: { status: "pending" },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: customer_1.Customer, attributes: ["customerName", "companyName"] },
                {
                    model: product_1.Product,
                    attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
                },
                { model: box_1.Box, as: "box" },
                { model: orderImage_1.OrderImage, attributes: ["imageUrl"] },
                { model: user_1.User, attributes: ["fullName"] },
            ],
            order: [["orderSortValue", "ASC"]],
        });
    },
    findByOrderId: async (orderId, transaction) => {
        return await order_1.Order.findOne({
            where: { orderId },
            attributes: [
                "orderId",
                "totalPrice",
                "status",
                "rejectReason",
                "customerId",
                "productId",
                "userId",
                "quantityCustomer",
                "orderSortValue",
            ],
            include: [
                {
                    model: customer_1.Customer,
                    attributes: ["customerId"],
                    include: [
                        { model: customerPayment_1.CustomerPayment, as: "payment", attributes: ["debtCurrent", "debtLimit"] },
                    ],
                },
                {
                    model: product_1.Product,
                    attributes: ["productId", "typeProduct"],
                },
                { model: box_1.Box, as: "box" },
                { model: user_1.User, attributes: ["fullName", "department"] },
            ],
            transaction,
        });
    },
    updateDebtCustomer: async (customer, newDebt) => {
        return await customer.update({ debtCurrent: newDebt });
    },
    //===============================ADMIN USER=====================================
    getAllUser: async () => {
        return await user_1.User.findAll({ attributes: { exclude: ["password", "createdAt", "updatedAt"] } });
    },
    getUserByPk: async (userId, transaction) => {
        return await user_1.User.findByPk(userId, {
            attributes: { exclude: ["password", "createdAt", "updatedAt"] },
            transaction,
        });
    },
    //===============================PAPER CODE=====================================
    getAllSupplierPaperCode: async () => {
        return await supplierPaperCodes_1.SupplierPaperCodes.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                {
                    model: suppliers_1.Suppliers,
                    attributes: ["supplierName", "supplierCode", "grade"],
                    where: { isActive: true },
                },
                { model: paperTypes_1.PaperTypes, attributes: ["paperName", "paperCode"] },
            ],
            order: [[suppliers_1.Suppliers, "supplierName", "ASC"]],
        });
    },
    getPaperClassification: async ({ page, pageSize }) => {
        return await paperClassifications_1.PaperClassifications.findAndCountAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            include: [
                { model: paperBasisWeights_1.PaperBasisWeights, attributes: ["basisWeight"], as: "basisWeight" },
                {
                    model: supplierPaperCodes_1.SupplierPaperCodes,
                    attributes: ["companyCode"],
                    as: "supplierPaper",
                    include: [
                        {
                            model: suppliers_1.Suppliers,
                            attributes: ["supplierName", "supplierCode", "grade"],
                            required: false,
                            where: { isActive: true },
                        },
                        { model: paperTypes_1.PaperTypes, attributes: ["paperName", "paperCode"] },
                    ],
                },
            ],
            offset: (page - 1) * pageSize,
            limit: pageSize,
            order: [
                [{ model: supplierPaperCodes_1.SupplierPaperCodes, as: "supplierPaper" }, suppliers_1.Suppliers, "supplierName", "ASC"],
                [{ model: paperBasisWeights_1.PaperBasisWeights, as: "basisWeight" }, "basisWeight", "ASC"],
            ],
        });
    },
};
//# sourceMappingURL=adminRepository.js.map
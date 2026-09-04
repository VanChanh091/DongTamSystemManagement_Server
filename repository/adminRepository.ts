import { Transaction } from "sequelize";
import { Box } from "../models/order/box";
import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { Customer } from "../models/customer/customer";
import { OrderImage } from "../models/order/orderImage";
import { CustomerPayment } from "../models/customer/customerPayment";
import { SupplierPaperCodes } from "../models/admin/paperClassifications/supplierPaperCodes";
import { Suppliers } from "../models/admin/paperClassifications/suppliers";
import { PaperTypes } from "../models/admin/paperClassifications/paperTypes";
import { PaperClassifications } from "../models/admin/paperClassifications/paperClassifications";
import { PaperBasisWeights } from "../models/admin/paperClassifications/paperBasisWeights";

export const adminRepository = {
  //===============================ADMIN ORDER=====================================

  findOrderPending: async () => {
    return await Order.findAll({
      where: { status: "pending" },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        { model: Customer, attributes: ["customerName", "companyName"] },
        {
          model: Product,
          attributes: ["typeProduct", "productName", "maKhuon", "productImage"],
        },
        { model: Box, as: "box" },
        { model: OrderImage, attributes: ["imageUrl"] },
        { model: User, attributes: ["fullName"] },
      ],
      order: [["orderSortValue", "ASC"]],
    });
  },

  findByOrderId: async (orderId: string, transaction: Transaction) => {
    return await Order.findOne({
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
          model: Customer,
          attributes: ["customerId"],
          include: [
            { model: CustomerPayment, as: "payment", attributes: ["debtCurrent", "debtLimit"] },
          ],
        },
        {
          model: Product,
          attributes: ["productId", "typeProduct"],
        },
        { model: Box, as: "box" },
        { model: User, attributes: ["fullName", "department"] },
      ],
      transaction,
    });
  },

  updateDebtCustomer: async (customer: any, newDebt: number) => {
    return await customer.update({ debtCurrent: newDebt });
  },

  //===============================ADMIN USER=====================================

  getAllUser: async () => {
    return await User.findAll({ attributes: { exclude: ["password", "createdAt", "updatedAt"] } });
  },

  getUserByPk: async (userId: number, transaction?: Transaction) => {
    return await User.findByPk(userId, {
      attributes: { exclude: ["password", "createdAt", "updatedAt"] },
      transaction,
    });
  },

  //===============================PAPER CODE=====================================
  getAllSupplierPaperCode: async () => {
    return await SupplierPaperCodes.findAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Suppliers,
          attributes: ["supplierName", "supplierCode", "grade"],
          where: { isActive: true },
        },
        { model: PaperTypes, attributes: ["paperName", "paperCode"] },
      ],
      order: [[Suppliers, "supplierName", "ASC"]],
    });
  },

  getPaperClassification: async ({ page, pageSize }: { page: number; pageSize: number }) => {
    return await PaperClassifications.findAndCountAll({
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        { model: PaperBasisWeights, attributes: ["basisWeight"], as: "basisWeight" },
        {
          model: SupplierPaperCodes,
          attributes: ["companyCode"],
          as: "supplierPaper",
          include: [
            {
              model: Suppliers,
              attributes: ["supplierName", "supplierCode", "grade"],
              required: false,
              where: { isActive: true },
            },
            { model: PaperTypes, attributes: ["paperName", "paperCode"] },
          ],
        },
      ],

      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [
        [{ model: SupplierPaperCodes, as: "supplierPaper" }, Suppliers, "supplierName", "ASC"],
        [{ model: PaperBasisWeights, as: "basisWeight" }, "basisWeight", "ASC"],
      ],
    });
  },
};

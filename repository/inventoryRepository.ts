import { FindOptions, Op, Sequelize, Transaction } from "sequelize";
import { Order } from "../models/order/order";
import { Customer } from "../models/customer/customer";
import { Product } from "../models/product/product";
import { Inventory } from "../models/warehouse/inventory/inventory";
import { LiquidationInventory } from "../models/warehouse/inventory/liquidationInventory";

export const inventoryRepository = {
  //====================================INVENTORY========================================
  getInventoryByPage: async ({
    page,
    pageSize,
    searching,
  }: {
    page?: number;
    pageSize?: number;
    searching?: any;
  }) => {
    const whereClause: any = {
      [Op.and]: [{ qtyInventory: { [Op.gt]: 0 } }],
      // [Op.and]: [],
    };

    if (searching && typeof searching === "object") {
      whereClause[Op.and].push(searching);
    }

    const options: any = {
      where: whereClause,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "QC_box",
            "flute",
            "day",
            "matE",
            "matB",
            "matC",
            "matE2",
            "songE",
            "songB",
            "songC",
            "songE2",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "lengthPaperManufacture",
            "paperSizeManufacture",
            "quantityCustomer",
            "dvt",
            "pricePaper",
            "totalPrice",
            "vat",
            "totalPriceVAT",
          ],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: Product, attributes: ["typeProduct", "productName"] },
          ],
        },
      ],
      order: [
        [Order, Customer, "customerName", "ASC"],
        [Order, "orderSortValue", "ASC"],
      ],
    };

    if (page !== undefined && pageSize !== undefined) {
      options.offset = (page - 1) * pageSize;
      options.limit = pageSize;
    }

    return await Inventory.findAndCountAll(options);
  },

  getTargetOrder: async (targetOrderId: string, transaction: Transaction) => {
    return await Order.findOne({
      where: { orderId: targetOrderId },
      attributes: [
        "orderId",
        "flute",
        "status",
        "pricePaper",
        "lengthPaperCustomer",
        "paperSizeCustomer",
        "quantityCustomer",
        "quantityManufacture",
      ],
      transaction,
    });
  },

  inventoryTotals: async (whereCondition?: any) => {
    const result = await Inventory.findAll({
      where: { ...whereCondition, valueInventory: { [Op.gt]: 0 } },
      attributes: [[Sequelize.fn("SUM", Sequelize.col("valueInventory")), "totalValueInventory"]],
      raw: true,
    });

    return result[0];
  },

  findInventoryByOrderId: async (orderId: string) => {
    return await Inventory.findOne({
      where: { orderId },
      attributes: ["qtyInventory", "totalQtyOutbound"],
    });
  },

  findByOrderId: async ({
    orderId,
    transaction,
    options = {},
  }: {
    orderId: string;
    transaction: Transaction;
    options?: FindOptions;
  }) => {
    return await Inventory.findOne({
      where: { orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
      ...options,
    });
  },

  INVENTORY_MEILI_OPTIONS: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }) => ({
    where: whereCondition,
    attributes: ["inventoryId", "qtyInventory"],
    include: [
      {
        model: Order,
        attributes: ["orderId"],
        include: [{ model: Customer, attributes: ["customerName"] }],
      },
    ],
    transaction,
  }),

  syncInventoryToMeili: async (orderId: string, transaction: Transaction) => {
    return await Inventory.findOne(
      inventoryRepository.INVENTORY_MEILI_OPTIONS({ whereCondition: { orderId }, transaction }),
    );
  },

  syncManyInventoryToMeili: async (orderId: string | string[], transaction: Transaction) => {
    return await Inventory.findAll(
      inventoryRepository.INVENTORY_MEILI_OPTIONS({
        whereCondition: { orderId: { [Op.in]: orderId } },
        transaction,
      }),
    );
  },

  //====================================LIQUIDATION INVENTORY========================================
  getLiquidationInvByPage: async ({
    page,
    pageSize,
    searching,
  }: {
    page?: number;
    pageSize?: number;
    searching?: any;
  }) => {
    const whereClause: any = {
      [Op.and]: [{ qtyRemaining: { [Op.gt]: 0 } }],
    };

    if (searching && typeof searching === "object") {
      whereClause[Op.and].push(searching);
    }

    const options: any = {
      where: whereClause,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Order,
          attributes: [
            "orderId",
            "dayReceiveOrder",
            "flute",
            "day",
            "matE",
            "matB",
            "matC",
            "matE2",
            "songE",
            "songB",
            "songC",
            "songE2",
            "lengthPaperCustomer",
            "paperSizeCustomer",
            "quantityCustomer",
            "dvt",
            "pricePaper",
          ],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: Product, attributes: ["productName"] },
          ],
        },
      ],
    };

    if (page !== undefined && pageSize !== undefined) {
      options.offset = (page - 1) * pageSize;
      options.limit = pageSize;
    }

    return await LiquidationInventory.findAndCountAll(options);
  },

  liquidationInvTotals: async () => {
    const result = await LiquidationInventory.findAll({
      where: { liquidationValue: { [Op.gt]: 0 } },
      attributes: [[Sequelize.fn("SUM", Sequelize.col("liquidationValue")), "totalValueInventory"]],
      raw: true,
    });

    return result[0];
  },
};

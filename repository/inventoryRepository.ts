import { User } from "../models/user/user";
import { Order } from "../models/order/order";
import { Product } from "../models/product/product";
import { Customer } from "../models/customer/customer";
import { FindOptions, Op, Sequelize, Transaction } from "sequelize";
import { Inventory } from "../models/warehouse/inventory/inventory";
import { LiquidationInventory } from "../models/warehouse/inventory/liquidationInventory";

export const inventoryRepository = {
  //====================================INVENTORY========================================
  buildInventoryOptions: ({
    page,
    pageSize,
    filter, //gt or lt
    searching,
    isExport = false,
  }: {
    page?: number;
    pageSize?: number;
    filter?: "gtZero" | "ltZero";
    searching?: any;
    isExport?: boolean;
  }): FindOptions => {
    const operator = isExport ? Op.ne : filter === "gtZero" ? Op.gt : Op.lt;
    const whereClause: any = {
      [Op.and]: [{ qtyInventory: { [operator]: 0 } }],
    };

    if (searching && typeof searching === "object") {
      whereClause[Op.and].push(searching);
    }

    const options: FindOptions = {
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
            { model: User, attributes: ["fullName"] },
          ],
        },
      ],
    };

    if (page && pageSize) {
      options.offset = (page - 1) * pageSize;
      options.limit = pageSize;

      options.order = [
        [Order, Customer, "customerName", "ASC"],
        [Order, "orderSortValue", "ASC"],
      ];
    }

    if (isExport) {
      options.raw = true;
      options.nest = true;
    }

    return options;
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
      where: { ...whereCondition, valueInventory: { [Op.ne]: 0 } },
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

  getQueryOptions: (transaction: Transaction, options: FindOptions = {}) => ({
    transaction,
    lock: transaction.LOCK.UPDATE,
    ...options,
  }),

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
      ...inventoryRepository.getQueryOptions(transaction, options),
    });
  },

  findByOrderIds: async ({
    orderIds,
    transaction,
    options = {},
  }: {
    orderIds: string[];
    transaction: Transaction;
    options?: FindOptions;
  }) => {
    return await Inventory.findAll({
      where: { orderId: { [Op.in]: orderIds } },
      ...inventoryRepository.getQueryOptions(transaction, options),
    });
  },

  buildMeiliInventoryOptions: ({
    whereCondition,
    transaction,
  }: {
    whereCondition?: any;
    transaction?: Transaction;
  }): FindOptions => {
    const queryOptions: FindOptions = {
      where: whereCondition,
      attributes: ["inventoryId", "qtyInventory"],
      include: [
        {
          model: Order,
          attributes: ["orderId"],
          include: [
            { model: Customer, attributes: ["customerName"] },
            { model: User, attributes: ["fullName"] },
          ],
        },
      ],
      transaction,
    };

    return queryOptions;
  },

  syncInventoryForMeili: async (orderId: string, transaction: Transaction) => {
    return await Inventory.findOne(
      inventoryRepository.buildMeiliInventoryOptions({ whereCondition: { orderId }, transaction }),
    );
  },

  syncAllInventoryToMeili: async (orderId: string | string[], transaction: Transaction) => {
    return await Inventory.findAll(
      inventoryRepository.buildMeiliInventoryOptions({
        whereCondition: { orderId: { [Op.in]: orderId } },
        transaction,
      }),
    );
  },

  syncAllInventoryForMeili: async () => {
    return await Inventory.findAll(inventoryRepository.buildMeiliInventoryOptions({}));
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

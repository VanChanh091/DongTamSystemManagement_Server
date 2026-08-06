export default function warehouseInventoryAssociations(models: any) {
  const {
    Order,
    PlanningPaper,
    PlanningBox,
    InboundHistory,
    OutboundHistory,
    OutboundDetail,
    DeliveryItem,
    Inventory,
    LiquidationInv,
    InventoryTransfers,
    InventoryLog,
  } = models;

  // INBOUND
  Order.hasMany(InboundHistory, { foreignKey: "orderId", onDelete: "CASCADE" });
  InboundHistory.belongsTo(Order, { foreignKey: "orderId" });

  PlanningPaper.hasMany(InboundHistory, {
    foreignKey: "planningId",
    as: "inbound",
    onDelete: "CASCADE",
  });
  InboundHistory.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  PlanningBox.hasMany(InboundHistory, {
    foreignKey: "planningBoxId",
    as: "inbound",
    onDelete: "CASCADE",
  });
  InboundHistory.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

  // OUTBOUND
  OutboundHistory.hasMany(OutboundDetail, {
    foreignKey: "outboundId",
    as: "detail",
    onDelete: "CASCADE",
  });
  OutboundDetail.belongsTo(OutboundHistory, { foreignKey: "outboundId" });

  Order.hasMany(OutboundDetail, { foreignKey: "orderId", onDelete: "CASCADE" });
  OutboundDetail.belongsTo(Order, { foreignKey: "orderId" });

  DeliveryItem.hasMany(OutboundDetail, { foreignKey: "deliveryItemId", onDelete: "SET NULL" });
  OutboundDetail.belongsTo(DeliveryItem, { foreignKey: "deliveryItemId" });

  // INVENTORY
  Order.hasOne(Inventory, { foreignKey: "orderId", onDelete: "CASCADE" });
  Inventory.belongsTo(Order, { foreignKey: "orderId" });

  Order.hasOne(LiquidationInv, { foreignKey: "orderId", onDelete: "CASCADE" });
  LiquidationInv.belongsTo(Order, { foreignKey: "orderId" });

  Inventory.hasOne(LiquidationInv, {
    foreignKey: "inventoryId",
    as: "liquidation",
    onDelete: "CASCADE",
  });
  LiquidationInv.belongsTo(Inventory, { foreignKey: "inventoryId" });

  Inventory.hasMany(InventoryTransfers, {
    foreignKey: "inventoryId",
    as: "invTransfers",
    onDelete: "CASCADE",
  });
  InventoryTransfers.belongsTo(Inventory, { foreignKey: "inventoryId" });

  // INVENTORY LOGS
  Inventory.hasMany(InventoryLog, {
    foreignKey: "inventoryId",
    as: "invLogs",
    onDelete: "CASCADE",
  });
  InventoryLog.belongsTo(Inventory, { foreignKey: "inventoryId" });

  Order.hasMany(InventoryLog, { foreignKey: "orderId", as: "invLogs", onDelete: "CASCADE" });
  InventoryLog.belongsTo(Order, { foreignKey: "orderId" });
}

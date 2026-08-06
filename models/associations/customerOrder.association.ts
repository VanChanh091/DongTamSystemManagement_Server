export default function customerOrderAssociations(models: any) {
  const {
    Customer,
    CustomerPayment,
    Order,
    OutboundHistory,
    PaymentReceipt,
    Product,
    Box,
    OrderImage,
    OrderApproved,
    User,
    PaymentAllocation,
  } = models;

  // CUSTOMER & PAYMENT
  Customer.hasOne(CustomerPayment, {
    foreignKey: "customerId",
    as: "payment",
    onDelete: "CASCADE",
  });
  CustomerPayment.belongsTo(Customer, { foreignKey: "customerId" });

  Customer.hasMany(Order, { foreignKey: "customerId", onDelete: "CASCADE" });
  Order.belongsTo(Customer, { foreignKey: "customerId" });

  Customer.hasMany(OutboundHistory, { foreignKey: "customerId", onDelete: "RESTRICT" });
  OutboundHistory.belongsTo(Customer, { foreignKey: "customerId" });

  Customer.hasMany(PaymentReceipt, { foreignKey: "customerId", onDelete: "RESTRICT" });
  PaymentReceipt.belongsTo(Customer, { foreignKey: "customerId" });

  // PRODUCT
  Product.hasMany(Order, { foreignKey: "productId", onDelete: "CASCADE" });
  Order.belongsTo(Product, { foreignKey: "productId" });

  // ORDER
  Order.hasOne(Box, { foreignKey: "orderId", as: "box", onDelete: "CASCADE" });
  Box.belongsTo(Order, { foreignKey: "orderId" });

  Order.hasOne(OrderImage, { foreignKey: "orderId", onDelete: "CASCADE" });
  OrderImage.belongsTo(Order, { foreignKey: "orderId" });

  Order.hasMany(OrderApproved, { foreignKey: "orderId", onDelete: "CASCADE" });
  OrderApproved.belongsTo(Order, { foreignKey: "orderId" });

  // USER
  User.hasMany(Order, { foreignKey: "userId" });
  Order.belongsTo(User, { foreignKey: "userId" });

  // PAYMENT & ALLOCATION
  PaymentReceipt.hasMany(PaymentAllocation, {
    foreignKey: "receiptId",
    as: "allocations",
    onDelete: "CASCADE",
  });
  PaymentAllocation.belongsTo(PaymentReceipt, { foreignKey: "receiptId", as: "receipt" });

  OutboundHistory.hasMany(PaymentAllocation, {
    foreignKey: "outboundId",
    as: "allocations",
    onDelete: "CASCADE",
  });
  PaymentAllocation.belongsTo(OutboundHistory, { foreignKey: "outboundId", as: "outbound" });
}

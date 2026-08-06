export default function deliveryOthersAssociations(models: any) {
  const {
    EmployeeBasicInfo,
    EmployeeCompanyInfo,
    PlanningPaper,
    DeliveryRequest,
    User,
    Order,
    DeliveryPlan,
    DeliveryItem,
    Vehicle,
  } = models;

  // EMPLOYEE
  EmployeeBasicInfo.hasOne(EmployeeCompanyInfo, {
    foreignKey: "employeeId",
    as: "companyInfo",
    onDelete: "CASCADE",
  });
  EmployeeCompanyInfo.belongsTo(EmployeeBasicInfo, { foreignKey: "employeeId", as: "basicInfo" });

  // DELIVERY
  PlanningPaper.hasMany(DeliveryRequest, { foreignKey: "planningId", onDelete: "CASCADE" });
  DeliveryRequest.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  User.hasOne(DeliveryRequest, { foreignKey: "userId", onDelete: "CASCADE" });
  DeliveryRequest.belongsTo(User, { foreignKey: "userId" });

  Order.hasMany(DeliveryRequest, { foreignKey: "orderId", onDelete: "CASCADE" });
  DeliveryRequest.belongsTo(Order, { foreignKey: "orderId" });

  DeliveryPlan.hasMany(DeliveryItem, { foreignKey: "deliveryId", onDelete: "CASCADE" });
  DeliveryItem.belongsTo(DeliveryPlan, { foreignKey: "deliveryId" });

  DeliveryRequest.hasOne(DeliveryItem, { foreignKey: "requestId", onDelete: "CASCADE" });
  DeliveryItem.belongsTo(DeliveryRequest, { foreignKey: "requestId" });

  Vehicle.hasOne(DeliveryItem, { foreignKey: "vehicleId", onDelete: "CASCADE" });
  DeliveryItem.belongsTo(Vehicle, { foreignKey: "vehicleId" });
}

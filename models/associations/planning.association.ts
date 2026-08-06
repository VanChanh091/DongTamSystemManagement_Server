export default function planningAssociations(models: any) {
  const {
    Order,
    PlanningPaper,
    PlanningBox,
    PlanningBoxTime,
    timeOverflowPlanning,
    ReportPlanningPaper,
    ReportPlanningBox,
  } = models;

  // PLANNING PAPER & BOX
  Order.hasMany(PlanningPaper, { foreignKey: "orderId" });
  PlanningPaper.belongsTo(Order, { foreignKey: "orderId" });

  Order.hasMany(PlanningBox, { foreignKey: "orderId" });
  PlanningBox.belongsTo(Order, { foreignKey: "orderId" });

  PlanningPaper.hasOne(PlanningBox, { foreignKey: "planningId", onDelete: "CASCADE" });
  PlanningBox.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  PlanningBox.hasMany(PlanningBoxTime, {
    foreignKey: "planningBoxId",
    as: "boxTimes",
    onDelete: "CASCADE",
  });
  PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

  PlanningBox.hasMany(PlanningBoxTime, {
    foreignKey: "planningBoxId",
    as: "allBoxTimes",
    onDelete: "CASCADE",
  });
  PlanningBoxTime.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

  // TIME OVERFLOW
  PlanningPaper.hasOne(timeOverflowPlanning, {
    foreignKey: "planningId",
    as: "timeOverFlow",
    onDelete: "CASCADE",
    constraints: false,
  });
  timeOverflowPlanning.belongsTo(PlanningPaper, { foreignKey: "planningId", constraints: false });

  PlanningBox.hasMany(timeOverflowPlanning, {
    foreignKey: "planningBoxId",
    as: "timeOverFlow",
    onDelete: "CASCADE",
    constraints: false,
  });
  timeOverflowPlanning.belongsTo(PlanningBox, { foreignKey: "planningBoxId", constraints: false });

  // REPORT
  PlanningPaper.hasMany(ReportPlanningPaper, {
    foreignKey: "planningId",
    as: "reportPaper",
    onDelete: "CASCADE",
  });
  ReportPlanningPaper.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  PlanningBox.hasMany(ReportPlanningBox, {
    foreignKey: "planningBoxId",
    as: "reportBox",
    onDelete: "CASCADE",
  });
  ReportPlanningBox.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });
}

export default function qcAssociations(models: any) {
  const {
    PlanningPaper,
    PlanningBox,
    PlanningBoxTime,
    QcSession,
    QcShift,
    QcSampleResult,
    InspectionRequest,
    InboundHistory,
    QcInspectionPaper,
    QcInspectionBox,
    User,
  } = models;

  // QC SESSION
  PlanningPaper.hasMany(QcSession, { foreignKey: "planningId", onDelete: "CASCADE" });
  QcSession.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  PlanningBox.hasOne(QcSession, { foreignKey: "planningBoxId", onDelete: "CASCADE" });
  QcSession.belongsTo(PlanningBox, { foreignKey: "planningBoxId" });

  QcSession.hasMany(QcSampleResult, {
    foreignKey: "qcSessionId",
    as: "samples",
    onDelete: "CASCADE",
  });
  QcSampleResult.belongsTo(QcSession, { foreignKey: "qcSessionId" });

  QcSession.hasMany(InboundHistory, {
    foreignKey: "qcSessionId",
    as: "inbound",
    onDelete: "CASCADE",
  });
  InboundHistory.belongsTo(QcSession, { foreignKey: "qcSessionId" });

  // QC SHIFT
  User.hasMany(QcShift, { foreignKey: "userId", onDelete: "CASCADE" });
  QcShift.belongsTo(User, { foreignKey: "userId" });

  // QC INSPECTION
  PlanningPaper.hasMany(QcInspectionPaper, {
    foreignKey: "planningId",
    as: "inspecPaper",
    onDelete: "CASCADE",
  });
  QcInspectionPaper.belongsTo(PlanningPaper, { foreignKey: "planningId" });

  PlanningBoxTime.hasMany(QcInspectionBox, {
    foreignKey: "boxTimeId",
    as: "inspecBox",
    onDelete: "CASCADE",
  });
  QcInspectionBox.belongsTo(PlanningBoxTime, { foreignKey: "boxTimeId" });

  User.hasMany(QcInspectionPaper, {
    foreignKey: "userId",
    as: "inspecPaper",
    onDelete: "set null",
  });
  QcInspectionPaper.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(QcInspectionBox, { foreignKey: "userId", as: "inspecBox", onDelete: "set null" });
  QcInspectionBox.belongsTo(User, { foreignKey: "userId" });

  // INSPECTION REQUEST
  PlanningPaper.hasMany(InspectionRequest, {
    foreignKey: "planningId",
    as: "inspecRequests",
    onDelete: "CASCADE",
  });
  InspectionRequest.belongsTo(PlanningPaper, { foreignKey: "planningId" });
}

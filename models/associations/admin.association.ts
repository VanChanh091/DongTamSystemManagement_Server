export default function adminAssociations(models: any) {
  const { Suppliers, PaperTypes, PaperBasisWeights, SupplierPaperCodes, PaperClassifications } =
    models;

  Suppliers.hasMany(SupplierPaperCodes, {
    foreignKey: "supplierId",
    as: "supplierPapers",
    onDelete: "RESTRICT",
  });
  SupplierPaperCodes.belongsTo(Suppliers, { foreignKey: "supplierId" });

  PaperTypes.hasMany(SupplierPaperCodes, {
    foreignKey: "paperTypeId",
    as: "supplierPapers",
    onDelete: "RESTRICT",
  });
  SupplierPaperCodes.belongsTo(PaperTypes, { foreignKey: "paperTypeId" });

  PaperBasisWeights.hasMany(PaperClassifications, {
    foreignKey: "basisWeightId",
    as: "classifications",
    onDelete: "RESTRICT",
  });
  PaperClassifications.belongsTo(PaperBasisWeights, {
    foreignKey: "basisWeightId",
    as: "basisWeight",
  });

  SupplierPaperCodes.hasMany(PaperClassifications, {
    foreignKey: "supplierPaperId",
    as: "classifications",
    onDelete: "CASCADE",
  });
  PaperClassifications.belongsTo(SupplierPaperCodes, {
    foreignKey: "supplierPaperId",
    as: "supplierPaper",
  });
}
